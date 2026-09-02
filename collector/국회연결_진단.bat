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
echo Starting SUNEUM SOOJIP Assembly API diagnostic...
echo.
node "%~dp0assembly-diagnostic.mjs"
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if "%EXIT_CODE%"=="0" (
  echo [OK] Diagnostic finished.
) else (
  echo [ERROR] Diagnostic failed. Copy this window output and send it to ChatGPT.
)
pause
exit /b %EXIT_CODE%
