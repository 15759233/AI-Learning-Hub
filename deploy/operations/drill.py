#!/usr/bin/env python3
"""仅在新建的内部网络、数据库和文件副本中恢复并演练新旧应用；不接受目标数据库地址。"""
import argparse
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import tempfile
import time

from backup import fingerprint_sql, private_json, run, verify_bundle


def image_id(image):
    # 必须是已拉取的不可变本地镜像 ID；不接受可移动标签。
    if not re.fullmatch(r'sha256:[0-9a-f]{64}', image):
        raise ValueError('演练必须使用经核验的完整镜像 ID')
    run(['docker', 'image', 'inspect', image], timeout=10)
    return image


def wait_database(container):
    for _ in range(60):
        result = subprocess.run(['docker', 'exec', container, 'psql', '-U', 'drill', '-d', 'drill', '-XAtc', 'SELECT 1'], capture_output=True, timeout=5)
        if result.returncode == 0 and result.stdout.strip() == b'1':
            return
        time.sleep(1)
    raise RuntimeError('隔离数据库未就绪')


def query(container, sql):
    return run(['docker', 'exec', '-i', container, 'psql', '-U', 'drill', '-d', 'drill', '-XqAt', '-v', 'ON_ERROR_STOP=1'], input=sql.encode(), timeout=120).decode().strip()


def validate_clone(container, manifest, after_migration=False):
    expected = [row for row in manifest['tables'] if not after_migration or row['table'] != '_prisma_migrations']
    actual = [json.loads(line) for line in query(container, fingerprint_sql([x['table'] for x in expected])).splitlines()]
    if actual != expected:
        raise RuntimeError('恢复库全表行数或摘要不一致')
    invalid = query(container, "SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated")
    primary = query(container, "SELECT count(*) FROM pg_constraint WHERE conrelid='public.users'::regclass AND contype='p'")
    if invalid != '0' or primary != '1':
        raise RuntimeError('恢复库约束不完整')
    counts = {x['table']: x['rows'] for x in actual}
    return {'tables': len(actual), 'rows': sum(counts.values()), 'allDigestsMatch': True, 'constraintsValid': True,
            'keyRecords': {name: counts.get(name) for name in ['users', 'community_posts', 'community_comments', 'files', 'video_assets', 'courses', 'course_versions']}}


