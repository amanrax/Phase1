# PHASE 2 AGENT INSTRUCTIONS
## Zambian Farmer Registration System — CEM
### For: AI Coding Agent | Branch: `dev` only

---

## 0. IDENTITY & ABSOLUTE RULES

You are a senior full-stack engineer completing Phase 2 of a **live production system**.
Real users exist. Real data exists. You are working on `dev` branch only.

### NEVER TOUCH — NO EXCEPTIONS:
- `main` branch (production — live users)
- Production MongoDB Atlas database
- Existing auth/login routes (`auth.py`, `auth.service.ts`, `authStore.ts`)
- Existing token handling (`security.py`, `crypto_utils.py`)
- Existing API endpoint behavior (you may ADD endpoints, never CHANGE existing ones)
- Database schemas without explicit approval
- `.env` files — never create, edit, or commit them

### ALWAYS:
- Work on `dev` branch only
- Use environment variables — never hardcode IPs, URIs, secrets, or keys
- Confirm your branch before any file write: `git branch --show-current`
- Preserve all existing functionality — if a change risks breaking anything, STOP and document the risk instead of proceeding
- Use `motor` (async) for all FastAPI routes
- Use `pymongo` (sync) for all Celery tasks
- Never mix async and sync DB clients

### STOP AND REPORT (do not proceed) if:
- Any change touches authentication, sessions, or token logic
- A schema migration is needed
- You are unsure whether a change will break existing functionality
- You encounter two files that appear to do the same thing (e.g., `EditFarmer.tsx` vs `FarmerEdit.tsx`)

---

## 1. TECH STACK — AUTHORITATIVE REFERENCE

| Layer | Technology |
|---|---|
| Backend | FastAPI, Python 3.11+ |
| DB (async) | MongoDB Atlas via `motor` |
| DB (sync/tasks) | MongoDB Atlas via `pymongo` |
| File storage | GridFS |
| Cache | Redis |
| Background jobs | Celery |
| Frontend | React 18, TypeScript strict mode |
| Build | Vite |
| Styling | Tailwind CSS only — zero inline styles |
| State | Zustand |
| Mobile | Capacitor (Android + iOS) |
| CI/CD | GitHub Actions |
| Hosting | AWS EC2 |

---

## 2. PROJECT STRUCTURE — WHAT EXISTS

Before writing any new file, check whether it already exists. Key existing files:

### Backend (already exists — complete or audit, do not duplicate):
```
backend/app/routes/reports.py          ← complete this
backend/app/routes/farmer_reports.py   ← audit vs reports.py, document finding
backend/app/routes/dashboard.py        ← add aggregation + caching
backend/app/routes/farmers_qr.py       ← audit/complete verify endpoint
backend/app/services/report_service.py ← complete PDF + Excel logic
backend/app/services/logging_service.py← audit completeness
backend/app/middleware/logging_middleware.py ← audit completeness
backend/app/tasks/log_cleanup_task.py  ← audit 7-day schedule
```

### Backend (does NOT exist — create these):
```
backend/app/services/analytics_service.py  ← NEW — aggregation pipelines
```

### Frontend (already exists — complete or audit):
```
frontend/src/pages/AdminReports.tsx         ← complete UI
frontend/src/pages/AnalyticsDashboard.tsx   ← complete UI + wire charts
frontend/src/contexts/ThemeContext.tsx      ← complete dark mode toggle
frontend/src/utils/nrcFormatter.ts          ← audit NRC auto-format
frontend/src/components/PhoneInput.tsx      ← audit +260 default
frontend/src/tailwind.config.js             ← add darkMode: 'class'
```

### Frontend (does NOT exist — create these):
```
frontend/src/services/reports.service.ts    ← NEW — report API calls
frontend/src/services/analytics.service.ts ← NEW — analytics API calls
frontend/src/pages/QRScanner.tsx            ← NEW — Capacitor barcode scanner
```

---

## 3. PRIORITY ORDER — EXECUTE IN THIS SEQUENCE

### PRIORITY 1 — REPORTS 📊

**Backend tasks:**

