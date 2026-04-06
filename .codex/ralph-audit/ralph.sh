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
REASONING_EFFORT="medium"

export CODEX_INTERNAL_ORIGINATOR_OVERRIDE="Codex Desktop"

log_event() {
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" | tee -a "$EVENTS_LOG"
}

for ((i=0; i<ITERATIONS; i++)); do
  STORY_JSON="$(jq -c '.stories[] | select(.passes == false) | . ' "$PRD_PATH" | head -n 1)"
  if [[ -z "$STORY_JSON" ]]; then
    log_event "No remaining audit stories."
    exit 0
  fi

  STORY_ID="$(jq -r '.id' <<<"$STORY_JSON")"
  OUTPUT_REL="$(jq -r '.output' <<<"$STORY_JSON")"
  OUTPUT_PATH="$SCRIPT_DIR/$OUTPUT_REL"
  TITLE="$(jq -r '.title' <<<"$STORY_JSON")"
  PROMPT_BODY="$(jq -r '.prompt' <<<"$STORY_JSON")"
  SCOPE="$(jq -r '.scope[]' <<<"$STORY_JSON")"
  ACCEPTANCE="$(jq -r '.acceptance[]' <<<"$STORY_JSON")"

  PROMPT="$(cat "$CODEX_PATH")

Task type: read-only audit
Story ID: $STORY_ID
Title: $TITLE

Scope:
$SCOPE

Audit task:
$PROMPT_BODY

Acceptance:
$ACCEPTANCE

Important:
- Read files only as needed.
- Do not modify repo files.
- Produce only the final audit markdown body.
- The report path is $OUTPUT_REL
"

  log_event "AUDIT start $STORY_ID"
  codex exec --model "$REQUESTED_MODEL" --reasoning-effort "$REASONING_EFFORT" -s read-only ${SEARCH_FLAG:+$SEARCH_FLAG} --cwd "$REPO_ROOT" --output-last-message "$OUTPUT_PATH" "$PROMPT" >>"$RUN_LOG" 2>&1
  jq --arg id "$STORY_ID" '(.stories[] | select(.id == $id) | .passes) = true' "$PRD_PATH" > "$PRD_PATH.tmp"
  mv "$PRD_PATH.tmp" "$PRD_PATH"
  log_event "AUDIT done $STORY_ID"
done
