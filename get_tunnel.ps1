$dest = "e:\ReconAi\cloudflared.exe"
if (!(Test-Path $dest) -or ((Get-Item $dest).Length -lt 20000000)) {
  Write-Host "Downloading cloudflared.exe from Cloudflare..."
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $client = New-Object System.Net.WebClient
  $client.DownloadFile("https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe", $dest)
}
Write-Host "Download complete. File size: " (Get-Item $dest).Length
