#!/bin/sh
# Restore a custom-format dump into an explicit PostgreSQL container.
# This refuses the development container name librevs-db.
#
#   ./scripts/restore-database.sh /path/to/librevs.dump librevs-restore-db
set -eu

dump="${1:?Usage: ./scripts/restore-database.sh /path/to/librevs.dump container_name}"
container="${2:?Usage: ./scripts/restore-database.sh /path/to/librevs.dump container_name}"
user="${POSTGRES_USER:-librevs}"
database="${POSTGRES_DB:-librevs}"

if [ "$container" = "librevs-db" ]; then
  echo "Refusing to restore into the development database container librevs-db." >&2
  exit 1
fi
if [ ! -f "$dump" ]; then
  echo "Backup file was not found." >&2
  exit 1
fi

docker exec -i "$container" pg_restore -U "$user" -d "$database" --no-owner --no-acl --exit-on-error < "$dump"
echo "Restored $(basename "$dump") into $container"
