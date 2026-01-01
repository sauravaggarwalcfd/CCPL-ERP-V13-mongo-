@echo off
echo ========================================
echo    CCPL ERP - Starting Servers
echo ========================================
echo.

:: Get LAN IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do set LANIP=%%b
)

:: Start Backend (minimized)
start "CCPL-Backend" /min cmd /k "cd /d C:\Users\ABC\OneDrive\Desktop\CCPL-ERP-V13-mongo--main\backend && venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: Wait 3 seconds for backend to start
timeout /t 3 /nobreak >nul

:: Start Frontend (minimized)
start "CCPL-Frontend" /min cmd /k "cd /d C:\Users\ABC\OneDrive\Desktop\CCPL-ERP-V13-mongo--main\frontend && npm run dev"

echo.
echo ========================================
echo    Servers Started Successfully!
echo ========================================
echo.
echo LOCAL ACCESS (this computer):
echo   - Frontend: http://localhost:5173
echo   - Backend:  http://localhost:8000
echo.
echo LAN ACCESS (other devices on network):
echo   - Frontend: http://%LANIP%:5173
echo   - Backend:  http://%LANIP%:8000
echo.
echo ========================================
echo Use the LAN IP address to access from
echo any device on your network (phones,
echo tablets, other computers).
echo ========================================
echo.
echo To stop servers: Run stop-servers.bat
echo.
pause
