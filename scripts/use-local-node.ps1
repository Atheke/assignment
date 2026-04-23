# Optional: prepends portable Node (if present) to PATH for this session.
$portable = Join-Path (Split-Path $PSScriptRoot -Parent) ".tools\node-v22.14.0-win-x64"
if (Test-Path "$portable\node.exe") {
  $env:Path = "$portable;" + $env:Path
  Write-Host "Using portable Node: $portable"
} else {
  Write-Host "Portable Node not found at $portable — using system Node/npm if available."
}
