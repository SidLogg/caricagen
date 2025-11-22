@echo off
echo Iniciando Caricagen AI...
cd /d "%~dp0"
start http://localhost:3000
echo Aguarde enquanto o servidor inicia...
npm run dev
pause
