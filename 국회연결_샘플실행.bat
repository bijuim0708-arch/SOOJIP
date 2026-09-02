@echo off
chcp 65001 >nul
title 선이음-동향 국회 연결기 v0.3 - 샘플
where node >nul 2>nul
if errorlevel 1 (
  echo [실행 불가] Node.js 18 이상이 필요합니다.
  echo 사용설명서의 "국회 연결 준비"를 확인해 주세요.
  pause
  exit /b 1
)
set "SUNEUM_ASSEMBLY_API_KEY=sample"
echo 샘플 키로 실제 열린국회정보 연결을 시작합니다.
echo 샘플 키는 응답 건수가 제한됩니다.
node "%~dp0server.mjs"
if errorlevel 1 pause
