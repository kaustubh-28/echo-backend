# echo-backend
Backend service for Echo — an anonymous platform for sharing wisdom, learning and quotes. Built with Node.js, Express, TypeScript and MongoDB.
=======
# Echo Backend

Echo Backend is the REST API for Echo — an anonymous journaling platform. It is built using **Express**, **TypeScript**, and **MongoDB**, structured with **domain-driven modular architecture** complying with **SOLID** principles.

---

## ⚡ Quick Start

### 1. Environment Setup
Copy the configuration template and set the required environment values:
```bash
cp .env.example .env
```
Ensure at minimum `JWT_SECRET`, `ADMIN_USERNAME`, and `VISITOR_HASH_SALT` are populated in `.env`.

### 2. Run Local Development (with auto-reload)
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Run with Docker Compose
```bash
# Start backend, MongoDB, and Mongo Express dashboard
docker compose -f docker-compose.dev.yml up --build
```
* **API URL**: `http://localhost:8080/api/v1` (local) or `http://localhost:8088/api/v1` (Docker).
* **Mongo Express Dashboard**: `http://localhost:8081` (credentials: `admin` / `admin`).

---

## 🛠️ CLI Admin Management

We provide clean CLI scripts for managing the administrative accounts:

* **Create Administrator**:
  ```bash
  npm run admin:create
  ```
  *(Prompts for username and password, then hashes and registers the account in the database).*

* **Reset Password**:
  ```bash
  npm run admin:password
  ```
  *(Allows updating credentials for an existing administrator).*

---

## 🏗️ Architecture Layout

Features are encapsulated in cohesive business modules under `src/modules/`:
* `modules/entries`: Public submissions, anonymous reporting, and helpful vote tracking.
* `modules/moderation`: Moderation Engine and workflow pipeline that captures all state transitions.
* `modules/admin`: Dashboard metrics, review queue management, and action resolvers.
* `modules/auth`: Secure JWT creation, session verification, and bcrypt hashing logic.
* `modules/notifications`: Background template rendering and email dispatch.

---

## 🧪 Developer Commands

| Script | Action |
|---|---|
| `npm run dev` | Starts server with `tsx` hot reload |
| `npm run build` | Compiles TypeScript and resolves paths in `dist/` |
| `npm start` | Runs production built app from `dist/` |
| `npm test` | Runs the test suite via `Vitest` |
| `npm run lint` | Runs `ESLint` check on code style |
| `npm run format` | Standardizes codebase format with `Prettier` |
