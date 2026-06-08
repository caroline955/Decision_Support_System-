# ========================================================================
# setup.ps1 — Cài đặt 1 lần đầu cho cả backend + frontend + database
# Chạy: .\setup.ps1
# ========================================================================
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
Write-Host ""
Write-Host "=== DS Chatbot — Setup ===" -ForegroundColor Cyan
Write-Host ""

# --- 1. Backend venv + deps ---
Push-Location "$root\backend"
if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "[1/5] Tạo Python venv..." -ForegroundColor Yellow
    python -m venv .venv
} else {
    Write-Host "[1/5] Venv đã tồn tại, bỏ qua." -ForegroundColor DarkGray
}

Write-Host "[2/5] Cài thư viện Python..." -ForegroundColor Yellow
& .\.venv\Scripts\python.exe -m pip install --upgrade pip --quiet
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt --quiet

# --- 2. .env ---
if (-not (Test-Path ".env")) {
    Write-Host "[3/5] Tạo file .env từ .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "    => CHỈNH backend\.env nếu DB user/pass khác mặc định (XAMPP root/'')." -ForegroundColor Yellow
} else {
    Write-Host "[3/5] .env đã tồn tại, giữ nguyên." -ForegroundColor DarkGray
}

# --- 3. Re-hash demo passwords + ingest PDF ---
Write-Host "[4/5] Re-hash mật khẩu demo (về '123456')..." -ForegroundColor Yellow
& .\.venv\Scripts\python.exe -m scripts.fix_demo_passwords 2>&1 | Select-Object -Last 5

$pdf = Get-ChildItem -Path $root -Filter "*Practical Data Science*.pdf" -File -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pdf) {
    Write-Host "[5/5] Nạp PDF vào lessons (course DS101)..." -ForegroundColor Yellow
    & .\.venv\Scripts\python.exe -m scripts.ingest_pdf $pdf.FullName --course DS101 --replace 2>&1 | Select-Object -Last 5
} else {
    Write-Host "[5/5] Không tìm thấy PDF Practical Data Science, bỏ qua ingest." -ForegroundColor DarkGray
}
Pop-Location

# --- 4. Frontend deps ---
Push-Location "$root\frontend"
if (-not (Test-Path "node_modules")) {
    Write-Host "[+] Cài npm packages..." -ForegroundColor Yellow
    npm install --silent
} else {
    Write-Host "[+] node_modules đã tồn tại, bỏ qua." -ForegroundColor DarkGray
}
Pop-Location

Write-Host ""
Write-Host "=== Setup xong ===" -ForegroundColor Green
Write-Host "Bước tiếp theo: .\start-dev.ps1" -ForegroundColor Cyan
