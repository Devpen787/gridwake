#!/usr/bin/env bash
set -u

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_dir" || exit 1

while true; do
  clear
  date -u '+GRIDWAKE VERIFY LOOP · %Y-%m-%dT%H:%M:%SZ'
  npm run verify
  result=$?
  if [ "$result" -eq 0 ]; then
    echo "VERIFY PASS · watching for the next edit"
  else
    echo "VERIFY FAIL ($result) · fix before the next slice"
  fi
  sleep 20
done
