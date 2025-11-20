## Purpose

Concise, actionable guidance for AI coding agents working in this repository (frontend + backend).

**Big picture**
- Backend: FastAPI app in `backend/app` (entry `backend/app/main.py`). MongoDB is the primary datastore; request handlers use the async `motor` client (`backend/app/database.py`). Background processing uses Celery + Redis with worker tasks under `backend/app/tasks/` (worker tasks intentionally use a sync `pymongo` client).
- Frontend: React + TypeScript + Vite (entry `frontend/src/main.tsx`). Network calls go through `frontend/src/utils/axios.ts` and the domain service layer in `frontend/src/services/*` (prefer these services over ad-hoc axios calls in components).
- Orchestration: `docker-compose.yml` runs backend, Celery worker, MongoDB and Redis for full-stack development.

**Data flow (short)**
- UI → `frontend/src/services/*` → `frontend/src/utils/axios.ts` → `backend/app/routes/*` → `backend/app/services/*` → `backend/app/database.py` → MongoDB.
- Background work: routes/services enqueue Celery tasks (`backend/app/tasks/*`) → worker reads/writes via `pymongo`.

**Key files & examples**
- `backend/app/config.py` — pydantic-backed env config; missing fields will raise on startup.
- `backend/app/database.py` — async `motor` client used by request handlers.
- `backend/app/tasks/id_card_task.py` — canonical Celery task; uses `pymongo` (sync).
- `frontend/src/utils/axios.ts` — central axios instance; implements token attach + single refresh then logout flow.
- `frontend/src/store/authStore.ts` — Zustand store that mirrors tokens to `localStorage`.

**Project-specific patterns & constraints**
- Keep the `motor` (async) vs `pymongo` (sync) split. Do not replace `pymongo` in Celery tasks with `motor` without re-evaluating worker lifecycle.
- Keep routes thin: move logic into `backend/app/services/*` to promote reuse and easier testing.
- Auth flow: Axios interceptor attempts exactly one refresh (`POST /auth/refresh`) and then logs out on failure — update both `frontend/src/utils/axios.ts` and `frontend/src/store/authStore.ts` together if changing this.
- Strict TypeScript: `tsconfig.json` uses `strict: true`; avoid `as any` and add/adjust types in services rather than components where possible.

**Developer workflows & useful commands**
- Full stack (recommended): from repo root

```
docker-compose up --build
```

- Backend only (local dev):

```
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Frontend only:

```
cd frontend
npm install
npm run dev
```

- Run Celery worker manually (backend venv):

```
cd backend
celery -A app.tasks.celery_app worker --loglevel=info
```

**Seeds & helpers**
- `backend/scripts/` contains utility scripts (e.g. `seed_admin.py`, `create_test_users.py`, `seed_geo_from_csv.py`) for seeding and repairing data.

**Common issues to watch for**
- Env mismatch: `docker-compose.yml` sets `VITE_API_URL` while frontend expects `VITE_API_BASE_URL` (`frontend/src/utils/axios.ts`). Prefer setting `VITE_API_BASE_URL=http://host.docker.internal:8000` or `http://localhost:8000` in `docker-compose.yml`.
- Hard-coded remote URLs and `console.log` calls in `vite.config.ts` and `frontend/src/utils/axios.ts` — gate logs with `import.meta.env.DEV` and replace remote fallbacks with env-driven defaults.
- Backup files (e.g., `.bak`, `frontend_backup/`) are present — avoid editing them; consider removing stale backups with project maintainers.

**Where to add changes (practical rules)**
- New REST endpoint: add under `backend/app/routes/` and implement business logic in `backend/app/services/`.
- New DB helper: add to `backend/app/services/*` and use `backend/app/database.py` for async access.
- New background job: add a Celery task under `backend/app/tasks/` and use `pymongo` inside the task to match existing worker patterns.

**Tips for AI agents (concise)**
- Read `backend/app/config.py` early — many env fields are required.
- Preserve async vs sync DB client boundaries; changing them is non-trivial.
- Update axios + auth store together when touching auth flows.
- Prefer modifying/adding services rather than spreading axios calls across components.

If you'd like, I can (A) apply the `VITE_API_BASE_URL` fix to `docker-compose.yml` and `frontend/src/utils/axios.ts`, (B) add a small `debug()` helper gated by `import.meta.env.DEV`, or (C) tighten types in a specific frontend page (recommend `CreateFarmer`/`FarmerRegistration`). Tell me which and I'll implement it.
## Purpose

Short, actionable guidance for AI coding agents working in this repository (frontend + backend).

