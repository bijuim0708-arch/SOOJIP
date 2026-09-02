@echo off
setlocal
chcp 65001 >nul
title SUNEUM SOOJIP Assembly Connector - Sample
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 18 or later is required.
  pause
  exit /b 1
)
set "SUNEUM_ASSEMBLY_API_KEY=sample"
echo Starting Assembly connector with the sample key.
echo The sample key may return limited results.
node "%~dp0server.mjs"
if errorlevel 1 pause
