# MineOps — Local Development Setup

This covers all three repos: **MineOpsApp** (the mobile app), **MineOpsBackend** (the API server), and **MineOpsAuditService** (the audit log service). All three run locally on your own laptop, talking to a PostgreSQL database also running locally.

Clone all three into the same parent folder so they sit side by side, e.g.:

```
MineOps/
  MineOpsApp/
  MineOpsBackend/
  MineOpsAuditService/
```

---

## 1. Prerequisites

Install these before doing anything else:

- **Git**
- **Java 17 (JDK)** — [Eclipse Temurin 17](https://adoptium.net/temurin/releases/?version=17) is a good free option
- **PostgreSQL 14+** — [postgresql.org/download](https://www.postgresql.org/download/)
- **Node.js 20+ (LTS)** — [nodejs.org](https://nodejs.org/)
- **Expo Go** app on your phone (App Store / Google Play) — the easiest way to run the app without setting up an emulator
- A code editor (VS Code recommended)

You do **not** need to install Maven separately — both backend repos include a Maven wrapper (`mvnw` / `mvnw.cmd`) that downloads the right version automatically.

---

## 2. Get access

You need to be added to the `MineOpsApp` GitHub organization with Write access to all three repos before you can clone them. Confirm with the org owner if you haven't received an invite.

---

## 3. Clone the repos

```powershell
git clone https://github.com/MineOpsApp/MineOpsApp.git
git clone https://github.com/MineOpsApp/MineOpsBackend.git
git clone https://github.com/MineOpsApp/MineOpsAuditService.git
```

(Mac/Linux: same commands, just run from Terminal instead of PowerShell.)

---

## 4. Set up PostgreSQL

**Windows:** run the installer from postgresql.org. During setup it will ask you to set a password for the `postgres` user — remember it, you'll need it below.

**Mac:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

Once installed, create the database:

```bash
psql -U postgres
```
```sql
CREATE DATABASE mineops_db;
\q
```

---

## 5. Configure the backend

Both backend repos need a config file that is **intentionally not included in the repo** (it holds secrets, so it's gitignored). You create it yourself, once, on your own machine.

### `MineOpsBackend\backend\src\main\resources\application.properties`

Create this file with the following content:

```properties
spring.application.name=backend

spring.datasource.url=jdbc:postgresql://localhost:5432/mineops_db
spring.datasource.username=postgres
spring.datasource.password=YOUR_POSTGRES_PASSWORD

spring.flyway.out-of-order=true
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.flyway.enabled=true
spring.flyway.baseline-on-migrate=true

mineops.jwt.secret=pick-any-long-random-string
mineops.internal-api-key=pick-another-long-random-string
mineops.market.api-key=

mineops.audit-service.url=http://localhost:8081
mineops.cors.allowed-origins=http://localhost:19006,http://localhost:8081,http://localhost:8082

spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB
server.tomcat.max-http-form-post-size=10MB
server.tomcat.max-swallow-size=-1
spring.mvc.pathmatch.use-suffix-pattern=false
spring.task.scheduling.enabled=true
server.error.include-message=always
server.error.include-binding-errors=always
```

Replace `YOUR_POSTGRES_PASSWORD` with the password you set in step 4. For `mineops.jwt.secret` and `mineops.internal-api-key`, any long random string works for local development — e.g. generate one with `openssl rand -hex 32`, or just mash the keyboard for 40+ characters.

### `MineOpsAuditService\src\main\resources\application.properties`

Create this file with the following content:

```properties
spring.application.name=mineops-audit-service
server.port=8081

spring.datasource.url=jdbc:postgresql://localhost:5432/mineops_db
spring.datasource.username=postgres
spring.datasource.password=YOUR_POSTGRES_PASSWORD

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.default_schema=audit
spring.jpa.properties.hibernate.hbm2ddl.create_namespaces=true

mineops.jwt.secret=SAME_VALUE_AS_BACKEND_ABOVE
mineops.internal-api-key=SAME_VALUE_AS_BACKEND_ABOVE
```

**Important:** `mineops.jwt.secret` and `mineops.internal-api-key` must be **exactly identical** in both files — that's how the backend and audit service authenticate to each other. `YOUR_POSTGRES_PASSWORD` should also match what you set in step 4.

---

## 6. Run the backend

Open a terminal:

```powershell
cd MineOpsBackend\backend
.\mvnw.cmd spring-boot:run
```
(Mac/Linux: `./mvnw spring-boot:run`)

First run will take a few minutes (downloads dependencies). Wait for a log line like `Started BackendApplication` — this also means Flyway has run all database migrations automatically. Leave this terminal running.

---

## 7. Run the audit service

Open a **second** terminal:

```powershell
cd MineOpsAuditService
.\mvnw.cmd spring-boot:run
```
(Mac/Linux: `./mvnw spring-boot:run`)

Wait for it to start on port 8081. Leave this terminal running too.

---

## 8. Run the app

Open a **third** terminal:

```powershell
cd MineOpsApp
npm install
```

### Point the app at your own backend

The app needs to know your laptop's local network IP address (not `localhost` — your phone is a separate device on the same WiFi network, so it needs your computer's real address).

**Find your IP:**
- **Windows:** run `ipconfig`, look for "IPv4 Address" under your active WiFi adapter (something like `192.168.1.42`)
- **Mac:** System Settings → Wi-Fi → Details → look for the IP address, or run `ipconfig getifaddr en0`

Create a file called `.env` in the `MineOpsApp` root folder (this file is gitignored — it stays local to your machine only):

```
EXPO_PUBLIC_API_URL=http://YOUR_IP:8080/api
```

Replace `YOUR_IP` with the address you found above, e.g. `EXPO_PUBLIC_API_URL=http://192.168.1.42:8080/api`.

### Start the app

```powershell
npm start
```

Scan the QR code that appears with the **Expo Go** app on your phone. Your phone and laptop must be on the **same WiFi network** for this to work.

---

## Troubleshooting

- **"Network request failed" in the app** — double check your `.env` IP matches what `ipconfig`/`ifconfig` currently shows (it can change when you reconnect to WiFi), confirm your phone is on the same network, and confirm Windows Firewall isn't blocking inbound connections on ports 8080/8081 (you may need to allow Java through the firewall on first run).
- **Backend won't start / Flyway errors** — don't manually edit files in `src/main/resources/db/migration`. If you see a checksum mismatch, ask before touching anything — it usually means your local `mineops_db` is out of sync with the migration history.
- **"Port already in use"** — something else is already running on 8080 or 8081. Close it, or check for a leftover backend/audit-service process still running from a previous session.
- **Audit service can't authenticate with backend** — confirm `mineops.jwt.secret` and `mineops.internal-api-key` are character-for-character identical in both `application.properties` files.

---

## What never gets committed

Both `application.properties` files and your `.env` file are gitignored on purpose — they hold secrets and machine-specific config (your IP, your local Postgres password). Never force-add or commit them. If `git status` ever shows one of these as trackable, stop and ask before committing.
