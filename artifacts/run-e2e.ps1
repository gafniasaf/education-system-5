param(
    [string]$Project = 'edu'
)

$ErrorActionPreference = 'Stop'

Write-Host "Starting web service..."
docker compose -p $Project up -d web | Out-Null

$webName = "$Project-web-1"
$deadline = (Get-Date).AddMinutes(3)
Write-Host "Waiting for $webName to become healthy..."
while ($true) {
    try {
        $status = docker inspect $webName --format '{{.State.Health.Status}}' 2>$null
        if ($status -eq 'healthy') { Write-Host "Web is healthy"; break }
        if ($status) { Write-Host "Health: $status" }
    } catch {}
    Start-Sleep -Seconds 2
    if ((Get-Date) -gt $deadline) { Write-Error "Timeout waiting for $webName health"; exit 1 }
}

Write-Host "Running tests (full E2E suite)..."
docker compose -p $Project --profile tests up --abort-on-container-exit --exit-code-from tests tests
$code = $LASTEXITCODE

try {
    [console]::Beep(880,300)
    if ($code -ne 0) { [console]::Beep(440,800) } else { [console]::Beep(1320,300) }
} catch {}

Write-Host "E2E exit code: $code"
exit $code


