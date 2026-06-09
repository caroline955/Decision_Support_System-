# ========================================================================
# start-dev.ps1 — Khởi động backend + frontend, mỗi service 1 cửa sổ riêng
# Chạy: .\start-dev.ps1
# Dừng: đóng 2 cửa sổ con
# ========================================================================
$ErrorActionPreference = "Continue"
$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

Write-Host ""
Write-Host "=== DS Chatbot — Dev Server ===" -ForegroundColor Cyan
Write-Host ""

# --- 1. Kiểm tra điều kiện ---
$pyExe = Join-Path $root "backend\.venv\Scripts\python.exe"
$nodeModules = Join-Path $root "frontend\node_modules"
$envFile = Join-Path $root "backend\.env"

if (-not (Test-Path $pyExe)) {
    Write-Host "✗ Chưa có Python venv tại backend\.venv" -ForegroundColor Red
    Write-Host "  Chạy: .\setup.ps1" -ForegroundColor Yellow
    exit 1
}
if (-not (Test-Path $nodeModules)) {
    Write-Host "✗ Chưa có node_modules tại frontend" -ForegroundColor Red
    Write-Host "  Chạy: .\setup.ps1" -ForegroundColor Yellow
    exit 1
}
if (-not (Test-Path $envFile)) {
    Write-Host "! Tạo backend\.env từ .env.example" -ForegroundColor Yellow
    Copy-Item "$root\backend\.env.example" $envFile
}

# --- 2. Giải phóng port 8000 và 5173 ---
Write-Host "→ Giải phóng port 8000 và 5173..." -ForegroundColor DarkGray
foreach ($port in 8000, 5173) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conns) {
            $procIds = $conns.OwningProcess | Sort-Object -Unique
            foreach ($procId in $procIds) {
                try {
                    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                    Write-Host "  killed PID $procId on port $port" -ForegroundColor DarkGray
                } catch {}
            }
        }
    } catch {}
}
Start-Sleep -Milliseconds 500

# --- 3. Build command để chạy ---
$bePath = Join-Path $root "backend"
$fePath = Join-Path $root "frontend"
$pyAbs = (Resolve-Path $pyExe).Path

# Backend command
$beCommand = @"
`$Host.UI.RawUI.WindowTitle = 'DS Chatbot - Backend (FastAPI)'
Set-Location '$bePath'
Write-Host '╔════════════════════════════════════╗' -ForegroundColor Cyan
Write-Host '║  Backend FastAPI · port 8000       ║' -ForegroundColor Cyan
Write-Host '║  Swagger: http://localhost:8000/docs' -ForegroundColor Cyan
Write-Host '╚════════════════════════════════════╝' -ForegroundColor Cyan
Write-Host ''
& '$pyAbs' -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
Write-Host ''
Write-Host 'Backend đã dừng. Nhấn Enter để đóng cửa sổ này...' -ForegroundColor Yellow
Read-Host
"@

# Frontend command
$feCommand = @"
`$Host.UI.RawUI.WindowTitle = 'DS Chatbot - Frontend (Vite)'
Set-Location '$fePath'
Write-Host '╔════════════════════════════════════╗' -ForegroundColor Green
Write-Host '║  Frontend Vite · port 5173         ║' -ForegroundColor Green
Write-Host '║  http://localhost:5173             ║' -ForegroundColor Green
Write-Host '╚════════════════════════════════════╝' -ForegroundColor Green
Write-Host ''
npm.cmd run dev
Write-Host ''
Write-Host 'Frontend đã dừng. Nhấn Enter để đóng cửa sổ này...' -ForegroundColor Yellow
Read-Host
"@

# --- 4. Mở 2 cửa sổ PowerShell ---
Write-Host "→ Mở Backend..." -ForegroundColor DarkGray
Start-Process powershell.exe -ArgumentList @(
    "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $beCommand
)

Start-Sleep -Seconds 1
Write-Host "→ Mở Frontend..." -ForegroundColor DarkGray
Start-Process powershell.exe -ArgumentList @(
    "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $feCommand
)

# --- 5. Đợi backend lên rồi mở browser ---
Write-Host ""
Write-Host "→ Chờ backend khởi động..." -ForegroundColor DarkGray
$maxWait = 30
$ok = $false
for ($i = 1; $i -le $maxWait; $i++) {
    try {
        $r = Invoke-WebRequest "http://127.0.0.1:8000/api/health" -UseBasicParsing -TimeoutSec 1
        if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
}

if ($ok) {
    Write-Host "✓ Backend OK" -ForegroundColor Green
} else {
    Write-Host "! Backend chưa lên sau $maxWait giây — kiểm tra cửa sổ Backend xem có lỗi" -ForegroundColor Yellow
}

Start-Sleep -Seconds 3
Write-Host "→ Mở trình duyệt..." -ForegroundColor DarkGray
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host " 2 cửa sổ con đang chạy: Backend + Frontend" -ForegroundColor Cyan
Write-Host " Đóng các cửa sổ đó để dừng server" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
