#!/usr/bin/env bash
# Opens two cloudflared quick tunnels (web + server) and keeps them up until Ctrl-C.
set -euo pipefail

WEB_PORT="${WEB_PORT:-3000}"
SERVER_PORT="${SERVER_PORT:-3001}"
TIMEOUT_S="${TIMEOUT_S:-30}"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "error: cloudflared not found. Install it with: brew install cloudflared" >&2
  exit 1
fi

log_dir="$(mktemp -d)"
pids=()

cleanup() {
  for pid in ${pids[@]+"${pids[@]}"}; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  rm -rf "$log_dir"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

start_tunnel() {
  local name="$1" port="$2"
  cloudflared tunnel --no-autoupdate --url "http://localhost:${port}" >"${log_dir}/${name}.log" 2>&1 &
  pids+=("$!")
}

# Quick tunnels print their URL in the log; there is no API to ask for it.
wait_for_url() {
  local name="$1" port="$2" url="" elapsed=0
  while [ "$elapsed" -lt "$TIMEOUT_S" ]; do
    url="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "${log_dir}/${name}.log" | head -n 1 || true)"
    if [ -n "$url" ]; then
      echo "$url"
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  echo "error: ${name} tunnel (localhost:${port}) did not come up within ${TIMEOUT_S}s. cloudflared said:" >&2
  tail -n 20 "${log_dir}/${name}.log" >&2
  return 1
}

start_tunnel web "$WEB_PORT"
start_tunnel server "$SERVER_PORT"
web_url="$(wait_for_url web "$WEB_PORT")"
server_url="$(wait_for_url server "$SERVER_PORT")"

cat <<MSG

Web    (localhost:${WEB_PORT}):    ${web_url}
Server (localhost:${SERVER_PORT}): ${server_url}

Restart Wasp with the public URLs (the way the Wasp 0.26 CLI docs recommend for tunnels):

  wasp start --client-url ${web_url} --server-url ${server_url}

Or put these lines in the env files, then restart wasp start:

  app/.env.client:
    REACT_APP_API_URL=${server_url}
  app/.env.server:
    WASP_WEB_CLIENT_URL=${web_url}
    WASP_SERVER_URL=${server_url}

These URLs change every time this script runs. Phones open: ${web_url}
Tunnels stay up until you press Ctrl-C.
MSG

wait
