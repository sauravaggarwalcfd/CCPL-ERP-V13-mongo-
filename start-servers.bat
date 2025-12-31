@echo off
echo Starting CCPL ERP Backend and Frontend...

:: Start Backend (minimized)
start "CCPL-Backend" /min cmd /k "cd /d C:\Users\ABC\OneDrive\Desktop\CCPL-ERP-V13-mongo--main\backend && venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: Wait 3 seconds for backend to start
timeout /t 3 /nobreak >nul

:: Start Frontend (minimized)
start "CCPL-Frontend" /min cmd /k "cd /d C:\Users\ABC\OneDrive\Desktop\CCPL-ERP-V13-mongo--main\frontend && npm run dev"

echo.
echo Servers started in background!
echo - Backend: http://localhost:8000
echo - Frontend: http://localhost:5173
echo.
echo You can close this window. The servers will keep running.
echo To stop them, find "CCPL-Backend" and "CCPL-Frontend" in Task Manager.
pause
