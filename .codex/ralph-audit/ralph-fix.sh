#!/usr/bin/env bash
set -euo pipefail

ITERATIONS="${1:-1}"
SEARCH_FLAG="--search"
if [[ "${2:-}" == "--no-search" ]]; then
  SEARCH_FLAG=""
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PRD_PATH="$SCRIPT_DIR/prd.json"
CODEX_PATH="$SCRIPT_DIR/CODEX.md"
EVENTS_LOG="$SCRIPT_DIR/events.log"
RUN_LOG="$SCRIPT_DIR/run.log"
REQUESTED_MODEL="gpt-5.4"
REASONING_EFFORT="high"

export CODEX_INTERNAL_ORIGINATOR_OVERRIDE="Codex Desktop"

log_event() {
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" | tee -a "$EVENTS_LOG"
}

for ((i=0; i<ITERATIONS; i++)); do
  STORY_JSON="$(jq -c '.stories[] | select(.passes == true and .fixed == false) | . ' "$PRD_PATH" | head -n 1)"
  if [[ -z "$STORY_JSON" ]]; then
    log_event "No audited stories waiting for fixes."
    exit 0
  fi

  STORY_ID="$(jq -r '.id' <<<"$STORY_JSON")"
  TITLE="$(jq -r '.title' <<<"$STORY_JSON")"
  OUTPUT_REL="$(jq -r '.output' <<<"$STORY_JSON")"
  AUDIT_PATH="$SCRIPT_DIR/$OUTPUT_REL"
  if [[ ! -f "$AUDIT_PATH" ]]; then
    log_event "FIX skipped $STORY_ID missing audit report"
    exit 1
  fi

  AUDIT_REPORT="$(cat "$AUDIT_PATH")"
  SCOPE="$(jq -r '.scope[]' <<<"$STORY_JSON")"

  PROMPT="$(cat "$CODEX_PATH")

Task type: focused repo repair
Story ID: $STORY_ID
Title: $TITLE

Relevant scope:
$SCOPE

Audit report:
$AUDIT_REPORT

Instructions:
- Fix only the concrete issue described in the audit report.
- Keep changes minimal and reversible.
- Run local verification before finishing.
- In the final response, summarize the fix and the checks you ran.
"

  log_event "FIX start $STORY_ID"
  codex exec --model "$REQUESTED_MODEL" --reasoning-effort "$REASONING_EFFORT" ${SEARCH_FLAG:+$SEARCH_FLAG} --cwd "$REPO_ROOT" "$PROMPT" >>"$RUN_LOG" 2>&1
  jq --arg id "$STORY_ID" '(.stories[] | select(.id == $id) | .fixed) = true' "$PRD_PATH" > "$PRD_PATH.tmp"
  mv "$PRD_PATH.tmp" "$PRD_PATH"
  log_event "FIX done $STORY_ID"
done
