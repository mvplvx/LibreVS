#!/bin/sh
# Write a PostgreSQL custom-format dump from the Compose database.
# The dump contains authentication records and report snapshots. Store it
# outside the web root, with access limited to the administrator.
#
#   POSTGRES_PASSWORD=... COMPOSE_PROJECT_NAME=librevs \
#     ./scripts/backup-database.sh /var/backups/librevs/librevs.dump
set -eu

output="${1:?Usage: ./scripts/backup-database.sh /path/to/librevs.dump}"
project="${COMPOSE_PROJECT_NAME:-librevs}"
user="${POSTGRES_USER:-librevs}"
database="${POSTGRES_DB:-librevs}"

mkdir -p "$(dirname "$output")"
docker compose -p "$project" exec -T db \
  pg_dump -U "$user" -d "$database" --format=custom --no-owner --no-acl \
  > "$output"
chmod 600 "$output"
echo "Wrote backup $(basename "$output")"
