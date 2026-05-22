#!/bin/sh
set -e

echo "[librevs] Waiting for database..."
until npx prisma migrate deploy; do
  echo "[librevs] Migrate failed — retrying in 3s..."
  sleep 3
done

echo "[librevs] Running base seed..."
node prisma/seed.js

if [ "${LIBREVS_SEED_TEST_ENV:-1}" = "1" ]; then
  echo "[librevs] Running test-environment seed..."
  npx tsx scripts/seed/test-environment.ts
fi

echo "[librevs] Starting application..."
exec "$@"
