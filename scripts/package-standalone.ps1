param(
  [string]$PackageName = "gp-multi-counter"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
& node (Join-Path $PSScriptRoot "build-standalone.js") $PackageName
if ($LASTEXITCODE -ne 0) { throw "Standalone build failed" }

$directoryNames = @{
  "gp-multi-counter" = "VCreatorTools_GP_Multi_Counter"
}
if (-not $directoryNames.ContainsKey($PackageName)) { throw "Unknown standalone package: $PackageName" }

$outputRoot = Join-Path $projectRoot "dist\standalone"
$packageRoot = Join-Path $outputRoot $directoryNames[$PackageName]
$zipFile = Join-Path $outputRoot ($directoryNames[$PackageName] + ".zip")
if (Test-Path -LiteralPath $zipFile) { Remove-Item -LiteralPath $zipFile -Force }
Compress-Archive -Path (Join-Path $packageRoot "*") -DestinationPath $zipFile -CompressionLevel Optimal
Write-Host "Packaged $zipFile"
