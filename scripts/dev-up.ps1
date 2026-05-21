$ErrorActionPreference = 'Stop'

Set-Location -LiteralPath (Resolve-Path (Join-Path $PSScriptRoot '..'))

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-TcpPort {
  param(
    [string]$HostName,
    [int]$Port
  )

  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $connect = $client.BeginConnect($HostName, $Port, $null, $null)
    $ready = $connect.AsyncWaitHandle.WaitOne(1000)
    if (-not $ready) {
      $client.Close()
      return $false
    }
    $client.EndConnect($connect)
    $client.Close()
    return $true
  } catch {
    return $false
  }
}

function Wait-ForPort {
  param(
    [string]$Name,
    [string]$HostName,
    [int]$Port,
    [int]$TimeoutSeconds = 90
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-TcpPort -HostName $HostName -Port $Port) {
      Write-Host "$Name is ready at ${HostName}:$Port" -ForegroundColor Green
      return
    }
    Start-Sleep -Seconds 2
  }

  throw "$Name did not become ready at ${HostName}:$Port within ${TimeoutSeconds}s"
}

if (-not (Test-Path -LiteralPath '.env')) {
  throw '.env not found. Create it from .env.example and fill local secrets before starting.'
}

Write-Step 'Starting local infrastructure containers'
docker compose up mysql redis minio -d

Write-Step 'Waiting for local infrastructure'
Wait-ForPort -Name 'MySQL' -HostName '127.0.0.1' -Port 13306
Wait-ForPort -Name 'Redis' -HostName '127.0.0.1' -Port 16379
Wait-ForPort -Name 'MinIO' -HostName '127.0.0.1' -Port 19000

Write-Step 'Synchronizing Prisma schema'
npx prisma db push

Write-Step 'Starting app, workers, watchdog, and Bull Board'
npm run dev
