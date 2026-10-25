@echo off
title GRIDSEC Operations Platform Server
cd /d "%~dp0"
echo ===================================================
echo   GRIDSEC - Power Grid Resilience Platform
echo   Starting Server on http://127.0.0.1:8000
echo ===================================================
echo.

:: Ensure project character asset directory exists and images are synchronized
if not exist "assets\images" mkdir "assets\images"
if exist "C:\Users\karti\.gemini\antigravity-ide\brain\d2622f27-4d61-406f-933f-22fef3b2aff9\.user_uploaded\media_1792763553226.png" (
    if not exist "assets\images\grid_operator.png" copy /y "C:\Users\karti\.gemini\antigravity-ide\brain\d2622f27-4d61-406f-933f-22fef3b2aff9\.user_uploaded\media_1792763553226.png" "assets\images\grid_operator.png" >nul
)
if exist "C:\Users\karti\.gemini\antigravity-ide\brain\d2622f27-4d61-406f-933f-22fef3b2aff9\.user_uploaded\media_1792763583932.png" (
    if not exist "assets\images\hacker.png" copy /y "C:\Users\karti\.gemini\antigravity-ide\brain\d2622f27-4d61-406f-933f-22fef3b2aff9\.user_uploaded\media_1792763583932.png" "assets\images\hacker.png" >nul
)

:: Detect Python or Py launcher
set PYTHON_CMD=python
where python >nul 2>nul
if %errorlevel% neq 0 (
    where py >nul 2>nul
    if %errorlevel% equ 0 (
        set PYTHON_CMD=py
    ) else (
        echo [ERROR] Python was not found on your system PATH.
        echo Please install Python 3.10+ from python.org and check "Add Python to PATH".
        echo.
        echo In the meantime, you can double-click 'app.html' to open the UI directly!
        echo.
        pause
        exit /b 1
    )
)

echo [INFO] Detected Python command: %PYTHON_CMD%

:: Check if uvicorn & fastapi are installed; if not, install minimal packages quickly
%PYTHON_CMD% -c "import uvicorn, fastapi" >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [INFO] Installing server dependencies...
    %PYTHON_CMD% -m pip install fastapi "uvicorn[standard]" sqlalchemy pydantic python-dotenv requests websockets
    echo.
)

%PYTHON_CMD% backend\run_server.py
if %errorlevel% neq 0 (
    echo.
    echo [NOTICE] Running fallback static server on port 8000...
    %PYTHON_CMD% -m http.server 8000
)

pause
