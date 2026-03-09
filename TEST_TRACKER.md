# CEM Farmer Module — Test Case Tracker
Credentials: Admin `cemadmin@gmail.com / Admin@2025` | Operator `aman@gmail.com / 12345678` | Farmer NRC `123456/12/1` / DOB `02-02-2000` (i.e. 2000-02-02)

---

## Legend
- ✅ PASS
- ❌ FAIL → being fixed
- ⏭️ SKIP (UI / mobile / Celery only — cannot be API-tested)
- 🔄 IN PROGRESS

---

## AREA 1 — Farmer Registration

| TC | Description | Status | Notes |
|----|-------------|--------|-------|
| TC-001 | Valid personal fields submitted → 201 + farmer_id | ✅ PASS | |
| TC-002 | NRC auto-formats live | ⏭️ SKIP | Frontend UI only |
| TC-003 | NRC wrong segment format rejected | ⏭️ SKIP | Frontend validation |
| TC-004 | NRC with letters rejected | ⏭️ SKIP | Frontend validation |
| TC-005 | Duplicate NRC → 409 | ✅ PASS | |
| TC-006 | Empty first name → error | ⏭️ SKIP | Frontend validation |
| TC-007 | Unicode name accepted | ✅ PASS | |
| TC-008 | DOB in future → rejected | ✅ PASS | |
| TC-009 | DOB > 120 years → rejected | ✅ PASS | |
| TC-010 | Ethnic group Combobox — existing | ⏭️ SKIP | Frontend UI |
| TC-011 | Ethnic group Combobox — custom new | ⏭️ SKIP | Frontend UI |
| TC-012 | Combobox keyboard nav | ⏭️ SKIP | Frontend UI |
| TC-013 | Cannot advance with validation errors | ⏭️ SKIP | Frontend UI |
| TC-014 | Step 1 data persists on Back | ⏭️ SKIP | Frontend UI |
| TC-015 | Hardware back on Step 1 | ⏭️ SKIP | Mobile only |
| TC-016 | Province→District→Chiefdom cascade | ✅ PASS | Geo endpoints work |
| TC-017 | District resets when province changes | ⏭️ SKIP | Frontend UI |
| TC-018 | GPS location capture (mobile) | ⏭️ SKIP | Capacitor/mobile |
| TC-019 | GPS permission denied | ⏭️ SKIP | Capacitor/mobile |
| TC-020 | GPS permanent deny | ⏭️ SKIP | Capacitor/mobile |
| TC-021 | GPS outside Zambia → warning | ⏭️ SKIP | Frontend logic |
| TC-022 | Deactivated chiefdom not shown | ✅ PASS | Soft-delete + cascade verified |
| TC-023 | Crops Combobox multi-select | ⏭️ SKIP | Frontend UI |
| TC-024 | Livestock Combobox + quantity | ⏭️ SKIP | Frontend UI |
| TC-025 | Custom crop persists globally | ⏭️ SKIP | Frontend UI |
| TC-026 | Land size zero → rejected | ✅ PASS | |
| TC-027 | Land size negative → rejected | ✅ PASS | |
| TC-028 | Land size decimal accepted | ✅ PASS | |
| TC-029 | Reference data endpoint for Combobox | ✅ PASS | /api/reference-data works |
| TC-030 | Step 4 preview shows all data | ⏭️ SKIP | Frontend UI |
| TC-031 | Edit link from preview → correct step | ⏭️ SKIP | Frontend UI |
| TC-032 | Valid JPG photo upload | ✅ PASS | |
| TC-033 | Photo over 10MB rejected | ✅ PASS | Returns 400/413 |
| TC-034 | PDF as photo → rejected | ✅ PASS | |
| TC-035 | MIME check server-side | ✅ PASS | |
| TC-036 | Camera capture on mobile | ⏭️ SKIP | Capacitor/mobile |
| TC-037 | Camera permission one-time | ⏭️ SKIP | Capacitor/mobile |
| TC-038 | Camera permission permanent deny | ⏭️ SKIP | Capacitor/mobile |
| TC-039 | Valid NRC document upload (PDF) | ✅ PASS | |
| TC-040 | Unsupported file type (.exe) → rejected | ✅ PASS | |
| TC-041 | File access permission one-time | ⏭️ SKIP | Capacitor/mobile |
| TC-042 | Duplicate submission idempotency | ✅ PASS | |
| TC-043 | farmer_id = ZM + 8 hex chars | ✅ PASS | |
| TC-044 | Vibration on completion | ⏭️ SKIP | Capacitor/mobile |
| TC-045 | Draft saved on app close | ⏭️ SKIP | Mobile only |
| TC-046 | Pull-to-refresh on FarmersList | ⏭️ SKIP | Mobile only |

