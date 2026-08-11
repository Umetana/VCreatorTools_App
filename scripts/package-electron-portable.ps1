$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
  & npm run dist:unpacked
  if ($LASTEXITCODE -ne 0) { throw "Electron unpacked build failed" }

  $outputRoot = Join-Path $projectRoot "dist\electron"
  $source = Join-Path $outputRoot "win-unpacked"
  $stage = Join-Path $outputRoot "VCreatorTools-Portable"
  $zipFile = Join-Path $outputRoot "VCreatorTools-Portable-0.1.0-dev.zip"
  if (-not (Test-Path -LiteralPath (Join-Path $source "VCreatorTools.exe"))) { throw "VCreatorTools.exe is missing from unpacked build" }
  if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
  if (Test-Path -LiteralPath $zipFile) { Remove-Item -LiteralPath $zipFile -Force }
  Copy-Item -LiteralPath $source -Destination $stage -Recurse
  Copy-Item -LiteralPath (Join-Path $projectRoot "portable.json.example") -Destination (Join-Path $stage "portable.json")
  Copy-Item -LiteralPath (Join-Path $projectRoot "DISTRIBUTION_MODES.md") -Destination (Join-Path $stage "README_PORTABLE.md")
  Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zipFile -CompressionLevel Optimal
  Write-Host "Packaged $zipFile"
} finally {
  Pop-Location
}
