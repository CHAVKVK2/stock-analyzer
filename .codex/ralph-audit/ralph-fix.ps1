param(
  [int]$Iterations = 1,
  [switch]$NoSearch
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$PrdPath = Join-Path $ScriptDir 'prd.json'
$CodexPath = Join-Path $ScriptDir 'CODEX.md'
$EventsLog = Join-Path $ScriptDir 'events.log'
$RunLog = Join-Path $ScriptDir 'run.log'
$RequestedModel = 'gpt-5.4'
$ReasoningEffort = 'high'

function Write-EventLog([string]$Message) {
  $line = '{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Add-Content -Path $EventsLog -Value $line
  Write-Output $line
}

function Get-Prd {
  Get-Content $PrdPath -Raw | ConvertFrom-Json -Depth 10
}

function Save-Prd($Prd) {
  $Prd | ConvertTo-Json -Depth 10 | Set-Content -Path $PrdPath -Encoding UTF8
}

function Get-NextFixStory($Prd) {
  $Prd.stories | Where-Object { $_.passes -and -not $_.fixed } | Select-Object -First 1
}

function Build-Prompt($CodexRules, $Story, $AuditReport) {
@"
$CodexRules

Task type: focused repo repair
Story ID: $($Story.id)
Title: $($Story.title)

Relevant scope:
$($Story.scope -join "`n")

Audit report:
$AuditReport

Instructions:
- Fix only the concrete issue described in the audit report.
- Keep changes minimal and reversible.
- Run local verification before finishing.
- In the final response, summarize the fix and the checks you ran.
"@
}

if (-not (Test-Path $PrdPath)) { throw "Missing $PrdPath" }
if (-not (Test-Path $CodexPath)) { throw "Missing $CodexPath" }

$env:CODEX_INTERNAL_ORIGINATOR_OVERRIDE = 'Codex Desktop'
$CodexRules = Get-Content $CodexPath -Raw

for ($i = 0; $i -lt $Iterations; $i++) {
  $Prd = Get-Prd
  $Story = Get-NextFixStory $Prd
  if (-not $Story) {
    Write-EventLog 'No audited stories waiting for fixes.'
    break
  }

  $AuditPath = Join-Path $ScriptDir $Story.output
  if (-not (Test-Path $AuditPath)) {
    Write-EventLog ("FIX skipped {0} missing audit report" -f $Story.id)
    break
  }

  $AuditReport = Get-Content $AuditPath -Raw
  $Prompt = Build-Prompt $CodexRules $Story $AuditReport

  Write-EventLog ("FIX start {0}" -f $Story.id)

  $Args = @(
    'exec',
    '--model', $RequestedModel,
    '--reasoning-effort', $ReasoningEffort,
    '--cwd', $RepoRoot,
    $Prompt
  )

  if (-not $NoSearch) {
    $Args += '--search'
  }

  $AllOutput = & codex @Args 2>&1
  $AllOutput | Add-Content -Path $RunLog

  if ($LASTEXITCODE -ne 0) {
    Write-EventLog ("FIX failed {0}" -f $Story.id)
    break
  }

  $Story.fixed = $true
  Save-Prd $Prd
  Write-EventLog ("FIX done {0}" -f $Story.id)
}