---

## AREA 2 — Edit Farmer

| TC | Description | Status | Notes |
|----|-------------|--------|-------|
| TC-047 | Edit form pre-populates every field | ⏭️ SKIP | Frontend UI |
| TC-048 | Edit NRC to unique value → saved | ✅ PASS | |
| TC-049 | Edit NRC to duplicate → 409 | ❌ FAIL | PUT returns 200 instead of 409 |
| TC-050 | Clear required field → blocked | ⏭️ SKIP | Frontend validation |
| TC-051 | Edit crops with Combobox | ⏭️ SKIP | Frontend UI |
| TC-052 | Operator edits own farmer | ✅ PASS | |
| TC-053 | Operator cannot edit unassigned → 403 | ❌ FAIL | Returns 200 (RBAC bug) |
| TC-054 | Admin edits any farmer | ✅ PASS | |
| TC-059 | Cancel edit discards changes | ⏭️ SKIP | Frontend UI |
| TC-060 | Concurrent edit — last write wins | ⏭️ SKIP | Concurrency test |

---

## AREA 7 — Farmer Details View

| TC | Description | Status | Notes |
|----|-------------|--------|-------|
| TC-141 | All fields displayed correctly | ✅ PASS | |
| TC-142 | Farmer photo loads from GridFS | ❌ FAIL | s=0 — non-JSON response not handled |
| TC-143 | No photo → placeholder | ✅ PASS | |
| TC-144 | QR code displayed | ❌ FAIL | s=0 — returns PNG binary; test fix needed |
| TC-145 | QR not generated — button shown | ✅ PASS | |
| TC-146 | Document list shown | ✅ PASS | Fixed: `docs_dict = farmer.get("documents") or {}` in verification_service.py |
| TC-147 | Verification status badge correct | ✅ PASS | |
| TC-148 | Operator only sees own farmers → 403 | ❌ FAIL | Returns 200 (RBAC bug in backend) |
| TC-149 | Farmer only sees own profile → 403 | ✅ PASS | |
| TC-150 | Unauthenticated → 401/403 | ✅ PASS | |
| TC-151 | ID card download | ❌ FAIL | s=0 — non-JSON response |

---

## AREA 9 — Farmer CRUD API

