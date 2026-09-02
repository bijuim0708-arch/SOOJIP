@echo off
setlocal
chcp 65001 >nul
title SUNEUM SOOJIP Assembly Connector - Issued Key
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 18 or later is required.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-with-key.ps1"
if errorlevel 1 pause
