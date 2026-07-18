@echo off
setlocal EnableExtensions

net session >nul 2>&1
if errorlevel 1 (
    echo ERROR: Run this script as Administrator.
    echo Right-click open-firewall-lan.bat -^> Run as administrator
    pause
    exit /b 1
)

echo ========================================
echo    Gwent Classic - Open LAN Firewall
echo ========================================
echo.

powershell -NoProfile -Command ^
  "$ports = @(5173, 8000, 8080); foreach ($p in $ports) { $name = \"Gwent LAN TCP $p\"; Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue; New-NetFirewallRule -DisplayName $name -Direction Inbound -LocalPort $p -Protocol TCP -Action Allow -Profile Any | Out-Null; Write-Host \"  Port rule: TCP $p inbound (all profiles)\" -ForegroundColor Green }; Get-NetFirewallRule -DisplayName 'Gwent LAN ICMP' -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue; New-NetFirewallRule -DisplayName 'Gwent LAN ICMP' -Direction Inbound -Protocol ICMPv4 -IcmpType 8 -Action Allow -Profile Any | Out-Null; Write-Host '  ICMP rule: echo request inbound (for ping tests)' -ForegroundColor Green"

echo.
echo Adding program rules for Node.js and PHP (dev servers)...
powershell -NoProfile -Command ^
  "$root = '%CD%'; $php = 'D:\OSPanel\modules\PHP-8.4\php.exe'; if (-not (Test-Path $php)) { $php = (Get-Command php -ErrorAction SilentlyContinue).Source }; $node = (Get-Command node -ErrorAction SilentlyContinue).Source; foreach ($pair in @(@('Gwent LAN Node.js', $node), @('Gwent LAN PHP', $php))) { $label = $pair[0]; $exe = $pair[1]; if (-not $exe) { Write-Host \"  Skip $label - executable not found\" -ForegroundColor Yellow; continue }; Get-NetFirewallRule -DisplayName $label -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue; New-NetFirewallRule -DisplayName $label -Direction Inbound -Program $exe -Action Allow -Profile Any | Out-Null; Write-Host \"  Program rule: $label -> $exe\" -ForegroundColor Green }"

echo.
echo Setting Wi-Fi to Private network profile...
powershell -NoProfile -Command ^
  "$profiles = Get-NetConnectionProfile | Where-Object { $_.NetworkCategory -eq 'Public' -and $_.InterfaceAlias -match 'Wi-Fi|WLAN' }; foreach ($p in $profiles) { Set-NetConnectionProfile -InterfaceIndex $p.InterfaceIndex -NetworkCategory Private; Write-Host ('  ' + $p.Name + ' -> Private') -ForegroundColor Green }; if (-not $profiles) { Write-Host '  Wi-Fi already Private or not Wi-Fi' }"

echo.
echo IMPORTANT:
echo   Host opening http://LAN_IP:5173 on THIS PC does NOT prove guest access.
echo   Test from the second laptop/phone in browser.
echo.
echo   If guest still cannot connect after this script:
echo   - On guest: ping LAN_IP (must reply)
echo   - Disable router "AP Isolation" / "Client Isolation"
echo   - Both devices must be on the same Wi-Fi (not Guest network)
echo.
pause
