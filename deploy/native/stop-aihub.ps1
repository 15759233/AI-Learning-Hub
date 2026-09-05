$ErrorActionPreference = 'SilentlyContinue'

$Root   = 'E:\AI-Learning-Hub-main'
$PgBin  = 'E:\pgsql\pgsql\bin'
$PgData = 'E:\pgsql-data'
$State  = Join-Path $Root 'deploy\native\.state'

Write-Host '=== 停止 AI 数智化学习平台 ===' -ForegroundColor Cyan

foreach ($pidFile in @((Join-Path $State 'web.pid'), (Join-Path $State 'backend.pid'))) {
    if (Test-Path -LiteralPath $pidFile) {
        $procId = (Get-Content -LiteralPath $pidFile -Raw).Trim()
        if ($procId) {
            Stop-Process -Id ([int]$procId) -Force -ErrorAction SilentlyContinue
            Write-Host "已停止进程 $procId ($(Split-Path $pidFile -Leaf))" -ForegroundColor Yellow
        }
        Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
    }
}

if (Test-Path -LiteralPath (Join-Path $PgBin 'pg_ctl.exe')) {
    & (Join-Path $PgBin 'pg_ctl.exe') -D $PgData stop -m fast 2>&1 | Out-Null
    Write-Host '已停止 PostgreSQL' -ForegroundColor Yellow
}

Write-Host '已全部停止。' -ForegroundColor Green
