@echo off
setlocal
chcp 65001 >nul
title SUNEUM SOOJIP Assembly API Diagnostic
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 18 or later is required.
  pause
  exit /b 1
)
where powershell >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Windows PowerShell is required.
  pause
  exit /b 1
)
echo SUNEUM SOOJIP Assembly API diagnostic
echo A valid issued Open Assembly API key is required.
echo The key is entered securely and is not saved to a file.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-issued-key-diagnostic.ps1"
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if "%EXIT_CODE%"=="0" (
  echo [OK] Diagnostic finished.
) else (
  echo [ERROR] Diagnostic failed. Copy this window output and send it to ChatGPT.
)
pause
exit /b %EXIT_CODE%
