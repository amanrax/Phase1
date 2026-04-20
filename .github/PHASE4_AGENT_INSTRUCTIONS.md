# CEM FARMER REGISTRATION SYSTEM
## PHASE 4 — AGENT INSTRUCTIONS
### Bug Fixes · Broken Flows · Inconsistencies · Data Integrity Repairs

> **ABSOLUTE RULE:** All work on `dev` branch ONLY. Never touch `main`. Never write to the production database. Never modify `auth.py`, `authStore.ts`, `security.py`, or `crypto_utils.py`. Before every file write: `git branch --show-current` must return `dev`.

---

## Document Overview

| Property | Value |
|---|---|
| Phase | 4 — Bug Fixes & Flow Repairs (post-testing) |
| Basis | Issues found across 806 test cases in all four testing specs |
| Priority System | P1 = blocking · P2 = important · P3 = polish |
| Rule | Complete each section fully before starting the next |
| Branch | `dev` only — confirmed with `git branch --show-current` |
| DB | dev MongoDB Atlas instance ONLY |
| Key constraint | `motor` (async) in FastAPI routes · `pymongo` (sync) in all Celery tasks — never mix |

---

## SECTION 0 — IDENTITY & ABSOLUTE CONSTRAINTS

### ✗ Never Touch — No Exceptions
- `main` branch — production is live with real farmers and operators
- Production MongoDB Atlas — zero cross-writes under any circumstances
- `auth.py` · `authStore.ts` · `security.py` · `crypto_utils.py` — locked files
- Existing API endpoint signatures — you may fix behaviour, never change the URL, method, or response shape
- `.env` files — never create, edit, commit, or log secrets

### ✓ Always Do
- Confirm git branch before every file write: `git branch --show-current` → must show `dev`
- Read the full function before editing it — never fix one path and break another
- Use `motor` (async) in all FastAPI route handlers for all DB operations
- Use `pymongo` (sync) in all Celery task functions — never `async def` in tasks
- After every fix: run the relevant API call manually and confirm the corrected behaviour
- Log every bug fix in your end-of-section report

### ⚠ Stop and Report If
- The fix requires changing an API response shape that the frontend already depends on
- The fix touches authentication, JWT handling, or session logic
- You find a second version of the same file — document both, ask which is canonical
- The root cause turns out to be a missing database index — report it, do not add indexes in production without approval

---

## SECTION 1 — PRIORITY ORDER

Fix each priority group completely and verify before starting the next.

| Priority | Bug / Flow Issue |
|---|---|
| **P1-A 🔴 CRITICAL** | Notification chain — events not firing or firing to wrong user |
| **P1-B 🔴 CRITICAL** | Change request approval — full farmer overwrite instead of field-only update |
| **P1-C 🔴 CRITICAL** | Operator scoping leak — pagination counts wrong even when visible records are correct |
| **P1-D 🔴 CRITICAL** | Celery ID card task — silent failure with no user-facing indicator |
| **P2-A 🟡 HIGH** | Document wallet re-upload — old GridFS file not deleted on replacement |
| **P2-B 🟡 HIGH** | Supply request — operator sees all farmers' requests instead of own only |
| **P2-C 🟡 HIGH** | Geo management — deleted entity still appears in registration dropdowns |
| **P2-D 🟡 HIGH** | QR scanner — permission dialog shown on every open not once per session |
| **P3-A 🟢 POLISH** | Dark mode — new pages missing `dark:` variants |
| **P3-B 🟢 POLISH** | Global toast — not shown on 500 errors from supply and change request routes |
| **P3-C 🟢 POLISH** | Skeleton loaders — missing on NotificationCentre and FarmerSupplyRequests |
| **P3-D 🟢 POLISH** | Pull-to-refresh — FarmerSupplyRequests and ChangeRequests not wired to usePullToRefresh |

---

## SECTION 2 — P1-A: NOTIFICATION CHAIN FIXES

### Known Missing Notification Events

