#!/usr/bin/env python3
"""
Unified startup script for Telemetry Rush
Creates venv, installs dependencies and starts all servers automatically
"""

import subprocess
import sys
import os
from pathlib import Path
import socket
import platform

def check_python():
    """Check if Python is available"""
    try:
        version = sys.version_info
        if version.major < 3 or (version.major == 3 and version.minor < 8):
            print("ERROR: Python 3.8+ required")
            return False
        print(f"[OK] Python {version.major}.{version.minor}.{version.micro}")
        return True
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def get_venv_python(venv_path):
    """Get the Python executable path in venv"""
    if platform.system() == "Windows":
        return venv_path / "Scripts" / "python.exe"
    else:
        return venv_path / "bin" / "python"

def create_venv():
    """Create virtual environment if it doesn't exist"""
    venv_path = Path(__file__).parent / "venv"
    
    if venv_path.exists():
        print(f"[OK] Virtual environment already exists at {venv_path}")
        return True
    
    print("\n" + "="*60)
    print("Creating Virtual Environment...")
    print("="*60)
    
    try:
        subprocess.run(
            [sys.executable, "-m", "venv", str(venv_path)],
            check=True
        )
        print(f"[OK] Virtual environment created at {venv_path}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"ERROR: Failed to create virtual environment: {e}")
        return False

def install_dependencies(venv_python):
    """Install all dependencies in venv"""
    print("\n" + "="*60)
    print("Installing Dependencies in Virtual Environment...")
    print("="*60)
    
    requirements_file = Path(__file__).parent / "requirements.txt"
    if not requirements_file.exists():
        print(f"ERROR: requirements.txt not found at {requirements_file}")
        return False
    
    try:
        print(f"Upgrading pip...")
        subprocess.run(
            [str(venv_python), "-m", "pip", "install", "--upgrade", "pip"],
            check=True,
            capture_output=True
        )
        
        print(f"Installing from {requirements_file}...")
        result = subprocess.run(
            [str(venv_python), "-m", "pip", "install", "-r", str(requirements_file)],
            check=True
        )
        print("[OK] Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"ERROR: Failed to install dependencies")
        return False

def check_port(port):
    """Check if a port is available"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(0.1)
    result = sock.connect_ex(('localhost', port))
    sock.close()
    return result != 0

def start_fastapi(venv_python):
    """Start FastAPI server (which auto-starts WebSocket servers)"""
    print("\n" + "="*60)
    print("Starting FastAPI Server...")
    print("="*60)
    print("FastAPI will automatically start all WebSocket servers")
    print("="*60 + "\n")
    
    # All backend code is in main.py (in the same directory as run.py)
    fastapi_dir = Path(__file__).parent
    main_py = fastapi_dir / "main.py"
    
    if not main_py.exists():
        print(f"ERROR: main.py not found in {fastapi_dir}")
        print(f"       All backend services are consolidated in main.py")
        return False
    
    try:
        # Start FastAPI using uvicorn via venv Python
        # Use uvicorn to properly run the FastAPI app
        subprocess.run(
            [str(venv_python), "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
            cwd=str(fastapi_dir)
        )
    except KeyboardInterrupt:
        print("\n\nShutting down...")
        return True
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def main():
    """Main entry point"""
    print("="*60)
    print("Telemetry Rush - Unified Startup (with venv)")
    print("="*60)
    print()
    
    # Check Python
    if not check_python():
        sys.exit(1)
    
    # Create venv
    if not create_venv():
        sys.exit(1)
    
    # Get venv Python path
    venv_path = Path(__file__).parent / "venv"
    venv_python = get_venv_python(venv_path)
    
    if not venv_python.exists():
        print(f"ERROR: venv Python not found at {venv_python}")
        sys.exit(1)
    
    # Check if dependencies are installed in venv
    try:
        result = subprocess.run(
            [str(venv_python), "-c", "import fastapi, uvicorn, websockets, pandas"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("[OK] All dependencies already installed in venv")
        else:
            print("Installing dependencies in venv...")
            if not install_dependencies(venv_python):
                print("\nFailed to install dependencies. Please run manually:")
                print(f"  {venv_python} -m pip install -r requirements.txt")
                sys.exit(1)
    except Exception as e:
        print(f"Checking dependencies: {e}")
        if not install_dependencies(venv_python):
            sys.exit(1)
    
    # Check ports
    ports_to_check = [8000, 8765, 8766, 8767]
    print("\nChecking ports...")
    for port in ports_to_check:
        if not check_port(port):
            print(f"WARNING: Port {port} is already in use")
        else:
            print(f"[OK] Port {port} is available")
    
    print("\n" + "="*60)
    print("Starting all servers...")
    print("="*60)
    print("FastAPI will automatically:")
    print("  1. Start Telemetry Server (port 8765)")
    print("  2. Start Endurance Server (port 8766)")
    print("  3. Start Leaderboard Server (port 8767)")
    print("  4. Start FastAPI Server (port 8000)")
    print()
    print("React frontend should connect automatically to:")
    print("  - ws://localhost:8000/ws/telemetry")
    print("  - ws://localhost:8000/ws/endurance")
    print("  - ws://localhost:8000/ws/leaderboard")
    print()
    print("Press Ctrl+C to stop all servers")
    print("="*60 + "\n")
    
    # Start FastAPI (which starts everything) using venv Python
    start_fastapi(venv_python)

if __name__ == "__main__":
    main()

