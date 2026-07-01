$listening = netstat -ano | Where-Object { $_ -match ":5173 " -and $_ -match "LISTENING" }

if ($listening) {
    Start-Process "http://localhost:5173/login"
    exit
}

Start-Process -FilePath "cmd.exe" -ArgumentList "/k D:\nova-metal-crm\nova-server.bat" -WindowStyle Minimized

$host.UI.RawUI.WindowTitle = "Nova Metal CRM"
$maxWait = 15
$ready = $false

for ($i = $maxWait; $i -ge 1; $i--) {
    $pct = [Math]::Min(95, [int](($maxWait - $i) * 100 / $maxWait) + 5)
    Write-Progress -Activity "Nova Metal CRM is starting..." -Status ("Please wait - " + $i + " seconds remaining") -PercentComplete $pct

    try {
        $req = [System.Net.HttpWebRequest]::Create("http://localhost:5173/")
        $req.AllowAutoRedirect = $false
        $req.Timeout = 2000
        $resp = $req.GetResponse()
        $code = [int]$resp.StatusCode
        $resp.Close()
        if ($code -eq 302) {
            $ready = $true
            break
        }
    } catch {}

    Start-Sleep -Seconds 1
}

Write-Progress -Activity "Nova Metal CRM is starting..." -Completed
Start-Process "http://localhost:5173/login"