param(
    [string]$RepoPath = $PSScriptRoot,
    [string]$VaultPath = 'G:\내 드라이브\00. 개인\70. 자료\00.obsidean\jason-obsi\knowledge warehouse',
    [string]$VaultSubdir = 'Policy Briefs\Weekly Digest'
)

$ErrorActionPreference = 'Stop'

$repoFullPath = (Resolve-Path $RepoPath).Path
$outputDir = Join-Path $repoFullPath 'report_digest\output'
if (-not (Test-Path $outputDir)) {
    throw "Output directory not found: $outputDir"
}

$gitDir = Join-Path $repoFullPath '.git'
if (Test-Path $gitDir) {
    Push-Location $repoFullPath
    try {
        git pull --ff-only
    }
    finally {
        Pop-Location
    }
}

$vaultTarget = Join-Path $VaultPath $VaultSubdir
$generatedTarget = Join-Path $vaultTarget '_generated\report-digest'
New-Item -ItemType Directory -Force -Path $vaultTarget | Out-Null
New-Item -ItemType Directory -Force -Path $generatedTarget | Out-Null

$latestMarkdown = Join-Path $outputDir 'latest-policy-brief.md'
$latestHtml = Join-Path $outputDir 'latest-policy-cards.html'
$latestJson = Join-Path $outputDir 'latest-report-items.json'
$latestSummary = Join-Path $outputDir 'latest-run-summary.json'

if (-not (Test-Path $latestMarkdown)) {
    throw "Latest markdown not found: $latestMarkdown"
}

Copy-Item $latestMarkdown (Join-Path $vaultTarget 'latest-policy-brief.md') -Force
if (Test-Path $latestHtml) {
    Copy-Item $latestHtml (Join-Path $generatedTarget 'latest-policy-cards.html') -Force
}
if (Test-Path $latestJson) {
    Copy-Item $latestJson (Join-Path $generatedTarget 'latest-report-items.json') -Force
}
if (Test-Path $latestSummary) {
    Copy-Item $latestSummary (Join-Path $generatedTarget 'latest-run-summary.json') -Force
}

$datedMarkdown = Get-ChildItem $outputDir -Filter '*-policy-brief.md' |
    Where-Object { $_.Name -ne 'latest-policy-brief.md' } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
if ($datedMarkdown) {
    Copy-Item $datedMarkdown.FullName (Join-Path $vaultTarget $datedMarkdown.Name) -Force
}

Write-Host "Synced markdown to: $vaultTarget"
Write-Host "Synced generated assets to: $generatedTarget"
