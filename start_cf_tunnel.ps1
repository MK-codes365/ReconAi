$process = Start-Process -FilePath "e:\ReconAi\cloudflared.exe" -ArgumentList "tunnel --url http://localhost:4000" -RedirectStandardError "e:\ReconAi\cloudflare.log" -PassThru -NoNewWindow
Start-Sleep -Seconds 6
$log = Get-Content "e:\ReconAi\cloudflare.log" -Raw
$regex = "https://[a-zA-Z0-9-]+\.trycloudflare\.com"
if ($log -match $regex) {
  Write-Host "FOUND_URL: " $matches[0]
} else {
  Write-Host "Log output so far:"
  Write-Host $log
}
