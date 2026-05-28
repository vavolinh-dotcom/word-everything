$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cli = Join-Path $scriptDir "word-helper-cli.mjs"
node $cli restart