def drill(config):
    bundle = Path(config['bundle']).resolve()
    manifests = list(bundle.glob('**/snapshot-*/manifest.json'))
    if len(manifests) != 1:
        raise ValueError('恢复包必须只有一个一致性清单')
    manifest = json.loads(manifests[0].read_text())
    dump = manifests[0].with_name('database.dump')
    media_root = manifest['mediaRoot']
    media = verify_bundle(bundle, manifest, '/' + str(dump.relative_to(bundle)), media_root)
    images = {key: image_id(config[key]) for key in ['postgres_image', 'candidate_image', 'previous_image', 'candidate_student_image', 'candidate_admin_image', 'previous_student_image', 'previous_admin_image']}
    env_file = bundle / str(config['config_env_path']).lstrip('/')
    if not env_file.is_file() or str(config['config_env_path']) not in [x['path'] for x in manifest['config']]:
        raise ValueError('必须使用本次备份中已校验的环境配置')
    credentials = Path(config['acceptance_credentials_file'])
    if credentials.stat().st_mode & 0o077:
        raise ValueError('验收凭据文件必须仅账号可读')
    identity = json.loads(credentials.read_text())
    if not all(identity.get(key) for key in ['studentIdentifier', 'studentPassword', 'adminIdentifier', 'adminPassword']):
        raise ValueError('缺少本次恢复库的既有验收账号')
    name = 'aihub-drill-' + secrets.token_hex(6)
    started = time.time()
    result = {'status': 'failed', 'sourceRelease': manifest['release'], 'snapshotAt': manifest['createdAt'], 'startedAt': started,
              'media': media, 'productionDatabaseTouched': False, 'images': images}
    directory = Path(tempfile.mkdtemp(prefix=name + '-', dir=config['workspace_parent']))
    try:
        os.chmod(directory, 0o700)
        secret = directory / 'pg-password'
        secret.write_text(secrets.token_urlsafe(40))
        secret.chmod(0o600)
        uploads = directory / 'uploads'
        shutil.copytree(bundle / media_root.lstrip('/'), uploads)
        # 仅对本次独立副本授予应用 UID；绝不对原存储卷操作。
        for root, folders, files in os.walk(uploads):
            os.chown(root, 1000, 1000)
            for file in files:
                os.chown(Path(root) / file, 1000, 1000)
        run(['docker', 'network', 'create', '--internal', '--label', 'aihub.drill=' + name, name])
        db = name + '-db'
        run(['docker', 'run', '-d', '--name', db, '--label', 'aihub.drill=' + name, '--network', name,
             '--memory', '2g', '--cpus', '2', '--pids-limit', '128', '--tmpfs', '/var/lib/postgresql/data:rw,size=1073741824',
             '--mount', f'type=bind,source={secret},target=/run/secrets/password,readonly',
             '-e', 'POSTGRES_USER=drill', '-e', 'POSTGRES_DB=drill', '-e', 'POSTGRES_PASSWORD_FILE=/run/secrets/password', images['postgres_image']])
        wait_database(db)
        with dump.open('rb') as source:
            completed = subprocess.run(['docker', 'exec', '-i', db, 'pg_restore', '-U', 'drill', '-d', 'drill', '--no-owner', '--no-acl', '--exit-on-error'], stdin=source, capture_output=True, timeout=1200)
            if completed.returncode:
                raise RuntimeError('隔离数据库恢复失败')
        result['database'] = validate_clone(db, manifest)
        # 原环境文件作为输入，连接地址最后覆盖到随机命名的隔离数据库。
        api_env = directory / 'api.env'
        api_env.write_text(env_file.read_text().rstrip() + '\n' + '\n'.join([
            'DATABASE_URL=postgresql://drill:' + secret.read_text() + '@' + db + ':5432/drill',
            'NODE_ENV=test', 'LOAD_DEMO_DATA=false', 'PORT=3000', 'STORAGE_DRIVER=local',
            'STORAGE_LOCAL_PATH=/workspace/server/var/uploads', 'OPS_STATE_DIRECTORY=/tmp/operations',
            'SMTP_HOST=', 'SMTP_FROM=', 'MEDIA_CLAMSCAN_PATH=', 'VIDEO_PROCESSING_ENABLED=false', 'COOKIE_SECURE=false',
            'CORS_ORIGINS=http://127.0.0.1:3000', 'TRUSTED_PROXY_CIDRS=',
        ]) + '\n')
        api_env.chmod(0o600)
        base = ['docker', 'run', '--label', 'aihub.drill=' + name, '--network', name, '--env-file', str(api_env),
                '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
                '--memory', '2g', '--cpus', '2', '--pids-limit', '128', '--tmpfs', '/tmp:rw,mode=1777,size=134217728',
                '--mount', f'type=bind,source={uploads},target=/workspace/server/var/uploads']
        # 只在已完整恢复的克隆库运行兼容迁移，不运行 Seed 或 bootstrap。
        run([*base, '--rm', images['candidate_image'], 'npx', 'prisma', 'migrate', 'deploy'], timeout=300)
        second = run([*base, '--rm', images['candidate_image'], 'npx', 'prisma', 'migrate', 'deploy'], timeout=300)
        if b'No pending migrations' not in second:
            raise RuntimeError('重复迁移没有得到无待执行项结论')
        result['migrationRepeatNoop'] = True
        result['afterMigrationPreservation'] = validate_clone(db, manifest, after_migration=True)
        result['applications'] = []
        verifier = Path(__file__).with_name('verify-http.mjs').read_text()
        for key in ['candidate_image', 'previous_image']:
            phase = key.split('_')[0]
            app = name + '-' + phase
            run([*base, '-d', '--name', app, '--network-alias', 'server', images[key]])
            frontends = []
            phase_containers = [app]
            for frontend in ['student', 'admin']:
                container = name + '-' + phase + '-' + frontend
                run(['docker', 'run', '-d', '--name', container, '--label', 'aihub.drill=' + name, '--network', name,
                     '--memory', '256m', '--cpus', '0.5', '--pids-limit', '64', images[phase + '_' + frontend + '_image']])
                phase_containers.append(container)
                frontends.append('http://' + container)
            payload = {'credentials': identity, 'previous': key == 'previous_image', 'frontends': frontends}
            # JS 与凭据仅经 stdin 进入隔离容器，不经命令行、环境转储或日志输出。
            code = 'const input = ' + json.dumps(payload) + ';\n' + verifier
            output = subprocess.run(['docker', 'exec', '-i', app, 'node', '--input-type=module'], input=code.encode(), capture_output=True, timeout=180)
            checks = json.loads(output.stdout)
            result['applications'].append({'image': images[key], 'checks': checks})
            if output.returncode or checks.get('passed') is not True:
                raise RuntimeError('应用恢复验证未通过，已保存完成的检查项')
            run(['docker', 'stop', '--time', '15', *phase_containers])
        result.update(status='passed', finishedAt=time.time(), durationSeconds=round(time.time() - started, 2),
                      rpoObservedSeconds=round(started - manifest['createdAt']), rtoObservedSeconds=round(time.time() - started),
                      scope='隔离库恢复、应用新旧版本读取；不代表整机灾难与校内正式 RPO/RTO 达标')
    except Exception as error:
        result['reason'] = str(error) if isinstance(error, (RuntimeError, ValueError)) else type(error).__name__
        raise
    finally:
        errors = []
        try:
            # 按本次随机标签发现资源，覆盖 docker run 超时但已创建成功的情况。
            containers = run(['docker', 'ps', '-aq', '--filter', 'label=aihub.drill=' + name], timeout=10).decode().split()
            for container in containers:
                try:
                    run(['docker', 'stop', '--time', '10', container], timeout=20)
                    run(['docker', 'rm', '-v', container], timeout=20)
                except Exception:
                    errors.append(container)
            networks = run(['docker', 'network', 'ls', '-q', '--filter', 'label=aihub.drill=' + name], timeout=10).decode().split()
            if not errors:
                for network in networks:
                    run(['docker', 'network', 'rm', network], timeout=10)
        except Exception:
            errors.append('资源清理未能确认')
        if not errors:
            shutil.rmtree(directory)
        result['finishedAt'] = time.time()
        result['durationSeconds'] = round(time.time() - started, 2)
        result['cleanup'] = {'remainingResources': errors, 'workspaceRetained': bool(errors)}
        if errors:
            result['status'] = 'failed'
        private_json(config['report'], result)
        if errors:
            raise RuntimeError('隔离资源未全部清理，已在报告记录')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(drill(json.loads(Path(args.config).read_text())), ensure_ascii=False))
    except Exception as error:
        print(json.dumps({'status': 'failed', 'reason': type(error).__name__}, ensure_ascii=False))
        raise SystemExit(1)
