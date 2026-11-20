$logOut = "scripts/server.log"
$logErr = "scripts/server-err.log"
if (Test-Path $logOut) { Remove-Item $logOut }
if (Test-Path $logErr) { Remove-Item $logErr }

$proc = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -PassThru -RedirectStandardOutput $logOut -RedirectStandardError $logErr
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2
        if ($res.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {}
}

if (-not $ready) {
    Write-Error "Server did not become ready in 30 seconds"
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "Server is live on http://localhost:3000. Running smoke tests..."
npm.cmd run smoke -- http://localhost:3000
$code = $LASTEXITCODE

if (Test-Path $logErr) {
    Get-Content $logErr | Select-Object -Last 20
}

# Clean up process tree (including any child node processes on port 3000)
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $netstat = netstat -ano | Select-String ":3000" | Select-String "$($_.Id)"
    $netstat -ne $null
} | Stop-Process -Force -ErrorAction SilentlyContinue

Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
exit $code