**Big picture**
- Backend: FastAPI app in `backend/app` (entry `backend/app/main.py`). MongoDB is the primary datastore; request handlers use the async `motor` client (`backend/app/database.py`). Background processing uses Celery + Redis with worker tasks under `backend/app/tasks/` (those tasks intentionally use a sync `pymongo` client).
- Frontend: React + TypeScript + Vite (entry `frontend/src/main.tsx`). API surface is wrapped by `frontend/src/utils/axios.ts` and a small service layer in `frontend/src/services/*` (prefer these helpers over ad-hoc axios calls).
- Orchestration: `docker-compose.yml` defines services for backend, worker, mongo, redis, and an optional frontend container. Local development often uses `docker-compose up --build` for full stack or separate frontend/backend commands for focused work.

**Key files & entry points**
- `backend/app/main.py` — FastAPI app, middleware and CORS setup.
- `backend/app/config.py` & `backend/.env` — required environment variables and validation (many `Field(...)` declarations — missing values raise on startup).
- `backend/app/database.py` — `motor.AsyncIOMotorClient` for request handlers.
- `backend/app/tasks/` — Celery tasks; note `pymongo` use inside worker code (see `id_card_task.py`).
- `frontend/src/utils/axios.ts` — central axios instance, token handling and refresh flow (single automatic refresh then logout on failure).
- `frontend/src/services/*` — domain services (e.g. `farmer.service.ts`, `auth.service.ts`) that should be used by UI pages.

**Project-specific patterns & gotchas**
- Mixed DB clients: Keep request code async with `motor`. Celery workers use `pymongo` (sync) by design — do not swap to `motor` in worker tasks without adjusting Celery concurrency and lifecycle.
- Auth flow: Tokens are stored in a Zustand store (`frontend/src/store/authStore.ts`) and mirrored in `localStorage`. Axios interceptors read tokens and attempt one refresh via `POST /auth/refresh`. Do not break this contract when changing auth routes or token shapes.
- Service layer: Frontend pages call `authService`, `farmerService`, etc. Prefer adding/updating services over sprinkling axios logic across components.
- Strict TS config: `tsconfig.json` uses `strict: true`; avoid `as any` unless unavoidable — fix types in components like `FarmerRegistration` to reduce runtime surprises.

**Known issues (actionable)**
- Env name mismatch: `docker-compose.yml` uses `VITE_API_URL` but frontend expects `VITE_API_BASE_URL` (see `frontend/src/utils/axios.ts`). Preferred fix: set `VITE_API_BASE_URL=http://host.docker.internal:8000` (or `http://localhost:8000` for local dev) in `docker-compose.yml`.
- Hard-coded remote defaults: Replace fallback Github.dev URLs in `vite.config.ts` and `frontend/src/utils/axios.ts` with local defaults or env-driven values.
- Console debugging: Remove or gate `console.log` statements (common in `frontend/src/utils/axios.ts` and `vite.config.ts`) behind `import.meta.env.DEV`.
- Backup files: `.bak` files and `frontend_backup/` exist in the repo — these should not be edited; consider removing them to avoid confusion.

**Developer workflows & commands**
- Full stack (recommended):
  - From repo root:
    - `docker-compose up --build`
  - This runs uvicorn backend, Celery worker, MongoDB and Redis. Backend reads `backend/.env` for configuration.
- Frontend only:
  - `cd frontend`
  - `npm install`
  - `npm run dev`
- Backend only:
  - `cd backend`
  - `python -m pip install -r requirements.txt`
  - `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- Quick test / utilities: repository contains helper scripts under `backend/scripts/` (e.g., `seed_admin.py`, `create_test_users.py`). Use them to seed data for local testing.

**Editing guidance & safe changes**
- When editing backend env-driven code, inspect `backend/app/config.py` first — many fields are required and missing values will break startup.
- For new background jobs: add tasks under `backend/app/tasks/` and follow the existing pattern of using a sync `pymongo` client inside Celery workers.
- Frontend changes: prefer updating a service in `frontend/src/services/*` instead of altering multiple components; keep axios interceptor behavior intact (refresh then logout) unless you update auth endpoints across backend and frontend together.

If you'd like, I can (A) apply the `VITE_API_BASE_URL` fix to `docker-compose.yml` and `frontend/src/utils/axios.ts`, (B) add a small `debug()` helper gated by `import.meta.env.DEV`, or (C) tighten types in specific frontend pages (suggest `FarmerRegistration` to start). Tell me which and I'll implement it.

check out the cropdetials.html and ZFMS.txt and maintain the ui of those files and you also the example.html (maintain ui of these files throughout the project)