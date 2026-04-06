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
$ReasoningEffort = 'medium'

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

function Get-NextStory($Prd) {
  $Prd.stories | Where-Object { -not $_.passes } | Select-Object -First 1
}

function Build-Prompt($CodexRules, $Story) {
@"
$CodexRules

Task type: read-only audit
Story ID: $($Story.id)
Title: $($Story.title)

Scope:
$($Story.scope -join "`n")

Audit task:
$($Story.prompt)

Acceptance:
$($Story.acceptance -join "`n")

Important:
- Read files only as needed.
- Do not modify repo files.
- Produce only the final audit markdown body.
- The report path is $($Story.output)
"@
}

if (-not (Test-Path $PrdPath)) { throw "Missing $PrdPath" }
if (-not (Test-Path $CodexPath)) { throw "Missing $CodexPath" }

$env:CODEX_INTERNAL_ORIGINATOR_OVERRIDE = 'Codex Desktop'
$CodexRules = Get-Content $CodexPath -Raw

for ($i = 0; $i -lt $Iterations; $i++) {
  $Prd = Get-Prd
  $Story = Get-NextStory $Prd
  if (-not $Story) {
    Write-EventLog 'No remaining audit stories.'
    break
  }

  $OutputPath = Join-Path $ScriptDir $Story.output
  $Prompt = Build-Prompt $CodexRules $Story

  Write-EventLog ("AUDIT start {0}" -f $Story.id)

  $Args = @(
    'exec',
    '--model', $RequestedModel,
    '--reasoning-effort', $ReasoningEffort,
    '-s', 'read-only',
    '--output-last-message', $OutputPath
  )

  if (-not $NoSearch) {
    $Args += '--search'
  }

  $Args += @('--cwd', $RepoRoot, $Prompt)

  $AllOutput = & codex @Args 2>&1
  $AllOutput | Add-Content -Path $RunLog

  if ($LASTEXITCODE -ne 0) {
    Write-EventLog ("AUDIT failed {0}" -f $Story.id)
    break
  }

  $Story.passes = $true
  Save-Prd $Prd
  Write-EventLog ("AUDIT done {0}" -f $Story.id)
}
