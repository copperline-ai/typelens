#!/bin/sh
# Generates a .env with a random TYPESENSE_API_KEY if one doesn't exist,
# then starts typelens + Typesense via Docker Compose.

if [ ! -f .env ] || ! grep -q "TYPESENSE_API_KEY=" .env 2>/dev/null; then
  KEY=$(openssl rand -base64 32)
  echo "TYPESENSE_API_KEY=$KEY" >> .env
  echo "Generated TYPESENSE_API_KEY and wrote to .env"
fi

docker compose up "$@"
