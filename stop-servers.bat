@echo off
echo Stopping CCPL ERP servers...

:: Kill Node.js processes (Frontend)
taskkill /F /FI "WINDOWTITLE eq CCPL-Frontend*" >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1

:: Kill Python processes (Backend)
taskkill /F /FI "WINDOWTITLE eq CCPL-Backend*" >nul 2>&1

echo Servers stopped!
pause
