$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pluginRoot = Split-Path -Parent $scriptDir
$pluginsRoot = Split-Path -Parent $pluginRoot
$repoRoot = Split-Path -Parent $pluginsRoot

$manifestPath = Join-Path $pluginRoot ".codex-plugin\plugin.json"
$marketplacePath = Join-Path $repoRoot ".agents\plugins\marketplace.json"
$setupScriptPath = Join-Path $scriptDir "setup-word-live-mcp.ps1"
$statusScriptPath = Join-Path $scriptDir "status-word-helper.ps1"

if (-not (Test-Path $manifestPath)) {
  throw "Missing plugin manifest: $manifestPath"
}

$manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
$pluginName = $manifest.name
$pluginVersion = $manifest.version

$marketplaceFound = $false
$marketplaceContainsPlugin = $false
$marketplaceName = $null

if (Test-Path $marketplacePath) {
  $marketplaceFound = $true
  $marketplace = Get-Content -Raw $marketplacePath | ConvertFrom-Json
  $marketplaceName = $marketplace.name
  $marketplaceContainsPlugin = @($marketplace.plugins | Where-Object { $_.name -eq $pluginName }).Count -gt 0
}

Write-Output "Word Live MCP reinstall preflight"
Write-Output ""
Write-Output "Plugin name: $pluginName"
Write-Output "Plugin version: $pluginVersion"
Write-Output "Plugin root: $pluginRoot"
Write-Output "Marketplace path: $marketplacePath"
if ($marketplaceName) {
  Write-Output "Marketplace name: $marketplaceName"
}
Write-Output ""

if ($marketplaceFound) {
  Write-Output "[PASS] Marketplace file found."
} else {
  Write-Output "[FAIL] Marketplace file was not found."
}

if ($marketplaceContainsPlugin) {
  Write-Output "[PASS] Marketplace contains plugin entry '$pluginName'."
} elseif ($marketplaceFound) {
  Write-Output "[FAIL] Marketplace file exists, but it does not contain '$pluginName'."
}

if (Test-Path $setupScriptPath) {
  Write-Output "[PASS] Setup script is present."
} else {
  Write-Output "[FAIL] Setup script is missing."
}

if (Test-Path $statusScriptPath) {
  Write-Output "[PASS] Helper status script is present."
} else {
  Write-Output "[FAIL] Helper status script is missing."
}

Write-Output ""
Write-Output "Recommended reinstall steps:"
Write-Output "1. In the Codex app, reinstall or refresh '$pluginName' from the repository marketplace at .agents/plugins/marketplace.json."
Write-Output "2. Start a new Codex thread after reinstall so the refreshed plugin tools are picked up."
Write-Output "3. Run: powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\setup-word-live-mcp.ps1"
Write-Output "4. If needed, run: powershell -ExecutionPolicy Bypass -File .\plugins\word-live-mcp\scripts\status-word-helper.ps1"
Write-Output "5. Open Word, select text, and run one live edit test."
Write-Output ""
Write-Output "If Codex CLI-based plugin management is unavailable in your current environment, use the Codex app UI for the reinstall step."
