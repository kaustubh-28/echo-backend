#!/bin/sh
set -e

if [ ! -d node_modules/express ]; then
  echo "Installing dependencies..."
  npm ci
fi

exec "$@"
