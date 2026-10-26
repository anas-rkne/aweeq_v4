#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/threeweeq}"
BRANCH="${1:-launch/phase-0-baseline}"

cd "$APP_DIR"

if [ ! -f .env.production ]; then
  echo "Missing $APP_DIR/.env.production"
  exit 1
fi

if [ ! -f medusa/.env ]; then
  echo "Missing $APP_DIR/medusa/.env"
  exit 1
fi

echo "==> Pulling $BRANCH"
git fetch --all --prune
git checkout "$BRANCH"
git pull --ff-only

echo "==> Installing dependencies"
npm install --no-audit --no-fund
npm --prefix medusa install --no-audit --no-fund

echo "==> Building storefront"
npm run build

echo "==> Building Medusa"
npm run medusa:build

echo "==> Applying Medusa migrations"
npm run medusa:migrate

echo "==> Linking admin assets (medusa start serves public/admin from the project root)"
rm -rf medusa/public
ln -s .medusa/server/public medusa/public

echo "==> Reloading processes"
pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 save

echo "==> Health checks"
curl -fsS http://127.0.0.1:3000/ar >/dev/null
curl -fsS http://127.0.0.1:9000/health >/dev/null
echo "Deploy complete."
