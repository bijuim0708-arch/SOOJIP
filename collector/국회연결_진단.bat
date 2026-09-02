@echo off
chcp 65001 >nul
title 선이음-秀集 국회 API 연결 진단
where node >nul 2>nul
if errorlevel 1 (
  echo [실행 불가] Node.js 18 이상이 필요합니다.
  pause
  exit /b 1
)
echo 선이음-秀集 국회 API 연결 상태를 진단합니다.
echo 정식 인증키를 사용하지 않으며 sample 키로 연결 경로만 확인합니다.
echo.
node "%~dp0국회연결_진단.mjs"
echo.
pause