| Bug # | Severity | Description | Root Cause | File(s) to Fix |
|---|---|---|---|---|
| BUG-001 | CRITICAL | Farmer re-uploads rejected doc — operator NOT notified | `create_notification` not called after upload endpoint completes | `routes/uploads.py` · `routes/verification.py` |
| BUG-002 | CRITICAL | ID card ready — farmer NOT notified after Celery task | `id_card_task.py` does not call notification service after PDF saved | `tasks/id_card_task.py` |
| BUG-003 | HIGH | Change request approved — farmer notification has wrong field name in message | `approved_by` field used in message template instead of `field_name` | `routes/change_requests.py` |
| BUG-004 | HIGH | Supply request fulfilled — farmer receives no notification | `supplies.py` missing `create_notification` call on `status=fulfilled` | `routes/supplies.py` |
| BUG-005 | HIGH | Document rejected — farmer notification fires but reason text is empty | Rejection reason fetched before DB write completes in async handler | `routes/verification.py` |
| BUG-006 | MEDIUM | Notification sent to wrong user on reassignment | Admin reassigns farmer — notification goes to old operator not new operator | `routes/operators.py` |

### Fix: BUG-001 — Re-upload → Operator notification

File: `backend/app/routes/uploads.py`

After the GridFS write is confirmed and `farmer.documents` is updated:

```python
await create_notification(
    db,
    user_id=farmer.operator_id,
    role="OPERATOR",
    type="document_reuploaded",
    message=f"Farmer {farmer.full_name} has re-uploaded documents for review.",
    metadata={"farmer_id": farmer.farmer_id, "document_type": doc_type}
)
```

- Import `create_notification` from the notifications service — check which file contains it first
- Must be fire-and-forget — do not block the upload response

### Fix: BUG-002 — ID card ready → Farmer notification

File: `backend/app/tasks/id_card_task.py` — Celery task — **use pymongo only, no motor**

```python
from app.database import get_sync_db
from datetime import datetime

db = get_sync_db()
notifications_col = db["notifications"]
notifications_col.insert_one({
    "user_id": farmer["user_id"],
    "role": "FARMER",
    "type": "id_card_ready",
    "read": False,
    "message": "Your ID card is ready. You can now download it from your dashboard.",
    "metadata": {"farmer_id": farmer_id},
    "created_at": datetime.utcnow()
})
```

> ⚠ This is a Celery task — synchronous pymongo insert, NOT async motor. Wrap in `try/except` — a notification failure must never cause the whole task to fail.

### Fix: BUG-005 — Rejection reason empty in notification

File: `backend/app/routes/verification.py`

```python
# WRONG — create_notification called before DB write
await create_notification(...)
await db.update_one({"_id": doc_id}, {"$set": {"status": "rejected", "rejection_reason": reason}})

# CORRECT — called after DB write, reason passed directly from request body
await db.update_one({"_id": doc_id}, {"$set": {"status": "rejected", "rejection_reason": reason}})
await create_notification(db, user_id=farmer.user_id, ..., message=f"Your document was rejected. Reason: {reason}")
```

### Acceptance Criteria — P1-A
1. Farmer re-uploads rejected NRC → operator receives notification within 5 seconds
2. Celery ID card task completes → farmer receives "ID card ready" notification
3. Change request approved → farmer notification message contains the correct field name
4. Supply request fulfilled → farmer receives fulfilled notification
5. Document rejected → farmer notification contains the rejection reason text
6. Farmer reassigned → new operator receives assignment notification (not old operator)

---

## SECTION 3 — P1-B: CHANGE REQUEST FIELD-ONLY UPDATE

| Bug # | Severity | Description | Root Cause | File(s) to Fix |
|---|---|---|---|---|
| BUG-007 | CRITICAL | Approving change request overwrites entire farmer record | PUT approve builds full farmer payload and sends `$set` with all fields | `routes/change_requests.py` |
| BUG-008 | HIGH | Approved change request `field_name` not validated against allowed list | Any `field_name` accepted including `nrc_number` and `farmer_id` | `routes/change_requests.py` |

