@echo off
chcp 65001 >nul
title 선이음-동향 국회 연결기 v0.3 - 정식 인증키
where node >nul 2>nul
if errorlevel 1 (
  echo [실행 불가] Node.js 18 이상이 필요합니다.
  echo 사용설명서의 "국회 연결 준비"를 확인해 주세요.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-with-key.ps1"
if errorlevel 1 pause
