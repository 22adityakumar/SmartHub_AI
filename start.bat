@echo off
setlocal enabledelayedexpansion

REM ============================================================================
REM SmartHub AI - One-Click Industrial Platform Launcher
REM Air-Gapped Real-Time IoT Telemetry, Predictive Maintenance and Local RAG Assistant
REM ============================================================================

title SmartHub AI - Industrial Analytics and RAG Platform
cd /d "%~dp0"

REM Enforce fast offline startup (prevents HuggingFace Hub network delays)
set HF_HUB_OFFLINE=1
set TRANSFORMERS_OFFLINE=1
set PYTHONUNBUFFERED=1

echo ============================================================================
echo   SmartHub AI - Unified Smart Factory Logistics and Engineering AI Platform
echo ============================================================================
echo.

REM ----------------------------------------------------------------------------
REM 1. Verify Python Virtual Environment
REM ----------------------------------------------------------------------------
echo [1/3] Checking Python Environment...
if exist "venv\Scripts\python.exe" (
    set "PYTHON_EXE=venv\Scripts\python.exe"
    echo       [OK] Virtual environment detected: venv\Scripts\python.exe
) else (
    where python >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set "PYTHON_EXE=python"
        echo       [WARN] 'venv' not found. Using system Python in PATH.
    ) else (
        echo       [ERROR] Python is not installed or not in PATH!
        echo               Please install Python 3.10+ or set up the 'venv' directory.
        echo.
        pause
        exit /b 1
    )
)

REM ----------------------------------------------------------------------------
REM 2. Check and Launch Ollama Local LLM Daemon
REM ----------------------------------------------------------------------------
echo.
echo [2/3] Checking Ollama Local LLM Daemon (Air-Gapped Inference)...
powershell -NoProfile -Command "try { $r = (Invoke-WebRequest -Uri 'http://localhost:11434/api/tags' -TimeoutSec 1).StatusCode; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo       [OK] Ollama is already running on http://localhost:11434
) else (
    echo       [INFO] Ollama service not detected. Starting local daemon...
    where ollama >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        start "Ollama Engine" /min ollama serve
        ping 127.0.0.1 -n 3 >nul
        echo       [OK] Ollama daemon launched in background.
    ) else if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
        start "Ollama Engine" /min "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" serve
        ping 127.0.0.1 -n 3 >nul
        echo       [OK] Ollama daemon launched from LocalAppData.
    ) else (
        echo       [WARN] Ollama executable not located. 
        echo              RAG and chat features require Ollama running on port 11434.
    )
)

REM ----------------------------------------------------------------------------
REM 3. Schedule Automatic Browser Launch (after 2-second server warmup)
REM ----------------------------------------------------------------------------
echo.
echo [3/3] Preparing Web Interface...
start "" /B powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:8000/'"
echo       [OK] Default browser will open automatically at http://localhost:8000/

REM ----------------------------------------------------------------------------
REM 4. Start FastAPI Gateway / Uvicorn Server
REM ----------------------------------------------------------------------------
echo.
echo ============================================================================
echo   SYSTEM ONLINE:
echo   -- Web Dashboard:      http://localhost:8000/
echo   -- API Documentation:  http://localhost:8000/docs
echo   -- Health Check:       http://localhost:8000/api/health
echo.
echo   [INFO] Press [Ctrl + C] in this window to stop the server.
echo ============================================================================
echo.

"%PYTHON_EXE%" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] The server exited with error code: %ERRORLEVEL%
    echo Check the error messages above.
    pause
)