### Fix: BUG-007 — Field-only update

File: `backend/app/routes/change_requests.py`

```python
# WRONG — overwrites entire document
farmer_data = await db.farmers.find_one({"farmer_id": cr["farmer_id"]})
farmer_data[cr["field_name"]] = cr["new_value"]
await db.farmers.update_one({"farmer_id": cr["farmer_id"]}, {"$set": farmer_data})

# CORRECT — updates only the changed field
await db.farmers.update_one(
    {"farmer_id": cr["farmer_id"]},
    {"$set": {cr["field_name"]: cr["new_value"], "updated_at": datetime.utcnow()}}
)
```

### Fix: BUG-008 — Field name allowlist

```python
ALLOWED_CHANGE_FIELDS = {
    "phone_number", "date_of_birth", "email", "address_village",
    "address_district", "address_province", "address_chiefdom",
    "crops", "livestock", "land_size"
}

if cr["field_name"] not in ALLOWED_CHANGE_FIELDS:
    raise HTTPException(
        status_code=400,
        detail=f"Field '{cr['field_name']}' cannot be changed via change request"
    )
```

> `farmer_id`, `nrc_number`, `first_name`, `last_name` must NEVER be updatable via change request.

### Acceptance Criteria — P1-B
1. Approve phone change request → only `phone_number` updated, all other fields unchanged
2. Approve DOB change request → only `date_of_birth` updated, crops array intact
3. Submit change request for `nrc_number` → 400 error: field not allowed
4. Submit change request for `farmer_id` → 400 error: field not allowed

---

## SECTION 4 — P1-C: OPERATOR SCOPING PAGINATION LEAK

| Bug # | Severity | Description | Root Cause | File(s) to Fix |
|---|---|---|---|---|
| BUG-009 | HIGH | GET /api/farmers returns correct records but wrong total count for operators | Count query missing `operator_id` filter | `routes/farmers.py` |
| BUG-010 | HIGH | GET /api/supplies operator scope — returns all supply requests | `supplies.py` list endpoint missing operator scoping | `routes/supplies.py` |
| BUG-011 | HIGH | GET /api/change-requests operator scope — returns all pending requests | `change_requests.py` missing `operator_id` filter | `routes/change_requests.py` |

### Fix: BUG-009 — Build filter once, use for both data and count

File: `backend/app/routes/farmers.py`

```python
# Build filter once
query_filter = {}
if current_user.role == "OPERATOR":
    query_filter["operator_id"] = current_user.user_id
if province:
    query_filter["address_province"] = province
if status:
    query_filter["verification_status"] = status
if search:
    query_filter["$or"] = [
        {"first_name": {"$regex": search, "$options": "i"}},
        {"nrc_number": {"$regex": search, "$options": "i"}}
    ]

# Both queries use the same filter
total = await db.farmers.count_documents(query_filter)
records = await db.farmers.find(query_filter).skip(skip).limit(limit).to_list(limit)
```

### Fix: BUG-010 and BUG-011 — Operator scoping via farmer_ids lookup

```python
if current_user.role == "OPERATOR":
    assigned = await db.farmers.find(
        {"operator_id": current_user.user_id}, {"farmer_id": 1}
    ).to_list(10000)
    farmer_ids = [f["farmer_id"] for f in assigned]
    query_filter["farmer_id"] = {"$in": farmer_ids}
```

### Acceptance Criteria — P1-C
1. Operator with 12 assigned farmers: GET /api/farmers returns `total=12`
2. Operator: GET /api/supplies returns only their assigned farmers' requests
3. Operator: GET /api/change-requests returns only their assigned farmers' requests
4. Admin: GET /api/farmers returns all farmers, total = full system count

---

## SECTION 5 — P1-D: CELERY TASK SILENT FAILURE