1. Audit `reports.py` vs `farmer_reports.py` — document what each does, then complete without duplicating logic
2. Complete `report_service.py` using:
   - PDF: `reportlab` (not weasyprint)
   - Excel: `openpyxl`
3. Farmer PDF report must include: personal details, contact info, NRC, farm details (land/crops/livestock), operator mapping, photo (from GridFS), documents list, ID card, embedded QR code
4. Operator PDF report must include: operator profile, assigned regions/districts, list of farmers, activity metrics
5. Summary report (admin only): total farmers, total operators, farmers by region, farmers by operator, crops by region
6. Excel versions of all three reports with same data, clean column headers
7. Heavy report generation → offload to Celery task, return task ID immediately, poll for completion
8. All report endpoints require authentication — respect existing role middleware in `roles.py`

**Frontend tasks:**

1. Create `frontend/src/services/reports.service.ts` — typed API calls for all report endpoints
2. Complete `AdminReports.tsx`:
   - Download PDF button per report type
   - Download Excel button per report type
   - Loading spinner during generation (non-blocking — do not freeze UI)
   - Error state with user-friendly message
   - Polling logic for Celery task completion
   - No empty states — show skeleton loaders while loading

---

### PRIORITY 2 — ANALYTICS DASHBOARD 📈

**Backend tasks:**

1. Create `backend/app/services/analytics_service.py` with MongoDB aggregation pipelines for:
   - Total farmers count
   - Total operators count
   - Farmers by province
   - Farmers by operator
   - Crops by region (from farmers collection farm data)
   - Livestock distribution
   - Monthly registration trends (group by `created_at` month)
2. Enhance `dashboard.py` to call `analytics_service.py`
3. Cache expensive aggregation results in Redis — use key prefix `analytics:` with 15-minute TTL
4. All aggregations use `motor` (async) — never `pymongo` in route handlers

**Frontend tasks:**

1. Create `frontend/src/services/analytics.service.ts` — typed API calls
2. Complete `AnalyticsDashboard.tsx`:
   - Use `recharts` for all charts (already in React ecosystem)
   - Chart types: bar chart (farmers by region), pie chart (crops), line chart (monthly trends)
   - Filters: date range picker, province selector, operator selector
   - Mobile-first responsive layout
   - Skeleton loaders on every chart while data loads
   - All Tailwind classes only — no inline styles

---

### PRIORITY 3 — DARK MODE 🌙

**Rules:**
- Tailwind `darkMode: 'class'` only — add to `tailwind.config.js`
- Toggle lives in Settings page — add if not already there
- Persist preference in `localStorage` AND in user profile via API if endpoint exists
- WCAG-AA contrast on all dark variants
- Use `ThemeContext.tsx` (already exists) — complete it

**Tasks:**

1. Add `darkMode: 'class'` to `tailwind.config.js`
2. Complete `ThemeContext.tsx`:
   - `useTheme()` hook
   - Toggle function
   - Read from `localStorage` on init
   - Apply `dark` class to `<html>` element
3. Add `dark:` variants to every component in `frontend/src/components/ui/`:
   - `Card.tsx`, `Button.tsx`, `FormInput.tsx`, `FormSelect.tsx`, `Table.tsx`, `StatCard.tsx`, `Badge.tsx`, `Sidebar.tsx`, `TopBar.tsx`, `DashboardLayout.tsx`
4. Add dark variants to all pages touched during Phase 2
5. Add theme toggle to `AdminSettings.tsx`

---

### PRIORITY 4 — LOGGING 📝

**Backend — audit and complete `logging_middleware.py`:**

Required log fields per request:
```
[TIMESTAMP] [LEVEL] [module.method] [user_id:role] [METHOD /path] [status_code] [response_time_ms]
```

On exception, also log full stack trace at ERROR level.

Retention: 7 days — verify `log_cleanup_task.py` runs as a Celery beat task daily.

Log collection name in MongoDB: `system_logs` (already exists in backup — do not rename).

**Mobile logging — add to frontend:**

