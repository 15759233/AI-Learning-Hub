$ErrorActionPreference = 'SilentlyContinue'

$Root    = 'E:\AI-Learning-Hub-main'
$NodeExe = 'C:\Program Files\nodejs\node.exe'
$PgBin   = 'E:\pgsql\pgsql\bin'
$PgData  = 'E:\pgsql-data'
$Server  = Join-Path $Root 'server'
$State   = Join-Path $Root 'deploy\native\.state'

$BackendPidFile = Join-Path $State 'backend.pid'
$WebPidFile     = Join-Path $State 'web.pid'

New-Item -ItemType Directory -Force -Path $State | Out-Null

function Test-PidAlive([string]$pidFile) {
    if (-not (Test-Path -LiteralPath $pidFile)) { return $false }
    $procId = (Get-Content -LiteralPath $pidFile -Raw).Trim()
    if (-not $procId) { return $false }
    $proc = Get-Process -Id ([int]$procId) -ErrorAction SilentlyContinue
    return ($null -ne $proc)
}

Write-Host '=== AI 数智化学习平台 启动 ===' -ForegroundColor Cyan

# 1. PostgreSQL
$pgRunning = $false
if (Test-Path -LiteralPath (Join-Path $PgBin 'pg_isready.exe')) {
    & (Join-Path $PgBin 'pg_isready.exe') -h 127.0.0.1 -p 5432 *> $null
    $pgRunning = ($LASTEXITCODE -eq 0)
}
if (-not $pgRunning) {
    Write-Host '[1/3] 启动 PostgreSQL ...' -ForegroundColor Yellow
    $pgout = Join-Path $State 'pg-direct.log'
    $pgerr = Join-Path $State 'pg-direct.err.log'
    $pgp = Start-Process -FilePath (Join-Path $PgBin 'postgres.exe') -ArgumentList @('-D', $PgData, '-p', '5432', '-c', 'listen_addresses=127.0.0.1') -WindowStyle Hidden -PassThru -RedirectStandardOutput $pgout -RedirectStandardError $pgerr
    Start-Sleep -Seconds 4
    & (Join-Path $PgBin 'pg_isready.exe') -h 127.0.0.1 -p 5432 *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host '  PostgreSQL 启动失败,请检查 pg-direct.err.log' -ForegroundColor Red
    }
} else {
    Write-Host '[1/3] PostgreSQL 已在运行' -ForegroundColor Green
}

# 2. Backend (NestJS)
if (Test-PidAlive $BackendPidFile) {
    Write-Host '[2/3] 后端已在运行' -ForegroundColor Green
} else {
    Write-Host '[2/3] 启动后端 API ...' -ForegroundColor Yellow
    $env:PATH = "C:\Program Files\nodejs;" + $env:PATH
    $env:DATABASE_URL = 'postgresql://app_user:aihub-db-pw-2026@127.0.0.1:5432/ai_learning_hub'
    $bp = Start-Process -FilePath $NodeExe -ArgumentList 'dist/main.js' -WorkingDirectory $Server -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $State 'backend.log') -RedirectStandardError (Join-Path $State 'backend.err.log')
    Set-Content -LiteralPath $BackendPidFile -Value $bp.Id
    Start-Sleep -Seconds 8
}

# 3. Web static server (student + admin with /api proxy)
if (Test-PidAlive $WebPidFile) {
    Write-Host '[3/3] 前端服务已在运行' -ForegroundColor Green
} else {
    Write-Host '[3/3] 启动前端服务(学生端 8080 / 管理端 8081)...' -ForegroundColor Yellow
    $env:PATH = "C:\Program Files\nodejs;" + $env:PATH
    $wp = Start-Process -FilePath $NodeExe -ArgumentList (Join-Path $Root 'deploy\native\static-server.js') -WorkingDirectory $Root -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $State 'web.log') -RedirectStandardError (Join-Path $State 'web.err.log')
    Set-Content -LiteralPath $WebPidFile -Value $wp.Id
    Start-Sleep -Seconds 3
}

Write-Host ''
Write-Host '  学生端: http://127.0.0.1:8080' -ForegroundColor White
Write-Host '  管理端: http://127.0.0.1:8081' -ForegroundColor White
Write-Host '  API 文档: http://127.0.0.1:8080/api/docs' -ForegroundColor White
Write-Host '  管理员: admin@example.com / Admin123!' -ForegroundColor DarkGray
Write-Host ''

# 4. Open browser
Start-Process 'http://127.0.0.1:8080'

Write-Host '启动完成。停止服务请运行 stop-aihub.cmd' -ForegroundColor Green
