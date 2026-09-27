# scripts/smoke.ps1: builds nothing; starts `next start` on :3010, prints "<code> <path> [grep:ok|grep:MISSING]", stops the server tree.
param(
  [string[]]$Paths = @('/'),
  [string]$Grep = ''
)
# `-File` passes "/,/en,..." as ONE string; split it into paths.
$Paths = @($Paths | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$p = Start-Process -FilePath 'cmd' -ArgumentList '/c pnpm start -p 3010' -PassThru -WindowStyle Hidden
try {
  Start-Sleep -Seconds 8
  foreach ($path in $Paths) {
    $code = curl.exe -s -o NUL -w '%{http_code}' "http://localhost:3010$path"
    $hit = ''
    if ($Grep) {
      $body = (curl.exe -s -L "http://localhost:3010$path") -join "`n"
      if ($body -match $Grep) { $hit = 'grep:ok' } else { $hit = 'grep:MISSING' }
    }
    Write-Output "$code $path $hit"
  }
} finally {
  taskkill /PID $p.Id /T /F | Out-Null
}
