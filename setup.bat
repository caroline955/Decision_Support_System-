@echo off
REM Wrapper bypass execution policy
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
pause
