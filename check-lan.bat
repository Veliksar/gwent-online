@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"

echo ========================================
echo    Gwent Classic - LAN Diagnostics
echo ========================================
echo.

set "LAN_IP="
for /f "usebackq tokens=1,* delims==" %%a in ("%ROOT%.env") do (
    if /i "%%a"=="LAN_IP" set "LAN_IP=%%b"
)

echo [1] LAN_IP from .env: %LAN_IP%
echo.

echo [2] Current IPv4 addresses on this PC:
powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' } | Select-Object IPAddress, InterfaceAlias | Format-Table -AutoSize"
echo.

echo [3] Wi-Fi network profile (Public blocks LAN access!):
powershell -NoProfile -Command "Get-NetConnectionProfile | Select-Object Name, InterfaceAlias, NetworkCategory | Format-Table -AutoSize"
echo.

echo [4] Listening ports 5173, 8000, 8080:
powershell -NoProfile -Command "$ports = 5173,8000,8080; Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $ports -contains $_.LocalPort } | Select-Object LocalAddress, LocalPort | Sort-Object LocalPort | Format-Table -AutoSize; if (-not (Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $ports -contains $_.LocalPort })) { Write-Host '  NONE - run start-dev-lan.bat first!' -ForegroundColor Red }"
echo.

if not "%LAN_IP%"=="" (
    echo [5] HTTP test from THIS PC to %LAN_IP%:
    echo     NOTE: OK here does NOT mean guest can connect - only tests local routing.
    powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://%LAN_IP%:5173' -UseBasicParsing -TimeoutSec 5; Write-Host '  :5173 OK -' $r.StatusCode -ForegroundColor Green } catch { Write-Host '  :5173 FAIL -' $_.Exception.Message -ForegroundColor Red }; try { $r2 = Invoke-WebRequest -Uri 'http://%LAN_IP%:8000' -UseBasicParsing -TimeoutSec 5; Write-Host '  :8000 OK -' $r2.StatusCode -ForegroundColor Green } catch { Write-Host '  :8000 FAIL -' $_.Exception.Message -ForegroundColor Red }"
    echo.
)

echo [6] Gwent firewall rules:
powershell -NoProfile -Command "Get-NetFirewallRule -DisplayName 'Gwent LAN*' -ErrorAction SilentlyContinue | Select-Object DisplayName, Enabled, Profile | Format-Table -AutoSize; if (-not (Get-NetFirewallRule -DisplayName 'Gwent LAN*' -ErrorAction SilentlyContinue)) { Write-Host '  NONE - run open-firewall-lan.bat as Administrator!' -ForegroundColor Yellow }"
echo.

echo [7] Guest device checklist (run ON THE SECOND LAPTOP):
echo     ping %LAN_IP%
echo     browser: http://%LAN_IP%:8000
echo     browser: http://%LAN_IP%:5173
echo     If ping FAILS - router AP isolation or different Wi-Fi network.
echo     If ping OK but browser FAILS - re-run open-firewall-lan.bat as Admin on host.
echo.

echo ========================================
echo    What to fix if guest cannot connect
echo ========================================
echo.
echo  1. Run start-dev-lan.bat once (all 3 windows must stay open)
echo  2. If Port 5173 already in use - servers already running, use stop-dev.bat to restart
echo  3. Run open-firewall-lan.bat AS ADMINISTRATOR (once)
echo  4. Guest must use http://%LAN_IP%:5173 (same Wi-Fi, not guest/hotspot network)
echo  5. On guest, test first: http://%LAN_IP%:8000
echo.
pause
