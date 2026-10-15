param([int]$Port = 4173, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
$runtimeCommand = Get-Command node -ErrorAction SilentlyContinue
$runtimePath = if ($runtimeCommand) { $runtimeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $runtimePath)) { throw 'Please install Node.js LTS, then run this launcher again.' }
$localUrl = "http://127.0.0.1:$Port"
try { $response = Invoke-WebRequest -Uri "$localUrl/index.html" -UseBasicParsing -TimeoutSec 2 } catch { $response = $null }
if ($response -and $response.Content -match 'data-page="(particle|beam)"') {
 if (-not $NoBrowser) { Start-Process $localUrl }
 Write-Output "Ready: $localUrl"
 exit 0
}
if ($response) { throw "Port $Port is in use by another application. Run with -Port 4174." }
if (Test-Path -LiteralPath (Join-Path $taskRoot 'build.mjs')) {
 Push-Location -LiteralPath $taskRoot
 try { & $runtimePath 'build.mjs'; if ($LASTEXITCODE -ne 0) { throw 'Build failed.' } } finally { Pop-Location }
}
$webRoot = if (Test-Path -LiteralPath (Join-Path $taskRoot 'dist/index.html')) { Join-Path $taskRoot 'dist' } else { $taskRoot }
$serverPath = Join-Path $taskRoot 'serve.mjs'
$arguments = '"' + $serverPath + '" --directory "' + $webRoot + '" --port ' + $Port
$process = Start-Process -FilePath $runtimePath -ArgumentList $arguments -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskRoot '.local-server.log') -RedirectStandardError (Join-Path $taskRoot '.local-server-error.log')
$process.Id | Set-Content -LiteralPath (Join-Path $taskRoot '.local-server.pid')
for ($attempt = 0; $attempt -lt 30; $attempt++) {
 Start-Sleep -Milliseconds 200
 try { $response = Invoke-WebRequest -Uri "$localUrl/index.html" -UseBasicParsing -TimeoutSec 1; if ($response.StatusCode -eq 200) { break } } catch {}
}
if (-not $response -or $response.StatusCode -ne 200) { throw 'The local server could not start. See .local-server-error.log.' }
if (-not $NoBrowser) { Start-Process $localUrl }
Write-Output "Ready: $localUrl (PID $($process.Id))"
