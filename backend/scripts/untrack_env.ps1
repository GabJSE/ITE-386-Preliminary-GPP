<#
untrack_env.ps1
PowerShell helper to untrack backend/.env from git, commit .gitignore, and push.
Run this from the repository root (or from backend folder) on a machine with git installed.
#>

param(
  [string]$RepoRoot = "..\",
  [switch]$DryRun
)

Set-Location $PSScriptRoot\..\
$pwd

function Run { param($cmd) if ($DryRun) { Write-Host "DRY-RUN: $cmd" } else { iex $cmd } }

# Ensure git is available
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Error "git is not available on this machine. Install git and re-run this script."; exit 1
}

# Check repo status
Write-Host "Checking repository (cwd =" (Get-Location) ")"

# Ensure .gitignore contains backend/.env
if (-not (Get-Content .gitignore -ErrorAction SilentlyContinue | Select-String -SimpleMatch "backend/.env")) {
  Write-Host "Adding backend/.env to .gitignore"
  if (-not $DryRun) { Add-Content -Path .gitignore -Value "`n# backend secrets`nbackend/.env`n" }
} else {
  Write-Host "backend/.env already ignored by .gitignore"
}

# Check if backend/.env is tracked
$tracked = $false
try {
  git ls-files --error-unmatch backend/.env > $null 2>&1
  $tracked = $true
} catch {
  $tracked = $false
}

if ($tracked) {
  Write-Host "backend/.env is currently tracked. It will be removed from the index (kept locally)."
  if ($DryRun) { Write-Host "DRY-RUN: git rm --cached backend/.env" } else { git rm --cached backend/.env }
  Write-Host "Staging .gitignore"
  if ($DryRun) { Write-Host "DRY-RUN: git add .gitignore" } else { git add .gitignore }
  Write-Host "Committing changes"
  if ($DryRun) { Write-Host "DRY-RUN: git commit -m 'Stop tracking backend/.env and add to .gitignore'" } else { git commit -m "Stop tracking backend/.env and add to .gitignore" }
  Write-Host "Pushing to remote"
  if ($DryRun) { Write-Host "DRY-RUN: git push" } else { git push }
  Write-Host "Done. backend/.env is now untracked locally. Remember to rotate any credentials if they were pushed."
} else {
  Write-Host "backend/.env is not tracked. Nothing to untrack."
  Write-Host "Ensure you still do not commit it in the future."
}

Write-Host "If backend/.env was ever pushed to a remote, rotate the Atlas credentials immediately. See ../UNTRACK_ENV.md for next steps."