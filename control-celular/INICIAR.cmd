@echo off
rem Doble clic: arranca el relay del control de celular (8787) y el juego (Vite, 5174).
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias del control, solo la primera vez...
  call npm install
)
node iniciar.mjs
pause
