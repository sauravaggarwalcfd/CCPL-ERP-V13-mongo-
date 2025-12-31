Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get script directory
strPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
backendPath = strPath & "\backend"
frontendPath = strPath & "\frontend"

' Kill existing processes on ports (silently)
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do taskkill /F /PID %a", 0, True
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -ano ^| findstr :5174 ^| findstr LISTENING') do taskkill /F /PID %a", 0, True
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -ano ^| findstr :5175 ^| findstr LISTENING') do taskkill /F /PID %a", 0, True
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -ano ^| findstr :5176 ^| findstr LISTENING') do taskkill /F /PID %a", 0, True
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do taskkill /F /PID %a", 0, True

' Wait 2 seconds
WScript.Sleep 2000

' Start Backend (hidden, no window)
WshShell.Run "cmd /c cd /d """ & backendPath & """ && venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000", 0, False

' Wait 3 seconds for backend
WScript.Sleep 3000

' Start Frontend (hidden, no window)
WshShell.Run "cmd /c cd /d """ & frontendPath & """ && npm run dev", 0, False

WScript.Sleep 1000

' Open browser
WshShell.Run "http://localhost:5173", 1, False
