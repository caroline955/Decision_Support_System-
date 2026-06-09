# ========================================================================
# setup.ps1 — Cài đặt 1 lần đầu cho cả backend + frontend + dữ liệu mẫu
# Chạy: .\setup.ps1
# ========================================================================
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

Write-Host ""
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      DS Chatbot · Setup              ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# --- 1. Kiểm tra Python ---
Write-Host "[1/7] Kiểm tra Python..." -ForegroundColor Yellow
try {
    $pyVer = python --version 2>&1
    Write-Host "  $pyVer" -ForegroundColor DarkGray
} catch {
    Write-Host "  ✗ Không tìm thấy 'python'. Cài Python 3.11+ từ python.org" -ForegroundColor Red
    exit 1
}

# --- 2. Backend: venv + deps ---
Push-Location "$root\backend"
$pyExe = ".\.venv\Scripts\python.exe"

if (-not (Test-Path $pyExe)) {
    Write-Host "[2/7] Tạo virtual env..." -ForegroundColor Yellow
    python -m venv .venv
} else {
    Write-Host "[2/7] Venv đã có, bỏ qua." -ForegroundColor DarkGray
}

Write-Host "[3/7] Cài thư viện Python (có thể mất 2-3 phút)..." -ForegroundColor Yellow
& $pyExe -m pip install --upgrade pip --quiet
& $pyExe -m pip install -r requirements.txt --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ pip install lỗi. Xem output ở trên." -ForegroundColor Red
    Pop-Location
    exit 1
}

# --- 3. .env ---
if (-not (Test-Path ".env")) {
    Write-Host "[4/7] Tạo .env từ .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "  ! Mở backend\.env để chỉnh DB_PASSWORD và GEMINI_API_KEY" -ForegroundColor Yellow
} else {
    Write-Host "[4/7] .env đã có, giữ nguyên." -ForegroundColor DarkGray
}

# --- 4. Re-hash demo passwords ---
Write-Host "[5/7] Re-hash mật khẩu demo về '123456'..." -ForegroundColor Yellow
& $pyExe -m scripts.fix_demo_passwords --all 2>&1 | Select-String "Re-hashed" | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }

# --- 5. Ingest dữ liệu (PDF nếu có, fallback sách thủ công) ---
Write-Host "[6/7] Nạp dữ liệu vào lessons..." -ForegroundColor Yellow

$pdfFiles = @()
$pdfFiles += Get-ChildItem -Path $root -Filter "sach.pdf" -File -ErrorAction SilentlyContinue
$pdfFiles += Get-ChildItem -Path $root -Filter "*Practical Data Science*.pdf" -File -ErrorAction SilentlyContinue
$pdfFiles += Get-ChildItem -Path $root -Filter "*.pdf" -File -ErrorAction SilentlyContinue

$ingested = $false
foreach ($pdf in $pdfFiles) {
    Write-Host "  thử với: $($pdf.Name)" -ForegroundColor DarkGray
    $result = & $pyExe -m scripts.ingest_pdf $pdf.FullName --course DS101 --replace 2>&1
    if ($LASTEXITCODE -eq 0 -and ($result -match "Ingested into")) {
        Write-Host "  ✓ Ingest từ $($pdf.Name)" -ForegroundColor Green
        $ingested = $true
        break
    }
}

if (-not $ingested) {
    Write-Host "  Không có PDF dùng được, dùng seed thủ công..." -ForegroundColor DarkGray
    & $pyExe -m scripts.seed_lessons 2>&1 | Select-String "Seeded" | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
}

# Thêm dữ liệu chat sessions/students nếu có script
if (Test-Path "scripts\seed_more_data.py") {
    Write-Host "  → seed thêm SV + chat data..." -ForegroundColor DarkGray
    & $pyExe -m scripts.seed_more_data 2>&1 | Select-String "\[\+\]|Done" | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
}

Pop-Location

# --- 6. Frontend: npm install ---
Push-Location "$root\frontend"
if (-not (Test-Path "node_modules")) {
    Write-Host "[7/7] Cài npm packages (có thể mất 1-2 phút)..." -ForegroundColor Yellow
    npm.cmd install --silent
} else {
    Write-Host "[7/7] node_modules đã có, bỏ qua." -ForegroundColor DarkGray
}
Pop-Location

Write-Host ""
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  Setup hoàn tất                      ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  Bước tiếp:  .\start-dev.ps1         ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Tài khoản demo (password '123456'):" -ForegroundColor Cyan
Write-Host "  admin@uni.edu.vn       (Admin)" -ForegroundColor DarkGray
Write-Host "  huong.tt@uni.edu.vn    (Giáo viên)" -ForegroundColor DarkGray
Write-Host "  an.ph@student.uni.edu.vn (Sinh viên)" -ForegroundColor DarkGray
