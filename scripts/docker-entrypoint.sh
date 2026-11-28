#!/bin/sh
set -eu

secret="${BETTER_AUTH_SECRET:-}"
case "$secret" in
  ""|docker-build-placeholder-secret-32chars-min|change-me|changeme)
    echo "[librevs] Set BETTER_AUTH_SECRET to a generated value of at least 32 characters." >&2
    exit 1
    ;;
esac
if [ "${#secret}" -lt 32 ]; then
  echo "[librevs] BETTER_AUTH_SECRET must be at least 32 characters." >&2
  exit 1
fi
if [ -z "${BETTER_AUTH_URL:-}" ]; then
  echo "[librevs] BETTER_AUTH_URL is required and must be the public origin." >&2
  exit 1
fi

echo "[librevs] Applying database migrations..."
attempts=0
until node node_modules/prisma/build/index.js migrate deploy; do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge 10 ]; then
    echo "[librevs] Migrations failed after ${attempts} attempts." >&2
    exit 1
  fi
  echo "[librevs] Migration attempt ${attempts} failed. Retrying in 3s..."
  sleep 3
done

echo "[librevs] Starting application..."
exec "$@"