| Bug # | Severity | Description | Root Cause | File(s) to Fix |
|---|---|---|---|---|
| BUG-012 | CRITICAL | ID card task fails silently — download button stays broken | `id_card_task.py` max-retry exception not caught, no DB status update | `tasks/id_card_task.py` |
| BUG-013 | HIGH | Report task status endpoint returns PENDING forever after failure | `FAILURE` state not handled in status endpoint | `routes/reports.py` |
| BUG-014 | HIGH | Log cleanup task failure not logged | No `try/except` around delete operation | `tasks/log_cleanup_task.py` |

### Fix: BUG-012 — ID card task failure handling

```python
@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def generate_id_card(self, farmer_id):
    try:
        # ... existing generation code ...
    except Exception as exc:
        try:
            self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            db = get_sync_db()
            db.farmers.update_one(
                {"farmer_id": farmer_id},
                {"$set": {"id_card_status": "failed"}}
            )
            db.system_logs.insert_one({
                "level": "ERROR",
                "module": "id_card_task",
                "message": f"ID card generation failed for {farmer_id} after max retries",
                "farmer_id": farmer_id,
                "timestamp": datetime.utcnow()
            })
```

Frontend: In `FarmerIDCard.tsx` check `farmer.id_card_status === "failed"` and show error state.

### Fix: BUG-013 — Report task status endpoint

File: `backend/app/routes/reports.py`

```python
result = AsyncResult(task_id, app=celery_app)

if result.state == "PENDING":
    return {"state": "PENDING", "progress": 0}
elif result.state == "SUCCESS":
    return {"state": "SUCCESS", "download_url": result.get()["url"]}
elif result.state == "FAILURE":
    # This was the missing branch
    return {"state": "FAILURE", "error": "Report generation failed. Please try again."}
else:
    return {"state": result.state, "progress": result.info.get("progress", 0) if result.info else 0}
```

### Acceptance Criteria — P1-D
1. ID card task fails 3 times → farmer profile shows "ID card generation failed" error state
2. GET /api/reports/task/{id}/status → returns `state=FAILURE` with friendly error message
3. Frontend Download Report button shows error toast when `state=FAILURE` (not endless spinner)
4. All task failures logged to `system_logs` at ERROR level

---

## SECTION 6 — P2-A: GRIDFS ORPHAN FILES ON RE-UPLOAD

| Bug # | Severity | Description | Root Cause | File(s) to Fix |
|---|---|---|---|---|
| BUG-015 | HIGH | Re-upload does not delete old GridFS file | `gridfs_service.delete_file` not called before inserting new file | `routes/uploads.py` |
| BUG-016 | MEDIUM | `farmer.documents` array gets duplicate entries after re-upload | `$push` used instead of `$set` on matched document entry | `routes/uploads.py` |

### Fix: BUG-015 and BUG-016

File: `backend/app/routes/uploads.py`

```python
# Step 1: Get existing file_id before writing new file
existing_doc = next((d for d in farmer["documents"] if d["doc_type"] == doc_type), None)
old_file_id = existing_doc["file_id"] if existing_doc else None

# Step 2: Write new file to GridFS
new_file_id = await gridfs_service.store_file(db, file_data, filename, mime_type)

# Step 3: Delete old file AFTER new one is confirmed
if old_file_id:
    await gridfs_service.delete_file(db, old_file_id)

# Step 4: Update using $set on matched element — not $push
await db.farmers.update_one(
    {"farmer_id": farmer_id, "documents.doc_type": doc_type},
    {"$set": {
        "documents.$.file_id": new_file_id,
        "documents.$.status": "pending",
        "documents.$.rejection_reason": None,
        "documents.$.uploaded_at": datetime.utcnow()
    }}
)
# If no existing entry: use $push to add new entry
```

### Acceptance Criteria — P2-A
1. Farmer re-uploads rejected NRC → old GridFS file absent from `cem_files` bucket
2. `farmer.documents` has exactly 1 entry per `doc_type` after re-upload
3. Re-upload of a new `doc_type` → `$push` creates new entry correctly

---

## SECTION 7 — P2-B / P2-C / P2-D

### P2-B — Supply Request Operator Scoping

