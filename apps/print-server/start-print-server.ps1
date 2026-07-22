# Launcher del print-server per il PC di cassa.
# Rilancia il processo se crasha e tiene un log con rotazione.
# Registrato come attività pianificata all'accesso: vedi README-servizio.md

$ErrorActionPreference = 'Stop'

$AppDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir  = Join-Path $AppDir 'logs'
$LogFile = Join-Path $LogDir 'print-server.log'
$MaxLogBytes = 5MB

if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

function Write-Log($msg) {
    $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
    Add-Content -Path $LogFile -Value $line -Encoding utf8
}

function Rotate-Log {
    if ((Test-Path $LogFile) -and ((Get-Item $LogFile).Length -gt $MaxLogBytes)) {
        Move-Item $LogFile "$LogFile.1" -Force
    }
}

Set-Location $AppDir
Write-Log '=== launcher avviato ==='

# La rete puo' non essere pronta subito dopo il boot: attendi la stampante.
# NB: la Custom KUBE non risponde all'ICMP, quindi si testa la porta di stampa.
$printerIp   = '10.0.50.151'
$printerPort = 9100
for ($i = 1; $i -le 30; $i++) {
    $sock = New-Object System.Net.Sockets.TcpClient
    try {
        $ok = $sock.BeginConnect($printerIp, $printerPort, $null, $null).AsyncWaitHandle.WaitOne(1000)
        if ($ok -and $sock.Connected) {
            Write-Log "stampante $printerIp`:$printerPort raggiungibile"
            $sock.Close()
            break
        }
    } catch { }
    finally { $sock.Close() }
    if ($i -eq 30) { Write-Log "ATTENZIONE: $printerIp`:$printerPort non raggiungibile dopo 30 tentativi, avvio comunque" }
    Start-Sleep -Seconds 2
}

while ($true) {
    Rotate-Log
    Write-Log 'avvio node dist/index.js'

    & 'C:\Program Files\nodejs\node.exe' 'dist\index.js' *>> $LogFile

    $code = $LASTEXITCODE
    Write-Log "processo terminato (exit $code) - riavvio tra 10s"
    Start-Sleep -Seconds 10
}
