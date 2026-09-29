@echo off
title PixelPlace Server & Web Canvas
cd /d "%~dp0"
echo ========================================================
echo   PIXELPLACE SUNUCUSU BASLATILIYOR...
echo   Dunya Haritasi (World Map), Bot Arenasi (0ms), TR Canvas
echo ========================================================
start "" http://localhost:3000
node server.js
pause