Create `frontend/src/utils/logger.ts` (already exists — audit and complete):
- Log file location: `/Android/data/zm.gov.agri.cem/files/logs/YYYY-MM-DD.log`
- One file per day
- Keep last 7 days, delete older on app startup
- Levels: DEBUG, INFO, WARN, ERROR, CRITICAL
- Use Capacitor Filesystem plugin for writes

---

### PRIORITY 5 — FORM FIXES 📝

**NRC Formatting:**

`nrcFormatter.ts` already exists — audit it. Required behavior:
- User types digits only
- Display formats as: `______/___/__`  (6 digits / 2 digits / 1 digit)
- Example: typing `123456781` → displays `123456/78/1`
- Apply to: Login form, Registration Step 1, any edit form with NRC field
- Backend validation must accept the formatted string

**Phone Number:**

`PhoneInput.tsx` already exists — audit it. Required behavior:
- Default country: Zambia (+260)
- User can optionally change country
- Store full E.164 format in DB: `+260XXXXXXXXX`

**Edit Forms — CRITICAL:**

Both `EditFarmer.tsx` and `FarmerEdit.tsx` exist. Before touching either:
1. Check `App.tsx` router to identify which is actively routed
2. Document which file is active and which is dead code — report this finding
3. On the active edit form:
   - All fields must be pre-populated using `useEffect` on component mount
   - Fetch farmer data from API on mount, hydrate all form state
   - Never render an empty edit form
   - Show skeleton loader while fetching, not an empty form

---

### PRIORITY 6 — QR VERIFICATION 📷

**Backend — audit `farmers_qr.py`:**

Required endpoint (add if missing):
```
GET /api/farmers/verify-qr/{farmer_id}
```
- Public endpoint (no auth required) — returns safe public summary only
- Response: `{ farmer_id, name, nrc, district, province, photo_url, registered_date, operator_name }`
- Do NOT expose internal IDs, operator contact info, or documents

In-app endpoint (auth required):
```
GET /api/farmers/{farmer_id}  ← already exists, do not modify
```

**Frontend — create `QRScanner.tsx`:**

- Use `@capacitor-community/barcode-scanner` plugin
- Request camera permission before scanning — show `PermissionRequest` component (already exists) if denied
- On scan result:
  - If user is authenticated → navigate to full farmer profile: `FarmerDetails.tsx`
  - If user is not authenticated → show public summary from verify-qr endpoint
- Handle: invalid QR, network error, farmer not found (404)
- Add QR scanner route to `App.tsx` router

---

### PRIORITY 7 — ERROR HANDLING ⚠️

**Backend:**
- Global exception handler in `main.py` — return user-friendly JSON, log full detail internally
- Never expose stack traces in API responses
- Standard error response shape: `{ "error": true, "message": "...", "code": "ERROR_CODE" }`

**Frontend — audit `axios.ts`:**
- Interceptors must handle:
  - `401` → clear auth store, redirect to login, show toast: "Session expired. Please log in again."
  - `403` → show toast: "Access denied."
  - `404` → show toast: "Resource not found."
  - `500` → show toast: "Something went wrong. Please try again."
- `ErrorBoundary.tsx` already exists — ensure it wraps all page-level routes in `App.tsx`
- `ToastContainer.tsx` already exists — ensure it is mounted at app root

---

## 4. CODING STANDARDS — ENFORCE ON EVERY FILE

### Backend:
- All route functions are `async def`
- All DB calls use `await` with `motor`
- Celery tasks use `pymongo` — synchronous, no `async def`
- Pydantic models for all request bodies and responses
- No raw `dict` responses — always typed response models
- Every new route must be registered in `main.py`
- No print statements — use logging only

### Frontend:
- TypeScript strict mode — no `any` types
- All API calls go through a service file — never raw `axios` in components
- All styling via Tailwind classes only — zero inline `style={{}}` props
- Zustand for global state — no prop drilling
- `useEffect` cleanup functions where applicable
- Skeleton loaders on every async data fetch — never a blank screen
- No `console.log` in committed code — use `logger.ts`

### General:
- No new dependencies without listing them and the reason
- Every new file must have a one-line comment at the top stating its purpose
- Do not modify any file in `backend/app/routes/auth.py` or `frontend/src/store/authStore.ts` — these are locked

