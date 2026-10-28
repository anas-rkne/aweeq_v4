#!/usr/bin/env bash
# One-shot production health check for 3WEEQ.
#
#   ./deploy/healthcheck.sh                       # local defaults
#   WEB_URL=https://3weeq.ae API_URL=https://api.3weeq.ae ./deploy/healthcheck.sh
#
# Exits non-zero on the first failure so it can be used from cron, CI, or a
# post-deploy hook. Read-only: never restarts anything.
set -uo pipefail

WEB_URL="${WEB_URL:-http://127.0.0.1:3000}"
API_URL="${API_URL:-http://127.0.0.1:9000}"
PUBLISHABLE_KEY="${MEDUSA_PUBLISHABLE_KEY:-}"

failures=0
fail() { echo "  FAIL  $1"; failures=$((failures + 1)); }
pass() { echo "  ok    $1"; }

check_status() {
  local label="$1" url="$2" expect="${3:-200}"
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url" || echo 000)"
  if [ "$code" = "$expect" ]; then
    pass "$label ($code)"
  else
    fail "$label (expected $expect, got $code) — $url"
  fi
}

echo "== HTTP =="
check_status "storefront /ar" "$WEB_URL/ar"
check_status "storefront /en" "$WEB_URL/en"
check_status "product list /ar/products" "$WEB_URL/ar/products"
check_status "sitemap.xml" "$WEB_URL/sitemap.xml"
check_status "robots.txt" "$WEB_URL/robots.txt"
check_status "medusa health" "$API_URL/health"
check_status "medusa admin" "$API_URL/app"

if [ -n "$PUBLISHABLE_KEY" ]; then
  echo "== Store API =="
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
    -H "x-publishable-api-key: $PUBLISHABLE_KEY" "$API_URL/store/products?limit=1" || echo 000)"
  [ "$code" = "200" ] && pass "store/products ($code)" || fail "store/products ($code)"
fi

echo "== PM2 =="
if command -v pm2 >/dev/null 2>&1; then
  for app in threeweeq-web threeweeq-api; do
    status="$(pm2 jlist 2>/dev/null | node -e '
      let raw = ""
      process.stdin.on("data", (c) => (raw += c))
      process.stdin.on("end", () => {
        try {
          const list = JSON.parse(raw)
          const app = list.find((entry) => entry.name === process.argv[1])
          process.stdout.write(app ? String(app.pm2_env.status) : "missing")
        } catch { process.stdout.write("unknown") }
      })' "$app")"
    [ "$status" = "online" ] && pass "$app online" || fail "$app is $status"
  done
else
  echo "  skip  pm2 not installed in this shell"
fi

echo "== Disk =="
used="$(df -P / | awk 'NR==2 {gsub("%","",$5); print $5}')"
if [ "${used:-100}" -lt 90 ]; then pass "root filesystem ${used}% used"; else fail "root filesystem ${used}% used"; fi

echo "== Outbox =="
if command -v psql >/dev/null 2>&1 && [ -n "${DATABASE_URL:-}" ]; then
  stuck="$(psql "$DATABASE_URL" -tAc \
    "select count(*) from ops.outbox_event where status in ('pending','processing') and available_at < now() - interval '1 hour'" \
    2>/dev/null || echo "")"
  if [ -z "$stuck" ]; then
    echo "  skip  outbox query failed"
  elif [ "$stuck" = "0" ]; then
    pass "no stuck outbox events"
  else
    fail "$stuck outbox event(s) older than 1h"
  fi
else
  echo "  skip  psql/DATABASE_URL unavailable"
fi

echo
if [ "$failures" -eq 0 ]; then
  echo "All checks passed."
  exit 0
fi

echo "$failures check(s) failed."
exit 1
