@echo off
setlocal EnableExtensions EnableDelayedExpansion

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
echo    Gwent Classic - LAN Mode
echo ========================================
echo.

rem --- Read LAN_IP and REVERB_APP_KEY (.env or auto-detect Wi-Fi IP) ---
set "LAN_IP="
set "REVERB_APP_KEY="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\read-lan-env.ps1" -ProjectRoot "%ROOT%"`) do (
    set "LINE=%%i"
    if /i "!LINE:~0,3!"=="IP=" set "LAN_IP=!LINE:~3!"
    if /i "!LINE:~0,4!"=="KEY=" set "REVERB_APP_KEY=!LINE:~4!"
)

if "%LAN_IP%"=="" (
    echo WARNING: Could not read LAN_IP from .env and auto-detect failed.
    echo Add LAN_IP=x.x.x.x to .env or check ipconfig for your Wi-Fi IPv4.
    echo.
    set /p "LAN_IP=Enter your LAN IP: "
)
if "%REVERB_APP_KEY%"=="" set "REVERB_APP_KEY=zgthm82wkjnosc0eegyb"

echo LAN IP: %LAN_IP%
echo.

rem --- Skip if all servers already running ---
powershell -NoProfile -Command ^
  "$ports = @(5173, 8000, 8080); $up = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $ports -contains $_.LocalPort }).LocalPort | Select-Object -Unique; if (($ports | Where-Object { $up -contains $_ }).Count -eq 3) { Write-Host '[OK] All 3 servers already running (ports 5173, 8000, 8080).' -ForegroundColor Green; Write-Host '     Do NOT run start-dev-lan.bat again - it will fail with Port already in use.' -ForegroundColor Yellow; Write-Host '     To restart: run stop-dev.bat first.' -ForegroundColor Yellow; exit 42 }" 
if errorlevel 42 goto :already_running

rem --- Warn if some ports busy ---
powershell -NoProfile -Command ^
  "$ports = @{5173='Frontend';8000='API';8080='Reverb'}; $busy = @(); foreach ($p in $ports.Keys) { if (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue) { $busy += \"$($ports[$p]) ($p)\" } }; if ($busy.Count -gt 0) { Write-Host ('[WARN] Already running: ' + ($busy -join ', ')) -ForegroundColor Yellow; Write-Host '       Run stop-dev.bat first to avoid duplicate processes.' -ForegroundColor Yellow }"

rem --- Write frontend/.env for LAN mode ---
echo [prep] Writing frontend/.env for LAN mode...
(
    echo VITE_REVERB_APP_KEY=%REVERB_APP_KEY%
    echo VITE_REVERB_HOST=%LAN_IP%
    echo VITE_REVERB_PORT=8080
    echo VITE_REVERB_SCHEME=http
    echo.
    echo VITE_DEV_API_TARGET=http://%LAN_IP%:8000
    echo VITE_DEV_HOST=0.0.0.0
) > "%ROOT%frontend\.env"

rem --- Keep .env.lan in sync for reference ---
copy /Y "%ROOT%frontend\.env" "%ROOT%frontend\.env.lan" >nul

rem --- Check node_modules ---
if not exist "%ROOT%frontend\node_modules" (
    echo [prep] node_modules not found - running npm install...
    cd /d "%ROOT%frontend"
    npm install
    cd /d "%ROOT%"
)

echo.
echo TIP: If guest gets ERR_ADDRESS_UNREACHABLE, run as Admin:
echo      open-firewall-lan.bat
echo      (Wi-Fi must be Private network, not Public)
echo.

echo [1/3] Starting API on 0.0.0.0:8000 ...
start "Gwent API LAN" cmd /k "cd /d "%ROOT%" && "%PHP%" artisan serve --host=0.0.0.0 --port=8000"
ping -n 3 127.0.0.1 >nul

echo [2/3] Starting Reverb WebSocket on 0.0.0.0:8080 ...
start "Gwent Reverb LAN" cmd /k "cd /d "%ROOT%" && "%PHP%" artisan reverb:start --host=0.0.0.0 --port=8080"
ping -n 2 127.0.0.1 >nul

echo [3/3] Starting Frontend on 0.0.0.0:5173 ...
start "Gwent Frontend LAN" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

echo.
echo ========================================
echo    LAN mode started!
echo ========================================
echo.
echo   -- This PC --
echo   SPA (login/game):  http://localhost:5173
echo   Bot game:          http://localhost:8000/index.html
echo.
echo   -- Other devices (same Wi-Fi/LAN) --
echo   SPA (login/game):  http://%LAN_IP%:5173
echo   Bot game:          http://%LAN_IP%:8000/index.html
echo.
echo   On second laptop/phone: just open the SPA link in browser.
echo   No scripts, Node.js or project install needed on guest device.
echo.
echo   API:               http://%LAN_IP%:8000
echo   WebSocket:         ws://%LAN_IP%:8080
echo.
echo   IMPORTANT: Windows Firewall must allow ports 5173, 8000, 8080
echo   (Or temporarily disable firewall for this network)
echo.
pause
exit /b 0

:already_running
echo.
echo   -- This PC --
echo   SPA:  http://localhost:5173
echo.
echo   -- Guest (second laptop) --
echo   SPA:  http://%LAN_IP%:5173
echo.
echo   Run check-lan.bat to verify. Run stop-dev.bat before restart.
echo.
pause
exit /b 0
