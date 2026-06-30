$listening = netstat -ano | Where-Object { $_ -match ":5173 " -and $_ -match "LISTENING" }

if ($listening) {
    Start-Process "http://localhost:5173"
    exit
}

Start-Process -FilePath "cmd.exe" -ArgumentList "/k D:\nova-metal-crm\nova-server.bat" -WindowStyle Minimized

$host.UI.RawUI.WindowTitle = "Nova Metal CRM - Starting"
$maxWait = 90
$ready = $false

for ($i = 1; $i -le $maxWait; $i++) {
    $pct = [Math]::Min(95, [int]($i * 100 / 40))
    Write-Progress -Activity "Nova Metal CRM is starting..." -Status ("Please wait - " + $i + " sec") -PercentComplete $pct
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:5173/login" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($r.Content.Length -gt 3000) {
            $ready = $true
            break
        }
    } catch {}
    Start-Sleep -Seconds 1
}

Write-Progress -Activity "Nova Metal CRM is starting..." -Completed
Start-Process "http://localhost:5173"
