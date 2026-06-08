@echo off
REM Wrapper cho người dùng quen Command Prompt — gọi PowerShell script
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0start-dev.ps1"
