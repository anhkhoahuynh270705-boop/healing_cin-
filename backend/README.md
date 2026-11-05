# Backend

This directory contains the Healing Cinema Spring Boot API, WebSocket server, PostgreSQL migrations, and local database Compose configuration.

For the complete setup guide, including prerequisites, fork/clone instructions, configuration, and production build notes, see the [project README](../README.md).

## Start locally

From the repository root, start PostgreSQL:

```bash
docker compose -f backend/docker-compose.yml up -d
```

Then run the server from this directory:

```bash
./mvnw spring-boot:run
```

On Windows PowerShell:

```powershell
.\mvnw.cmd spring-boot:run
```

The server listens on port `8080`. Flyway applies migrations from `src/main/resources/db/migration` automatically. The default local database credentials match `docker-compose.yml` and are for development only.

## Run backend and PostgreSQL with Docker

From this directory:

```bash
docker compose up --build -d
```

The API is available at `http://localhost:8080`. Docker Compose builds the backend image from `Dockerfile`, waits for PostgreSQL to become healthy, and keeps database and uploaded media in named volumes. View logs with `docker compose logs -f backend`; stop the services with `docker compose down`.

For a deployed instance, set `DB_PASSWORD`, `CINEMA_ADMIN_USERNAME`, `CINEMA_ADMIN_PASSWORD`, and `CINEMA_ADMIN_KEY` in the environment before starting Compose. Do not use the local defaults on a public server.
