"""
CCPL ERP Server Manager - System Tray Application
Runs frontend and backend in background without CMD windows
"""
import subprocess
import threading
import socket
import os
import sys
from pathlib import Path

try:
    import pystray
    from pystray import MenuItem as item
    from PIL import Image, ImageDraw
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "pystray", "Pillow", "-q"])
    import pystray
    from pystray import MenuItem as item
    from PIL import Image, ImageDraw

# Paths
BASE_DIR = Path(__file__).parent
BACKEND_DIR = BASE_DIR / "backend"
FRONTEND_DIR = BASE_DIR / "frontend"
VENV_PYTHON = BACKEND_DIR / "venv" / "Scripts" / "python.exe"
NPM_CMD = "npm"

# Process holders
backend_process = None
frontend_process = None
is_running = False


def create_icon(color="green"):
    """Create a simple colored circle icon"""
    size = 64
    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    if color == "green":
        fill = (34, 197, 94)  # Green - running
    elif color == "red":
        fill = (239, 68, 68)  # Red - stopped
    else:
        fill = (251, 191, 36)  # Yellow - starting

    # Draw circle
    draw.ellipse([4, 4, size-4, size-4], fill=fill, outline=(255, 255, 255))
    # Draw "C" for CCPL
    draw.text((20, 15), "C", fill=(255, 255, 255))

    return image


def kill_port(port):
    """Kill process running on specified port"""
    try:
        result = subprocess.run(
            f'netstat -ano | findstr :{port}',
            shell=True, capture_output=True, text=True
        )
        for line in result.stdout.strip().split('\n'):
            if f':{port}' in line and 'LISTENING' in line:
                parts = line.split()
                pid = parts[-1]
                if pid.isdigit():
                    subprocess.run(f'taskkill /F /PID {pid}', shell=True,
                                 capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW)
    except:
        pass


def kill_ports_range():
    """Kill all processes on ports 5173-5176 and 8000"""
    for port in [5173, 5174, 5175, 5176, 8000]:
        kill_port(port)


def is_port_in_use(port):
    """Check if port is in use"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0


def start_backend():
    """Start the FastAPI backend"""
    global backend_process
    try:
        backend_process = subprocess.Popen(
            [str(VENV_PYTHON), "-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
            cwd=str(BACKEND_DIR),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW
        )
        return True
    except Exception as e:
        print(f"Backend error: {e}")
        return False


def start_frontend():
    """Start the Vite frontend"""
    global frontend_process
    try:
        frontend_process = subprocess.Popen(
            ["cmd", "/c", "npm", "run", "dev"],
            cwd=str(FRONTEND_DIR),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW
        )
        return True
    except Exception as e:
        print(f"Frontend error: {e}")
        return False


def start_servers(icon=None):
    """Start both servers"""
    global is_running

    if is_running:
        return

    # Update icon to yellow (starting)
    if icon:
        icon.icon = create_icon("yellow")

    # Kill existing processes on ports
    kill_ports_range()

    # Wait a moment for ports to be freed
    import time
    time.sleep(1)

    # Start servers
    backend_ok = start_backend()
    time.sleep(2)  # Wait for backend to initialize
    frontend_ok = start_frontend()

    if backend_ok and frontend_ok:
        is_running = True
        if icon:
            icon.icon = create_icon("green")
            icon.notify("CCPL ERP Started", "Backend: localhost:8000\nFrontend: localhost:5173")


def stop_servers(icon=None):
    """Stop both servers"""
    global backend_process, frontend_process, is_running

    # Kill processes
    kill_ports_range()

    if backend_process:
        try:
            backend_process.terminate()
            backend_process.wait(timeout=5)
        except:
            pass
        backend_process = None

    if frontend_process:
        try:
            frontend_process.terminate()
            frontend_process.wait(timeout=5)
        except:
            pass
        frontend_process = None

    # Also kill any remaining node processes for this project
    try:
        subprocess.run('taskkill /F /IM node.exe 2>nul', shell=True,
                      creationflags=subprocess.CREATE_NO_WINDOW)
    except:
        pass

    is_running = False
    if icon:
        icon.icon = create_icon("red")
        icon.notify("CCPL ERP Stopped", "All servers have been stopped")


def restart_servers(icon):
    """Restart both servers"""
    stop_servers(icon)
    import time
    time.sleep(2)
    start_servers(icon)


def open_frontend(icon=None):
    """Open frontend in browser"""
    import webbrowser
    webbrowser.open("http://localhost:5173")


def open_backend(icon=None):
    """Open backend API docs in browser"""
    import webbrowser
    webbrowser.open("http://localhost:8000/docs")


def quit_app(icon):
    """Quit the application"""
    stop_servers(icon)
    icon.stop()


def get_status():
    """Get current status text"""
    if is_running:
        return "Status: Running"
    return "Status: Stopped"


def setup_menu(icon):
    """Setup the system tray menu"""
    icon.menu = pystray.Menu(
        item(lambda text: get_status(), None, enabled=False),
        item('─────────────', None, enabled=False),
        item('Start Servers', lambda: threading.Thread(target=start_servers, args=(icon,)).start()),
        item('Stop Servers', lambda: stop_servers(icon)),
        item('Restart Servers', lambda: threading.Thread(target=restart_servers, args=(icon,)).start()),
        item('─────────────', None, enabled=False),
        item('Open Frontend (5173)', open_frontend),
        item('Open API Docs (8000)', open_backend),
        item('─────────────', None, enabled=False),
        item('Quit', lambda: quit_app(icon))
    )


def main():
    """Main entry point"""
    # Create system tray icon
    icon = pystray.Icon(
        "CCPL_ERP",
        create_icon("red"),
        "CCPL ERP Server Manager"
    )

    setup_menu(icon)

    # Auto-start servers
    threading.Thread(target=start_servers, args=(icon,), daemon=True).start()

    # Run the icon
    icon.run()


if __name__ == "__main__":
    main()
