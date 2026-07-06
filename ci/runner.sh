#!/bin/sh

set -e

cd "$(dirname "$0")"

if [ -z "$DATABASE_URL" ]; then
    export DATABASE_URL="$(node aws-secret-to-db-url.js)"
fi

if [ -z "$DMOB_DATABASE_URL" ]; then
    export DMOB_DATABASE_URL="$(node aws-secret-to-db-dmob-url.js)"
fi

if [ -n "$DATABASE_URL" ] && [ -n "$DMOB_DATABASE_URL" ]; then
    exec "$@"
fi
