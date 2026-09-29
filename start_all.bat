@echo off
title Bilisim Sinifi ve Dunya Oyun Portali
color 0a
echo ========================================================
echo    BILISIM SINIFI VE DUNYA MULTIPLAYER OYUN PORTALI
echo ========================================================
echo.
echo [1/2] Oyun Sunucusu Baslatiliyor (Port 3000)...
start /b cmd /c "node server.js"

timeout /t 2 /nobreak >nul

echo [2/2] Dunyaya Acilma Tuneli Baslatiliyor (localtunnel)...
echo.
echo  - Siniftakiler Icin Link:  http://192.168.0.27:3000
echo  - Evdekiler / Dunya Link:  https://erencix-portal.loca.lt
echo.
echo ========================================================
echo  Kapatmak icin bu pencereyi kapatabilirsiniz.
echo ========================================================
npx localtunnel --port 3000 --subdomain erencix-portal
pause
