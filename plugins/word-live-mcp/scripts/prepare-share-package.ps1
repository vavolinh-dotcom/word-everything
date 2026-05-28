$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pluginRoot = Split-Path -Parent $scriptDir
$logsDir = Join-Path $pluginRoot "logs"
$runtimeDir = Join-Path $pluginRoot "runtime"
$stopScript = Join-Path $scriptDir "stop-word-helper.ps1"

Write-Output "Stopping helper before packaging..."
& $stopScript | Out-Host

New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

$pathsToRemove = @(
  (Join-Path $runtimeDir "word-helper.pid"),
  (Join-Path $runtimeDir "lifecycle-smoke-report.json"),
  (Join-Path $logsDir "word-helper.out.log"),
  (Join-Path $logsDir "word-helper.err.log"),
  (Join-Path $logsDir "word-helper.lifecycle.out.log"),
  (Join-Path $logsDir "word-helper.lifecycle.err.log")
)

foreach ($path in $pathsToRemove) {
  if (Test-Path $path) {
    Remove-Item -LiteralPath $path -Force -ErrorAction Stop
    Write-Output "Removed $path"
  }
}

Write-Output ""
Write-Output "Share package is clean."
Write-Output "Runtime and log files will be created automatically on the receiver's machine."
