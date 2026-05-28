$ErrorActionPreference = "Stop"

param(
  [switch]$StartHelper
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pluginRoot = Split-Path -Parent $scriptDir
$pluginsRoot = Split-Path -Parent $pluginRoot
$repoRoot = Split-Path -Parent $pluginsRoot

$ensureRuntimeScript = Join-Path $scriptDir "ensure-word-runtime.ps1"
$startHelperScript = Join-Path $scriptDir "start-word-helper.ps1"
$statusHelperScript = Join-Path $scriptDir "status-word-helper.ps1"

$marketplacePath = Join-Path $repoRoot ".agents\plugins\marketplace.json"
$pluginManifestPath = Join-Path $pluginRoot ".codex-plugin\plugin.json"
$mcpConfigPath = Join-Path $pluginRoot ".mcp.json"
$logsDir = Join-Path $pluginRoot "logs"
$runtimeDir = Join-Path $pluginRoot "runtime"

$script:HasFailure = $false
$script:HasWarning = $false

function Write-CheckResult {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Level,
    [Parameter(Mandatory = $true)]
    [string]$Message
  )

  switch ($Level) {
    "PASS" {
      Write-Output "[PASS] $Message"
    }
    "WARN" {
      $script:HasWarning = $true
      Write-Output "[WARN] $Message"
    }
    "FAIL" {
      $script:HasFailure = $true
      Write-Output "[FAIL] $Message"
    }
    default {
      Write-Output "[$Level] $Message"
    }
  }
}

Write-Output "Word Live MCP setup"
Write-Output "Plugin root: $pluginRoot"
Write-Output ""

& $ensureRuntimeScript | Out-Null
Write-CheckResult -Level PASS -Message "Created or verified local runtime directories."

if (Test-Path $pluginManifestPath) {
  Write-CheckResult -Level PASS -Message "Plugin manifest found at .codex-plugin/plugin.json."
} else {
  Write-CheckResult -Level FAIL -Message "Missing plugin manifest at .codex-plugin/plugin.json."
}

if (Test-Path $mcpConfigPath) {
  Write-CheckResult -Level PASS -Message "MCP config found at .mcp.json."
} else {
  Write-CheckResult -Level FAIL -Message "Missing MCP config at .mcp.json."
}

if (Test-Path $marketplacePath) {
  Write-CheckResult -Level PASS -Message "Repository marketplace file found at .agents/plugins/marketplace.json."
} else {
  Write-CheckResult -Level WARN -Message "Repository marketplace file not found. Install the plugin from the correct shared repository."
}

try {
  $nodeVersion = (& node -v).Trim()
  if ([string]::IsNullOrWhiteSpace($nodeVersion)) {
    Write-CheckResult -Level FAIL -Message "Node.js is installed but did not return a version."
  } else {
    Write-CheckResult -Level PASS -Message "Node.js is available: $nodeVersion"
  }
} catch {
  Write-CheckResult -Level FAIL -Message "Node.js is not available to PowerShell. Install Node.js and make sure 'node' is on PATH."
}

$wordComType = [type]::GetTypeFromProgID("Word.Application")
if ($null -ne $wordComType) {
  Write-CheckResult -Level PASS -Message "Microsoft Word COM registration is available."
} else {
  Write-CheckResult -Level FAIL -Message "Microsoft Word desktop COM registration was not found. Install desktop Microsoft Word on this machine."
}

$wordRunning = @(Get-Process WINWORD -ErrorAction SilentlyContinue).Count -gt 0
if ($wordRunning) {
  Write-CheckResult -Level PASS -Message "Microsoft Word is currently running in this desktop session."
} else {
  Write-CheckResult -Level WARN -Message "Microsoft Word is not currently running. Open Word before doing a live edit."
}

if (Test-Path $logsDir) {
  Write-CheckResult -Level PASS -Message "Logs directory is ready: $logsDir"
} else {
  Write-CheckResult -Level FAIL -Message "Logs directory could not be prepared."
}

if (Test-Path $runtimeDir) {
  Write-CheckResult -Level PASS -Message "Runtime directory is ready: $runtimeDir"
} else {
  Write-CheckResult -Level FAIL -Message "Runtime directory could not be prepared."
}

if ($StartHelper) {
  Write-Output ""
  Write-Output "Starting helper..."
  & $startHelperScript | Out-Host
  Write-Output ""
  Write-Output "Current helper status:"
  & $statusHelperScript | Out-Host
} else {
  Write-Output ""
  Write-Output "Helper start was skipped."
}

Write-Output ""
Write-Output "Next steps:"
Write-Output "1. Install the plugin in Codex from .agents/plugins/marketplace.json if you have not done that yet."
Write-Output "2. Open Microsoft Word and a test document."
if ($StartHelper) {
  Write-Output "3. If helper status is not ready, run node .\plugins\word-live-mcp\scripts\word-live-doctor.mjs"
} else {
  Write-Output "3. Start the helper: powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\start-word-helper.ps1"
  Write-Output "4. Confirm helper status: powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\status-word-helper.ps1"
}
Write-Output "5. Select text in Word and ask Codex to edit it."

Write-Output ""
if ($script:HasFailure) {
  Write-Output "Setup completed with failures. See the FAIL items above before attempting live edits."
  exit 1
}

if ($script:HasWarning) {
  Write-Output "Setup completed with warnings. You can continue, but review the WARN items above."
  exit 0
}

Write-Output "Setup completed successfully."
