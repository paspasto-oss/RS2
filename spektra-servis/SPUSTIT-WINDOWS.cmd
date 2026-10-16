@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nie je nainstalovany. Otvaram samostatnu HTML verziu.
  start "" "Spektra-Servis.html"
  pause
  exit /b
)
start "" "http://127.0.0.1:4173"
node tools\serve.cjs
pause
