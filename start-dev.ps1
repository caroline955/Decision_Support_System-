# ========================================================================
# start-dev.ps1 — Khởi động backend (FastAPI) + frontend (Vite) song song
# Chạy: .\start-dev.ps1
# Dừng: nhấn Ctrl+C trong cửa sổ này (sẽ kill cả 2 child)
# ========================================================================
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

# --- 0. Kill bất kỳ process nào đang chiếm port 8000 / 5173 ---
foreach ($port in 8000, 5173) {
    $pids = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess `
            | Sort-Object -Unique
    foreach ($procId in $pids) {
        try { Stop-Process -Id $procId -Force -ErrorAction Stop } catch {}
    }
}

# --- 1. Sanity check ---
if (-not (Test-Path "$root\backend\.venv\Scripts\python.exe")) {
    Write-Host "Chưa có venv. Chạy .\setup.ps1 trước." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path "$root\frontend\node_modules")) {
    Write-Host "Chưa có node_modules. Chạy .\setup.ps1 trước." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path "$root\backend\.env")) {
    Copy-Item "$root\backend\.env.example" "$root\backend\.env"
}

# --- 2. Mở 2 cửa sổ Windows Terminal mới (1 cho BE, 1 cho FE) ---
$bePath = "$root\backend"
$fePath = "$root\frontend"

$beCmd = "cd `"$bePath`"; .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
$feCmd = "cd `"$fePath`"; npm run dev"

Write-Host ""
Write-Host "=== DS Chatbot — Dev Server ===" -ForegroundColor Cyan
Write-Host "Backend  : http://localhost:8000  (Swagger /docs)" -ForegroundColor Green
Write-Host "Frontend : http://localhost:5173" -ForegroundColor Green
Write-Host ""

# Ưu tiên Windows Terminal (wt.exe) chia 2 panel; fallback PowerShell windows.
$wt = Get-Command wt.exe -ErrorAction SilentlyContinue
if ($wt) {
    Start-Process wt.exe -ArgumentList @(
        "new-tab", "--title", "Backend",  "powershell", "-NoExit", "-Command", $beCmd, ";",
        "split-pane", "--title", "Frontend", "powershell", "-NoExit", "-Command", $feCmd
    )
    Write-Host "Đã mở Windows Terminal với 2 panel BE/FE." -ForegroundColor DarkGray
} else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $beCmd
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $feCmd
    Write-Host "Đã mở 2 cửa sổ PowerShell (BE/FE)." -ForegroundColor DarkGray
}

Start-Sleep -Seconds 4
Start-Process "http://localhost:5173"
Write-Host ""
Write-Host "Trình duyệt đã được mở. Đóng các cửa sổ con để dừng server." -ForegroundColor Cyan
