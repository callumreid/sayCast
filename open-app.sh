#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Open App
# @raycast.mode silent
# @raycast.packageName Browser Tools
# @raycast.description Opens an app by name
# @raycast.author Callum
# @raycast.icon :computer:

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Missing app name" >&2
  exit 1
fi

normalize() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:] '
}

find_app() {
  local search_term="$1"
  local normalized_search=$(normalize "$search_term")
  
  while IFS= read -r app_path; do
    if [[ -d "$app_path" ]]; then
      local app_name=$(basename "$app_path" .app)
      local normalized_name=$(normalize "$app_name")
      if [[ "$normalized_name" == *"$normalized_search"* ]] || [[ "$normalized_search" == *"$normalized_name"* ]]; then
        echo "$app_name"
        return 0
      fi
    fi
  done < <(mdfind "kMDItemKind == 'Application'" 2>/dev/null)
  
  return 1
}

requested=$(normalize "$*")
case "$requested" in
  "iterm"|"i term"|"terminal"|"iterm2") target="iTerm" ;;
  "granola") target="Granola" ;;
  "facetime"|"face time") target="FaceTime" ;;
  "findmy"|"find my") target="Find My" ;;
  "focus") target="Focus" ;;
  "ray"|"ray control"|"ray control app"|"ray app") target="Ray Control" ;;
  "linear") target="Linear" ;;
  "notion") target="Notion" ;;
  "messages") target="Messages" ;;
  "quicktime"|"quicktime player") target="QuickTime Player" ;;
  "obsidian") target="Obsidian" ;;
  "raycast") target="Raycast" ;;
  "steam") target="Steam" ;;
  "system settings"|"settings"|"preferences"|"systempreferences") target="System Settings" ;;
  "finder") target="Finder" ;;
  "zoom") target="zoom.us" ;;
  "slack") target="Slack" ;;
  "wispr"|"wispr flow"|"flow") target="Wispr Flow" ;;
  *)
    target=$(find_app "$*") || true
    if [[ -z "$target" ]]; then
      if open -a "$*" 2>/dev/null; then
        exit 0
      fi
      echo "App '$*' not found" >&2
      exit 1
    fi
    ;;
esac

if ! open -a "$target"; then
  echo "Failed to launch $target" >&2
  exit 1
fi