**BUG-017:** Operator sees all farmers' supply requests. Fix: backend scope enforcement from BUG-010. Confirm `FarmerSupplyRequests.tsx` is the farmer view and `AdminSupplyRequests.tsx` is admin-only. Operator supply requests are scoped by their token on the backend.

### P2-C — Geo Dropdowns Showing Deleted Entities

**BUG-018:** Soft-deleted provinces/districts still appear in dropdowns.

File: `backend/app/routes/geo.py` and `geo_custom.py`

```python
# Add is_active filter to ALL geo list endpoints
cursor = db.provinces.find({"is_active": True}, {"_id": 0})
cursor = db.districts.find({"is_active": True, "province_id": province_id}, {"_id": 0})
cursor = db.chiefdoms.find({"is_active": True, "district_id": district_id}, {"_id": 0})
```

> Admin geo management endpoints (`geo_admin.py`) must still return ALL records including inactive ones so admins can restore them.

### P2-D — QR Scanner Permission Dialog on Every Open

**BUG-019:** `permissionCache` Map must be declared at module scope, not inside the function.

File: `frontend/src/utils/permissions.ts`

```typescript
// CORRECT — module level (outside the function)
const permissionCache = new Map<string, boolean>();

export async function checkAndRequestPermission(type: PermissionType): Promise<boolean> {
    if (permissionCache.has(type)) return permissionCache.get(type)!;
    // ... check OS permission ...
    permissionCache.set(type, granted);
    return granted;
}
```

File: `frontend/src/pages/QRScanner.tsx` — must call `checkAndRequestPermission("camera")` NOT `Camera.requestPermissions()` directly.

### Acceptance Criteria — P2
- Operator token on GET /api/supplies returns only their assigned farmers' requests
- Soft-deleted province does not appear in farmer registration province dropdown
- Soft-deleted chiefdom still displays correctly on existing farmer profiles
- Open QR scanner, grant permission, close, reopen → native dialog NOT shown again

---

## SECTION 8 — P3: POLISH & CONSISTENCY

### P3-A — Dark Mode Missing on New Pages

| Bug # | Page | Issue |
|---|---|---|
| BUG-020 | FarmerDocumentWallet.tsx | Missing `dark:` variants on card backgrounds and badges |
| BUG-021 | FarmerSupplyRequests.tsx | Status badge using hardcoded `bg-green-100` not `dark:bg-green-900` |
| BUG-022 | NotificationCentre.tsx | Unread indicator invisible in dark mode |

**Patterns to apply:**
- Card backgrounds: `bg-white dark:bg-gray-800`
- Primary text: `text-gray-900 dark:text-white`
- Secondary text: `text-gray-500 dark:text-gray-400`
- Borders: `border-gray-200 dark:border-gray-700`

### P3-B — globalToast Not Fired on New Route Errors

**BUG-023:** File: `frontend/src/utils/axios.ts`

```typescript
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status >= 500) {
            globalToast.error("Something went wrong. Please try again.");
        }
        return Promise.reject(error);
    }
);
```

Confirm every service file (`changeRequests.service.ts`, `notifications.service.ts`) uses the shared `axiosInstance` — not a raw `import axios`.

### P3-C — Skeleton Loaders Missing

**BUG-024/025:** `NotificationCentre.tsx` and `FarmerSupplyRequests.tsx` — both have `isLoading` state but no skeleton rendered when `isLoading === true`. Add 3–5 skeleton rows with `animate-pulse` matching the height of real list items. Use `FarmersList.tsx` as the reference implementation.

### P3-D — Pull-to-Refresh Not Wired

**BUG-026/027:** `FarmerSupplyRequests.tsx` and `ChangeRequests.tsx`

```typescript
const { isRefreshing, pullToRefreshProps } = usePullToRefresh(fetchData);
// Pass pullToRefreshProps to the scroll container element
```

Use `FarmersList.tsx` as the reference implementation.

---

## SECTION 9 — ADDITIONAL INCONSISTENCIES

