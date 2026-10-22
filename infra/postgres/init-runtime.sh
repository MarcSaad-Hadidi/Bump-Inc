#!/bin/sh
set -eu
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=ON_ERROR_STOP=1 --set=app_password="$APP_DATABASE_PASSWORD" \
  --file=/opt/bump/create-runtime.sql