| TC | Description | Status | Notes |
|----|-------------|--------|-------|
| TC-171 | Valid payload → 201 | ✅ PASS | |
| TC-172 | Missing first_name → 422 | ✅ PASS | |
| TC-173 | Invalid NRC → 400/422 | ✅ PASS | |
| TC-174 | Duplicate NRC → 409 | ✅ PASS | |
| TC-175 | No auth → 401/403 | ✅ PASS | |
| TC-176 | Farmer role → 403 | ✅ PASS | |
| TC-177 | NoSQL injection → 422 | ✅ PASS | |
| TC-178 | XSS in name → stored escaped | ✅ PASS | |
| TC-179 | Concurrent identical → one record | ⏭️ SKIP | Concurrency test |
| TC-180 | Admin gets all farmers | ✅ PASS | |
| TC-181 | Operator gets only assigned | ✅ PASS | |
| TC-182 | Pagination | ✅ PASS | |
| TC-183 | Filter by province | ✅ PASS | |
| TC-184 | Filter by status | ✅ PASS | |
| TC-185 | Search by name | ✅ PASS | |
| TC-186 | Search with injection | ✅ PASS | |
| TC-187 | No password_hash in response | ✅ PASS | |
| TC-188 | GET valid farmer_id → 200 | ✅ PASS | |
| TC-189 | GET non-existent → 404 | ✅ PASS | |
| TC-190 | PUT partial update → 200 | ✅ PASS | |
| TC-191 | PUT NRC duplicate → 409 | ❌ FAIL | Returns 200 — backend not checking |
| TC-192 | DELETE admin soft-delete → 200 | ✅ PASS | |
| TC-193 | DELETE operator → 403 | ✅ PASS | |
| TC-194 | Deleted farmer absent from list | ✅ PASS | |
| TC-199 | Photo stored in GridFS | ❌ FAIL | s=422 — multipart form wrong boundary |
| TC-200 | Photo retrievable | 🔄 BLOCKED | Depends on TC-199 |
| TC-201 | Old photo deleted from GridFS | ⏭️ SKIP | GridFS cleanup |
| TC-202 | Unauthenticated photo → 401 | 🔄 BLOCKED | Depends on TC-199 |
| TC-203 | 15MB file blocked | ✅ PASS | |
| TC-204 | MIME check server-side | ✅ PASS | |
| TC-205 | Concurrent uploads no cross-link | ⏭️ SKIP | Concurrency |

---

## AREA 10 — Farmer List / Search

| TC | Description | Status | Notes |
|----|-------------|--------|-------|
| TC-209 | Skeleton loader then data | ⏭️ SKIP | Frontend UI |
| TC-210 | Pagination navigate pages | ✅ PASS | |
| TC-211 | Search by full name | ✅ PASS | |
| TC-212 | Search by NRC | ✅ PASS | |
| TC-213 | Filter province + status combined | ✅ PASS | |
| TC-214 | Clear filters resets list | ⏭️ SKIP | Frontend UI |
| TC-215 | Empty search result | ✅ PASS | |
| TC-218 | Search injection string | ✅ PASS | |

---

## AREA 11 — Logging

| TC | Description | Status | Notes |
|----|-------------|--------|-------|
| TC-234 | Log viewer accessible to admin | ✅ PASS | |
| TC-235 | Log viewer blocked for non-admin → 403 | ✅ PASS | |

---

## AREA 14 — Security

| TC | Description | Status | Notes |
|----|-------------|--------|-------|
| TC-276 | SQL injection in search → no error | ✅ PASS | |
| TC-277 | NoSQL injection in POST → rejected | ✅ PASS | |
| TC-278 | JWT from operator A → operator B's farmer → 403 | ❌ FAIL | Returns 200 (RBAC bug) |
| TC-279 | Tampered JWT → 401 | ✅ PASS | |
| TC-280 | Expired JWT → 401 | ✅ PASS | |
| TC-281 | GridFS direct access without auth → 401 | ✅ PASS | |
| TC-282 | Path traversal in filename | ✅ PASS | |

---

## Summary

| Category | Count |
|----------|-------|
| ✅ PASS | 57 |
| ❌ FAIL (to fix) | 8 |
| 🔄 BLOCKED | 2 |
| ⏭️ SKIP (UI/mobile) | 35 |
| **Total in doc** | **102** |

---

## Fix Queue (working one by one)

1. **TC-146** — `GET /farmers/{id}/documents` returns 500 → find backend bug
2. **TC-148 / TC-278 / TC-053** — RBAC: operator can access other operator's farmers
3. **TC-191** — PUT with duplicate NRC returns 200 instead of 409
4. **TC-199 / TC-200 / TC-202** — Photo upload returns 422 (multipart issue)
5. **TC-142** — Photo from GridFS: test fix (non-JSON binary response)
6. **TC-144** — QR endpoint: test fix (non-JSON binary response)
7. **TC-151** — ID card download: test fix (non-JSON PDF response)
8. **TC-049** — PUT NRC duplicate returns 200 (same as TC-191)