| Bug # | Severity | Description | Root Cause | File(s) to Fix |
|---|---|---|---|---|
| BUG-028 | HIGH | Save Status=verified does not trigger ID card generation | `verification.py` status endpoint missing Celery enqueue | `routes/verification.py` |
| BUG-029 | HIGH | Operator cannot revert farmer from verified to rejected even when needed | All status reversals blocked — should allow admin override | `routes/verification.py` |
| BUG-030 | MEDIUM | Crops Combobox stores last selection only — multi-select broken | `onChange` replaces entire crops value instead of appending | `Step3Farm.tsx` · `Combobox.tsx` |
| BUG-031 | MEDIUM | Analytics dashboard re-aggregates on every filter change even when cached | Cache key does not include province filter parameter | `services/analytics_service.py` |
| BUG-032 | MEDIUM | LogViewer auto-refresh continues after navigating away — memory leak | `useEffect` cleanup does not clear `setInterval` timer on unmount | `pages/LogViewer.tsx` |
| BUG-033 | LOW | Registration Step 4 preview shows raw NRC not formatted | `nrcFormatter.ts` not applied to preview display | `Step4Preview.tsx` · `nrcFormatter.ts` |
| BUG-034 | LOW | AdminGeoManagement inline add form does not clear after successful save | `state.newName` not reset after successful POST | `pages/AdminGeoManagement.tsx` |
| BUG-035 | LOW | SessionTimeoutModal hidden behind FarmerBottomNav on mobile | `FarmerBottomNav` has `z-50`; modal needs `z-60` or higher | `SessionTimeoutModal.tsx` |

### Key Fixes

**BUG-028** — After `status=verified` update in `verification.py`:
```python
if new_status == "verified":
    from app.tasks.id_card_task import generate_id_card
    generate_id_card.delay(farmer_id)
```

**BUG-030** — Crops multi-select in `EditFarmer.tsx` and `Step3Farm.tsx`:
```typescript
// WRONG
setCrops(newValue);

// CORRECT
setCrops(prev => [...(prev || []).filter(c => c !== newValue), newValue]);
```

**BUG-032** — LogViewer interval cleanup:
```typescript
useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval); // This cleanup MUST exist
}, [autoRefresh, fetchLogs]);
```

---

## SECTION 10 — CODING STANDARDS

### Backend
- ✓ All route functions: `async def` · all DB calls in routes: `await` with `motor`
- ✓ All Celery task functions: synchronous `def` · all DB calls: `pymongo`
- ✓ Every changed endpoint: manually test with curl or Postman on dev before marking done
- ✗ Never mix `motor` and `pymongo` in the same function
- ✗ Never re-save a full document when you only need to update one field — use `$set` with the specific key

### Frontend
- ✓ TypeScript strict mode — zero `any` types in files you touch
- ✓ All API calls through typed service files — never raw `axios` in components
- ✓ Every `useEffect` that creates a timer or subscription: must have a cleanup return function
- ✗ Never import `axios` directly in a component — always use the shared `axiosInstance`
- ✗ Never add `console.log` to committed code — use `logger.ts`

### Locked Files — Do Not Modify
- `backend/app/routes/auth.py`
- `backend/app/utils/security.py`
- `backend/app/utils/crypto_utils.py`
- `frontend/src/store/authStore.ts`
- `frontend/src/services/auth.service.ts`

---

## SECTION 11 — AGENT REPORTING FORMAT

After completing each section, produce a structured report with:

- **BUGS FIXED** — Bug number, file changed, one-line description of the fix
- **FILES MODIFIED** — path and summary of what changed
- **VERIFICATION** — how you confirmed each fix works (API call, UI action, or test)
- **SIDE EFFECTS CHECKED** — other flows that touch the same code — confirmed still working
- **BLOCKERS** — anything that needs a decision before proceeding
- **ACCEPTANCE CRITERIA STATUS** — pass / fail / partial for each item

> **FINAL REMINDER:** Phase 4 is repairing a live system. Every fix must be tested manually on dev before being marked complete. When fixing one bug — check if the same pattern exists in neighbouring files and fix those too.
