# Aggiorna SUPABASE_SERVICE_ROLE_KEY nel .env del print-server.
# La chiave viene chiesta qui e scritta solo nel file locale, accanto a questo script.

$envPath = Join-Path $PSScriptRoot '.env'

Write-Host ''
Write-Host '  Aggiornamento chiave Supabase del print-server' -ForegroundColor Cyan
Write-Host '  ---------------------------------------------' -ForegroundColor DarkGray
Write-Host ''

if (-not (Test-Path $envPath)) {
    Write-Host "  ERRORE: non trovo il file .env in $PSScriptRoot" -ForegroundColor Red
    Write-Host '  Lo script deve stare nella stessa cartella del .env.' -ForegroundColor Red
    Write-Host ''
    return
}

Write-Host '  Incolla la secret key di Supabase (inizia con sb_secret_) e premi Invio.'
Write-Host '  Per incollare: tasto destro del mouse.' -ForegroundColor DarkGray
Write-Host ''

$key = (Read-Host '  Chiave').Trim()

if ($key -notmatch '^sb_secret_') {
    Write-Host ''
    Write-Host '  Non sembra una secret key: deve iniziare con sb_secret_.' -ForegroundColor Red
    Write-Host '  Nessuna modifica effettuata.' -ForegroundColor Red
    Write-Host ''
    return
}

# Copia di sicurezza prima di toccare il file
Copy-Item $envPath "$envPath.bak" -Force

$content = Get-Content $envPath
$updated = $content -replace '^SUPABASE_SERVICE_ROLE_KEY=.*', "SUPABASE_SERVICE_ROLE_KEY=$key"

if (($updated -join "`n") -eq ($content -join "`n")) {
    Write-Host ''
    Write-Host '  ATTENZIONE: nel .env non ho trovato una riga SUPABASE_SERVICE_ROLE_KEY.' -ForegroundColor Yellow
    Write-Host '  Niente e stato cambiato. Segnalalo e vediamo insieme.' -ForegroundColor Yellow
    Write-Host ''
    return
}

Set-Content -Path $envPath -Value $updated -Encoding utf8

Write-Host ''
Write-Host '  Fatto: chiave aggiornata.' -ForegroundColor Green
Write-Host '  Copia di sicurezza salvata in .env.bak' -ForegroundColor DarkGray
Write-Host ''
