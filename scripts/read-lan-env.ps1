param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot
)

$envFile = Join-Path $ProjectRoot '.env'
$lanIp = $null
$reverbKey = $null

if (Test-Path $envFile) {
    Get-Content $envFile -Encoding UTF8 | ForEach-Object {
        if ($_ -match '^\s*LAN_IP\s*=\s*(.+?)\s*$') {
            $lanIp = $matches[1].Trim().Trim('"').Trim("'")
        }
        if ($_ -match '^\s*REVERB_APP_KEY\s*=\s*(.+?)\s*$') {
            $reverbKey = $matches[1].Trim().Trim('"').Trim("'")
        }
    }
}

if (-not $lanIp) {
    $lanIp = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.InterfaceAlias -match 'Wi-Fi|WLAN' -and
            $_.IPAddress -notlike '169.254.*' -and
            $_.IPAddress -notlike '127.*'
        } |
        Select-Object -First 1 -ErrorAction SilentlyContinue).IPAddress
}

if (-not $lanIp) {
    $lanIp = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -match '^(192\.168\.|10\.)' -and
            $_.PrefixOrigin -ne 'WellKnown'
        } |
        Select-Object -First 1 -ErrorAction SilentlyContinue).IPAddress
}

if ($lanIp) {
    Write-Output "IP=$lanIp"
}

if ($reverbKey) {
    Write-Output "KEY=$reverbKey"
}