---

## 5. DATABASE COLLECTIONS — READ-ONLY REFERENCE

From `mongo_backup_prod/zambian_farmer_db/`:

| Collection | Purpose |
|---|---|
| `farmers` | Core farmer records |
| `operators` | Operator profiles |
| `users` | Auth users |
| `provinces` | Geo reference |
| `districts` | Geo reference |
| `chiefdoms` | Geo reference |
| `ethnic_groups` | Reference data |
| `supply_requests` | Farmer supply requests |
| `system_logs` | Application logs |
| `cem_files.files` / `cem_files.chunks` | GridFS — photos, docs, ID cards, QR |

**Never drop, rename, or restructure any collection without approval.**
**Development DB must be a separate Atlas instance** — same schema, zero cross-writes with prod.

---

## 6. REQUIRED INDEXES — ADD IF MISSING

Check and add these indexes on the development DB only:

```python
# farmers collection
{ "farmer_id": 1 }        # unique
{ "nrc_number": 1 }       # unique
{ "phone_number": 1 }
{ "created_at": -1 }
{ "operator_id": 1 }
{ "district": 1 }
{ "province": 1 }

# operators collection
{ "operator_id": 1 }      # unique
{ "district": 1 }
{ "province": 1 }
```

---

## 7. VERSIONING

- Current version: Phase 2 → `2.0.0`
- Update version in `frontend/src/utils/version.ts`
- Display version string in `AdminSettings.tsx`
- Use semantic versioning for subsequent changes

---

## 8. BEFORE YOU START ANY TASK — CHECKLIST

Run through this before writing any code:

```
[ ] git branch --show-current  →  must show 'dev'
[ ] Does the file I'm about to create already exist?
[ ] Am I using motor (async) in this route? If it's a Celery task, pymongo (sync)?
[ ] Does this change touch auth, login, or token logic? → STOP if yes
[ ] Am I hardcoding any URL, IP, secret, or connection string? → remove it
[ ] Will this break any existing endpoint or UI flow?
[ ] Have I added the route to main.py (backend) or App.tsx router (frontend)?
[ ] Are there TypeScript errors in strict mode?
[ ] Did I remove all console.log / print statements?
```

---

## 9. WHAT DONE LOOKS LIKE — ACCEPTANCE CRITERIA

### Reports ✅
- PDF downloads work for farmer, operator, and summary reports
- Excel downloads work for all three
- Heavy reports run via Celery — UI is non-blocking
- Farmer PDF includes photo fetched from GridFS
- Reports are role-gated (admin sees all, operator sees own farmers)

### Analytics ✅
- Dashboard shows all 7 metrics with live data
- Charts render correctly on mobile (375px width minimum)
- Filters (date, province, operator) update charts in real-time
- Redis caching confirmed working (second request faster, TTL 15 min)

### Dark Mode ✅
- Toggle in Settings persists across sessions via localStorage
- All UI components have correct dark variants
- WCAG-AA contrast verified on dark backgrounds

### Logging ✅
- Every API request logged with: timestamp, level, module, user, method, path, status, duration
- Exceptions log full stack trace
- Log cleanup Celery task runs daily, removes logs older than 7 days
- Mobile logs write to correct path, clean up on startup

### Form Fixes ✅
- NRC formats as `123456/78/1` on every form that has an NRC field
- Phone defaults to +260
- Edit forms pre-populate all fields on mount — never empty

### QR Verification ✅
- `GET /api/farmers/verify-qr/{farmer_id}` returns public summary (no auth)
- In-app scanner navigates to full profile when authenticated
- Camera permission handled gracefully

### Error Handling ✅
- 401/403/404/500 all show correct toast messages
- No stack traces ever returned in API responses
- ErrorBoundary wraps all routes

---

## 10. REPORTING BACK

After completing each priority block, produce a summary with:
1. Files created (path + one-line description)
2. Files modified (path + what changed)
3. Files audited but NOT changed (path + why no change was needed)
4. Any risks or blockers found
5. Any ambiguities resolved and how

Do NOT move to the next priority until the current one passes its acceptance criteria.