#!/usr/bin/env sh
# Starts the Express API on 127.0.0.1 and the Next.js app on $PORT inside
# one Render container. If either process exits, kill the other and exit
# non-zero so Render restarts us.
set -eu

: "${PORT:=10000}"
: "${SILA_API_HOST:=127.0.0.1}"
: "${SILA_API_PORT:=4000}"
: "${NEXT_NODE_OPTIONS:=--max-old-space-size=220}"
: "${API_NODE_OPTIONS:=--max-old-space-size=180}"

echo "[start] PORT=${PORT} API=${SILA_API_HOST}:${SILA_API_PORT}"

# --- Express ---
cd /app/api
PORT="${SILA_API_PORT}" HOST="${SILA_API_HOST}" \
  NODE_OPTIONS="${API_NODE_OPTIONS}" \
  node server/dist/server/src/index.js &
API_PID=$!
echo "[start] api pid=${API_PID}"

# Wait for the API to come up before starting Next, so the first /healthz is
# correct. 30 x 1s is plenty; the production startup check runs during this
# window and will exit non-zero if the DB role is wrong.
i=0
while [ "$i" -lt 30 ]; do
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "[start] api exited before coming up; aborting"
    exit 1
  fi
  if wget -q -O - "http://${SILA_API_HOST}:${SILA_API_PORT}/healthz" >/dev/null 2>&1; then
    echo "[start] api is up"
    break
  fi
  i=$((i + 1))
  sleep 1
done

# --- Next.js ---
cd /app/web
PORT="${PORT}" HOSTNAME="0.0.0.0" \
  NODE_OPTIONS="${NEXT_NODE_OPTIONS}" \
  node server.js &
WEB_PID=$!
echo "[start] web pid=${WEB_PID}"

cleanup() {
  echo "[start] shutting down"
  kill "${API_PID}" "${WEB_PID}" 2>/dev/null || true
  wait "${API_PID}" 2>/dev/null || true
  wait "${WEB_PID}" 2>/dev/null || true
}
trap cleanup TERM INT

# Wait for either child to exit, then tear the other down and exit non-zero
# so Render restarts the container.
wait -n "${API_PID}" "${WEB_PID}" || true
echo "[start] one process exited; stopping the other"
cleanup
exit 1
