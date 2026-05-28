param(
  [string]$RepoName = "word-everything",
  [ValidateSet("public", "private")]
  [string]$Visibility = "public"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Ensure-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

Ensure-Command git
Ensure-Command gh

try {
  gh auth status | Out-Null
} catch {
  throw "GitHub CLI is not logged in. Run 'gh auth login' first, then rerun this script."
}

Push-Location $repoRoot
try {
  if (-not (Test-Path (Join-Path $repoRoot ".git"))) {
    git init | Out-Host
  }

  git add . | Out-Host

  $hasHead = $true
  try {
    git rev-parse --verify HEAD | Out-Null
  } catch {
    $hasHead = $false
  }

  if ($hasHead) {
    $hasChanges = (git status --short).Trim()
    if (-not [string]::IsNullOrWhiteSpace($hasChanges)) {
      git commit -m "Update shareable Word Live MCP release" | Out-Host
    } else {
      Write-Output "No new git changes to commit."
    }
  } else {
    git commit -m "Initial shareable Word Live MCP release" | Out-Host
  }

  $origin = ""
  try {
    $origin = (git remote get-url origin).Trim()
  } catch {
    $origin = ""
  }

  if ([string]::IsNullOrWhiteSpace($origin)) {
    gh repo create $RepoName --$Visibility --source . --remote origin --push | Out-Host
  } else {
    git push -u origin HEAD | Out-Host
  }
} finally {
  Pop-Location
}
