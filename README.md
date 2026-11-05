# Healing Cinema

> A shared virtual cinema where people can watch YouTube together, meet in a 3D theater, chat, and personalize their experience.

Healing Cinema is a full-stack web application with an Angular frontend and a Spring Boot backend. It combines a real-time cinema room with synchronized YouTube playback, room chat and reactions, user accounts, a wardrobe, daily tasks, donations, and administration tools. PostgreSQL stores persistent application data; Spring WebSocket/STOMP carries live room updates.

## Contents

- [Features](#features)
- [Technology](#technology)
- [Quick start](#quick-start)
- [Fork and clone](#fork-and-clone)
- [Configuration](#configuration)
- [Run the application](#run-the-application)
- [Build for deployment](#build-for-deployment)
- [Project layout](#project-layout)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Features

- Shared indoor and outdoor cinema rooms rendered with Three.js.
- Synchronized YouTube playback and a room video queue.
- Real-time movement, seats, chat, reactions, and playback updates over WebSocket.
- User registration and login, profiles, wardrobe purchases, daily tasks, and donation flows.
- Administrative tools for user and payment review.
- PostgreSQL persistence with schema migrations managed by Flyway.

## Technology

| Area | Stack |
| --- | --- |
| Frontend | Angular 22, TypeScript, Three.js, RxJS |
| Backend | Java 21, Spring Boot 4, Spring WebSocket/STOMP |
| Database | PostgreSQL 16, Spring Data JPA, Flyway |
| Local database | Docker Compose |

## Quick start

### Prerequisites

- Git
- Node.js 22.12+ (Node 24+ is also supported) and npm
- Java 21 JDK
- Docker Desktop or Docker Engine with the Compose plugin

The frontend and backend run as separate processes in development. The browser app is served at `http://localhost:4200`; the API and WebSocket endpoint use port `8080`; PostgreSQL uses port `5432`.

### Start the database

From the repository root:

```bash
docker compose -f backend/docker-compose.yml up -d
```

### Start the backend

In a second terminal:

```bash
cd backend
./mvnw spring-boot:run
```

On Windows PowerShell, use:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

On first startup, Flyway creates and upgrades the database schema automatically.

### Start the frontend

In a third terminal, from the repository root:

```bash
cd hilling-movie
npm ci
npm start
```

Open **http://localhost:4200**. Leave the database and backend terminals running while using the app. YouTube playback requires an internet connection; some videos may disallow embedding or autoplay.

## Fork and clone

1. Open the repository on GitHub and select **Fork**.
2. Clone your fork (replace `<your-github-username>` with your account name):

   ```bash
   git clone https://github.com/<your-github-username>/healing_cin-.git
   cd healing_cin-
   ```

3. Start PostgreSQL using the [database command](#start-the-database), then start the backend and frontend using the commands above.

To update your fork later, add the original repository as `upstream`, then fetch and merge its default branch:

```bash
git remote add upstream https://github.com/anhkhoahuynh270705-boop/healing_cin-.git
git fetch upstream
git merge upstream/main
```

If the repository's default branch is not `main`, substitute its actual branch name in the final command.

## Configuration

Local defaults are set for the included Compose database. The backend supports these environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_URL` | `jdbc:postgresql://localhost:5432/healing_cinema` | JDBC connection URL |
| `DB_USERNAME` | `postgres` | PostgreSQL username |
| `DB_PASSWORD` | `postgres` | PostgreSQL password |
| `CINEMA_ADMIN_USERNAME` | `admin` | Built-in bootstrap admin username |
| `CINEMA_ADMIN_PASSWORD` | `admin` | Built-in bootstrap admin password |
| `CINEMA_ADMIN_KEY` | `khoa123` | Admin login/registration key |
| `DONATION_ACCOUNT_NUMBER` | `1221868856` | Donation account number shown by the app |
| `DONATION_ACCOUNT_NAME` | `HUYNH ANH KHOA` | Donation account name shown by the app |
| `DONATION_ZALO_URL` | `https://zalo.me/` | Contact link shown by the app |
| `MEDIA_STORAGE_DIR` | `./storage/media` | Directory for uploaded media |

For a local-only setup, the defaults work with the provided Compose file. Before exposing an instance to other people, replace the default admin credentials and key, set unique database credentials, and configure donation details. Do not commit real credentials or private environment files.

For example, on macOS/Linux:

```bash
export CINEMA_ADMIN_USERNAME=site-admin
export CINEMA_ADMIN_PASSWORD='use-a-long-unique-password'
export CINEMA_ADMIN_KEY='use-a-separate-random-key'
cd backend
./mvnw spring-boot:run
```

PowerShell:

```powershell
$env:CINEMA_ADMIN_USERNAME = "site-admin"
$env:CINEMA_ADMIN_PASSWORD = "use-a-long-unique-password"
$env:CINEMA_ADMIN_KEY = "use-a-separate-random-key"
cd backend
.\mvnw.cmd spring-boot:run
```

## Run the application

- Frontend development server: `http://localhost:4200`
- Backend HTTP API: `http://localhost:8080`
- WebSocket endpoint: `ws://localhost:8080/ws`
- PostgreSQL: `localhost:5432` (`healing_cinema` database)

To try a shared room locally, open the app in more than one browser tab. The backend persists accounts and room/playback data in PostgreSQL. Flyway migrations are in `backend/src/main/resources/db/migration` and run automatically at startup. Uploaded media is stored under `backend/storage/media` by default.

## Build for deployment

Build the Angular production bundle:

```bash
cd hilling-movie
npm ci
npm run build
```

The generated browser and server bundles are written to `hilling-movie/dist/hilling-movie/`. Run the Angular SSR server with:

```bash
npm run serve:ssr:hilling-movie
```

For a backend JAR:

```bash
cd backend
./mvnw clean package
java -jar target/hilling-0.0.1-SNAPSHOT.jar
```

Set production database credentials and admin settings through environment variables. Configure HTTPS and matching backend allowed-origin patterns when serving the frontend and backend from separate origins. The local configuration only allows localhost origins.

## Project layout

```text
.
├── backend/                 Spring Boot API, WebSocket server, migrations
├── hilling-movie/           Angular application and SSR server
├── scripts/                 Build and maintenance scripts
└── docs/                    Project plans and technical notes
```

## Troubleshooting

**The backend cannot connect to PostgreSQL**

Check that Docker is running and start the database with `docker compose -f backend/docker-compose.yml up -d`. Confirm port `5432` is not already used by another PostgreSQL instance.

**The frontend opens but API calls or realtime features fail**

Confirm the backend is running on port `8080`. The app derives the API/WebSocket host from the browser hostname and expects the backend on the same hostname at port `8080`.

**A YouTube video does not play**

The video owner may have disabled embedding, the browser may block autoplay until the page receives user input, or the network may block YouTube. Try another publicly embeddable video.

**The frontend package install fails**

Check the Node.js version with `node --version`; use Node 22.12 or later. `npm ci` installs the exact dependency versions recorded in the lockfile.

## Contributing

Fork the repository, create a focused branch, and open a pull request with a clear summary of the change. Keep credentials and personal data out of commits. If a change alters setup, configuration, or user-visible behavior, update this README alongside it.
