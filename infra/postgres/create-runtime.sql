-- Cluster bootstrap, once per disposable local/CI cluster. Supply app_password via psql -v.
CREATE ROLE bump_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE bump_app LOGIN PASSWORD :'app_password' INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT bump_runtime TO bump_app;
