@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "PHP=D:\OSPanel\modules\PHP-8.4\php.exe"

if not exist "%PHP%" (
    where php >nul 2>nul
    if errorlevel 1 (
        echo ERROR: PHP not found. Enable PHP-8.4 in OpenServer or fix PHP path in this script.
        pause
        exit /b 1
    )
    set "PHP=php"
)

where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js not found. Download from https://nodejs.org/
    pause
    exit /b 1
)

echo ========================================
echo    Gwent Classic - Local Development
echo ========================================
echo.

echo [prep] Restoring frontend/.env to localhost mode...
if exist "%ROOT%frontend\.env.example" (
    copy /Y "%ROOT%frontend\.env.example" "%ROOT%frontend\.env" >nul
)

if not exist "%ROOT%frontend\node_modules" (
    echo [prep] node_modules not found - running npm install...
    cd /d "%ROOT%frontend"
    npm install
    cd /d "%ROOT%"
)

echo [1/3] Starting API server (127.0.0.1:8000)...
start "Gwent API" cmd /k "cd /d "%ROOT%" && "%PHP%" artisan serve --host=127.0.0.1 --port=8000"
ping -n 3 127.0.0.1 >nul

echo [2/3] Starting Reverb WebSocket (127.0.0.1:8080)...
start "Gwent Reverb" cmd /k "cd /d "%ROOT%" && "%PHP%" artisan reverb:start --host=127.0.0.1 --port=8080"
ping -n 2 127.0.0.1 >nul

echo [3/3] Starting Frontend (localhost:5173)...
start "Gwent Frontend" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

echo.
echo ========================================
echo    All servers started!
echo ========================================
echo.
echo   SPA (login/register):  http://localhost:5173
echo   Bot game:              http://localhost:8000/index.html
echo   API health:            http://localhost:8000/up
echo   WebSocket:             ws://localhost:8080
echo.
echo   LAN testing with two devices: run start-dev-lan.bat
echo.
pause
