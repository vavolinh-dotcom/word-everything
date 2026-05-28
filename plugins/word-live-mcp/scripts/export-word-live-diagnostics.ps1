$ErrorActionPreference = "Stop"

param(
  [switch]$IncludeFullLogs,
  [switch]$NoZip
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pluginRoot = Split-Path -Parent $scriptDir
$pluginsRoot = Split-Path -Parent $pluginRoot
$repoRoot = Split-Path -Parent $pluginsRoot

$ensureRuntimeScript = Join-Path $scriptDir "ensure-word-runtime.ps1"
$statusScript = Join-Path $scriptDir "status-word-helper.ps1"
$doctorScript = Join-Path $scriptDir "word-live-doctor.mjs"
$pluginManifestPath = Join-Path $pluginRoot ".codex-plugin\plugin.json"
$runtimeDir = Join-Path $pluginRoot "runtime"
$logsDir = Join-Path $pluginRoot "logs"
$diagnosticsRoot = Join-Path $runtimeDir "diagnostics"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$bundleDir = Join-Path $diagnosticsRoot "word-live-diagnostics-$timestamp"
$zipPath = "$bundleDir.zip"

function Write-Utf8File {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$Content
  )

  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Save-CommandOutput {
  param(
    [Parameter(Mandatory = $true)]
    [scriptblock]$Command,
    [Parameter(Mandatory = $true)]
    [string]$OutputPath
  )

  try {
    $text = (& $Command 2>&1 | Out-String).TrimEnd()
    if ([string]::IsNullOrWhiteSpace($text)) {
      $text = ""
    }
    Write-Utf8File -Path $OutputPath -Content $text
  } catch {
    Write-Utf8File -Path $OutputPath -Content $_ | Out-Null
  }
}

function Save-JsonFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    $Data
  )

  Write-Utf8File -Path $Path -Content ($Data | ConvertTo-Json -Depth 10)
}

function Copy-IfExists {
  param(
    [Parameter(Mandatory = $true)]
    [string]$SourcePath,
    [Parameter(Mandatory = $true)]
    [string]$DestinationPath
  )

  if (Test-Path $SourcePath) {
    Copy-Item -LiteralPath $SourcePath -Destination $DestinationPath -Force
    return $true
  }

  return $false
}

function Save-LogTail {
  param(
    [Parameter(Mandatory = $true)]
    [string]$SourcePath,
    [Parameter(Mandatory = $true)]
    [string]$DestinationPath,
    [int]$TailLines = 200
  )

  if (-not (Test-Path $SourcePath)) {
    return $false
  }

  $content = Get-Content -LiteralPath $SourcePath -Tail $TailLines -ErrorAction Stop | Out-String
  Write-Utf8File -Path $DestinationPath -Content $content.TrimEnd()
  return $true
}

& $ensureRuntimeScript | Out-Null
New-Item -ItemType Directory -Force -Path $diagnosticsRoot | Out-Null
New-Item -ItemType Directory -Force -Path $bundleDir | Out-Null

$pluginManifest = Get-Content -Raw $pluginManifestPath | ConvertFrom-Json

$nodeVersion = $null
try {
  $nodeVersion = (& node -v).Trim()
} catch {
  $nodeVersion = $null
}

$machineInfo = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  computerName = $env:COMPUTERNAME
  userName = $env:USERNAME
  powerShellVersion = $PSVersionTable.PSVersion.ToString()
  osCaption = (Get-CimInstance Win32_OperatingSystem).Caption
  osVersion = (Get-CimInstance Win32_OperatingSystem).Version
  nodeVersion = $nodeVersion
  wordRunning = @(Get-Process WINWORD -ErrorAction SilentlyContinue).Count -gt 0
}

$pluginInfo = [ordered]@{
  name = $pluginManifest.name
  version = $pluginManifest.version
  pluginRoot = $pluginRoot
  repoRoot = $repoRoot
  marketplacePath = Join-Path $repoRoot ".agents\plugins\marketplace.json"
  includeFullLogs = [bool]$IncludeFullLogs
}

