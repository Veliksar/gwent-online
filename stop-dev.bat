@echo off
setlocal EnableExtensions

echo ========================================
echo    Gwent Classic - Stop Dev Servers
echo ========================================
echo.

powershell -NoProfile -Command ^
  "$ports = @(5173, 8000, 8080); foreach ($port in $ports) { $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue; if (-not $conns) { Write-Host ('  Port ' + $port + ' - not in use') -ForegroundColor DarkGray; continue }; $procIds = $conns | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($procId in $procIds) { try { $proc = Get-Process -Id $procId -ErrorAction Stop; Stop-Process -Id $procId -Force; Write-Host ('  Stopped port ' + $port + ' - PID ' + $procId + ' (' + $proc.ProcessName + ')') -ForegroundColor Yellow } catch { Write-Host ('  Failed to stop PID ' + $procId + ' on port ' + $port) -ForegroundColor Red } } }"

echo.
echo Done. You can run start-dev-lan.bat again.
echo.
pause