Save-JsonFile -Path (Join-Path $bundleDir "machine-info.json") -Data $machineInfo
Save-JsonFile -Path (Join-Path $bundleDir "plugin-info.json") -Data $pluginInfo

Save-CommandOutput -Command { & $statusScript } -OutputPath (Join-Path $bundleDir "status.json")
Save-CommandOutput -Command { node $doctorScript } -OutputPath (Join-Path $bundleDir "doctor.json")

$smokeReportPath = Join-Path $runtimeDir "lifecycle-smoke-report.json"
$pidRecordPath = Join-Path $runtimeDir "word-helper.pid"
$marketplacePath = Join-Path $repoRoot ".agents\plugins\marketplace.json"

Copy-IfExists -SourcePath $smokeReportPath -DestinationPath (Join-Path $bundleDir "lifecycle-smoke-report.json") | Out-Null
Copy-IfExists -SourcePath $pidRecordPath -DestinationPath (Join-Path $bundleDir "word-helper.pid") | Out-Null
Copy-IfExists -SourcePath $pluginManifestPath -DestinationPath (Join-Path $bundleDir "plugin.json") | Out-Null
Copy-IfExists -SourcePath $marketplacePath -DestinationPath (Join-Path $bundleDir "marketplace.json") | Out-Null

$logFiles = @(
  "word-helper.out.log",
  "word-helper.err.log",
  "word-helper.lifecycle.out.log",
  "word-helper.lifecycle.err.log"
)

$savedFiles = New-Object System.Collections.Generic.List[string]

foreach ($logFile in $logFiles) {
  $sourcePath = Join-Path $logsDir $logFile

  if ($IncludeFullLogs) {
    if (Copy-IfExists -SourcePath $sourcePath -DestinationPath (Join-Path $bundleDir $logFile)) {
      $savedFiles.Add($logFile) | Out-Null
    }
  } else {
    $tailName = [System.IO.Path]::GetFileNameWithoutExtension($logFile) + ".tail.log"
    if (Save-LogTail -SourcePath $sourcePath -DestinationPath (Join-Path $bundleDir $tailName)) {
      $savedFiles.Add($tailName) | Out-Null
    }
  }
}

$readmeLines = @(
  "Word Live MCP diagnostics bundle",
  "",
  "Generated at: $($machineInfo.generatedAt)",
  "Plugin version: $($pluginInfo.version)",
  "Computer: $($machineInfo.computerName)",
  "User: $($machineInfo.userName)",
  "",
  "Included files:",
  "- machine-info.json",
  "- plugin-info.json",
  "- status.json",
  "- doctor.json"
)

if (Test-Path (Join-Path $bundleDir "lifecycle-smoke-report.json")) {
  $readmeLines += "- lifecycle-smoke-report.json"
}

if (Test-Path (Join-Path $bundleDir "word-helper.pid")) {
  $readmeLines += "- word-helper.pid"
}

foreach ($savedFile in $savedFiles) {
  $readmeLines += "- $savedFile"
}

$readmeLines += ""
$readmeLines += "Default behavior includes only log tails, not full logs."
$readmeLines += "Run with -IncludeFullLogs if a collaborator explicitly asks for complete logs."

Write-Utf8File -Path (Join-Path $bundleDir "README.txt") -Content ($readmeLines -join [Environment]::NewLine)

if (-not $NoZip) {
  if (Test-Path $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
  }
  Compress-Archive -Path (Join-Path $bundleDir "*") -DestinationPath $zipPath -Force
}

Write-Output "Diagnostics bundle created."
Write-Output "Directory: $bundleDir"
if (-not $NoZip) {
  Write-Output "Zip: $zipPath"
}
if ($IncludeFullLogs) {
  Write-Output "Mode: full logs included"
} else {
  Write-Output "Mode: log tails only"
}
