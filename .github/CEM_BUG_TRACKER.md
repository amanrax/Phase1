# CEM FARMER REGISTRATION SYSTEM
## BUG TRACKER & FIX PRIORITY REGISTER
### UI Alignment · Layout · Forms · Data Loading · Flow Inconsistencies · Pre-population

> Fix bugs in P1 → P2 → P3 order. Never skip to P3 while P1 bugs are open. The Phase 4 Agent Instructions doc covers backend logic bugs separately — this doc covers what you see on screen.

---

## Summary

| Category | Count |
|---|---|
| Total Bugs Tracked | 35 |
| P1 Critical | 12 |
| P2 High | 14 |
| P3 Polish | 9 |
| Screens Affected | 8 |
| Status | OPEN |

---

## MASTER BUG LIST — ALL SCREENS

| Bug # | Screen | Type | Issue Observed | Root Cause | File to Fix | P | Status |
|---|---|---|---|---|---|---|---|
| B-001 | FarmerDetails | UI/Layout | Verification panel collapses on page load instead of expanding when navigated from QR scan | `autoScroll` and `defaultOpen` props not passed from QRScanner navigation state | `FarmerDetails.tsx` | P1 | OPEN |
| B-002 | FarmerDetails | Form | Approve/Reject buttons submit but UI does not update — status badge stays stale after action | No optimistic update; component does not re-fetch after mutation resolves | `FarmerDetails.tsx` · `verification.service.ts` | P1 | OPEN |
| B-003 | FarmerDetails | Data | Audit trail section shows "No history" even after multiple status changes | Audit log fetched from wrong endpoint or wrong `farmer_id` passed in query | `FarmerDetails.tsx` · `verification.service.ts` | P1 | OPEN |
| B-004 | FarmerDetails | UI/Layout | Document thumbnails overflow their card container on small screens | `img` has no `max-w` or `object-fit` constraint | `FarmerDetails.tsx` | P2 | OPEN |
| B-005 | FarmerDetails | Data | Crops and livestock show as empty arrays even when data exists in DB | API response uses `crop_types` but frontend maps `crops` — field name mismatch | `FarmerDetails.tsx` · `farmer.service.ts` | P1 | OPEN |
| B-006 | FarmerDetails | UI/Layout | Rejection reason input box too narrow on mobile — text clips after ~20 chars | Textarea has fixed width not `w-full` | `FarmerDetails.tsx` | P2 | OPEN |
| B-007 | FarmerDetails | Flow | Generate QR button visible to farmer role — should be operator/admin only | Role check missing on Generate QR button render condition | `FarmerDetails.tsx` · `permissions.ts` | P1 | OPEN |
| B-008 | DocumentWallet | Data | All documents show status "Pending" regardless of actual status in DB | Badge reads `doc.status` but DB field is `doc.verification_status` — key mismatch | `FarmerDocumentWallet.tsx` | P1 | OPEN |
| B-009 | DocumentWallet | UI/Layout | Re-upload button appears on verified documents | Condition checks `doc.status` which is always "Pending" due to B-008 — both linked | `FarmerDocumentWallet.tsx` | P1 | OPEN |
| B-010 | DocumentWallet | UI/Layout | PDF icon missing — broken image shown for PDF documents | File type check uses `filename.endsWith(".pdf")` but GridFS filename has no extension — use `doc.mime_type` | `FarmerDocumentWallet.tsx` | P2 | OPEN |
| B-011 | DocumentWallet | Flow | Document download opens blank tab instead of downloading | Link `href` points to `/api/files/{id}` without auth header — gets silent 401 | `FarmerDocumentWallet.tsx` · `files.py` | P1 | OPEN |
| B-012 | DocumentWallet | UI/Layout | Empty state not shown when farmer has 0 documents — blank white section rendered | `documents.length` check missing before conditional render | `FarmerDocumentWallet.tsx` | P2 | OPEN |
| B-013 | DocumentWallet | UI/Layout | Card layout breaks at ~375px width — action buttons stack awkwardly | `flex-row` used without `flex-wrap` or responsive breakpoint | `FarmerDocumentWallet.tsx` | P3 | OPEN |
| B-014 | OperatorEdit | Form | Edit form does not pre-populate — all fields blank when opening | `operator_id` from route param is string; DB stores differently — type mismatch | `OperatorEdit.tsx` · `operators.py` | P1 | OPEN |
| B-015 | OperatorEdit | Form | Saving edit form with unchanged fields sends empty object to API — clears optional fields | Form only collects dirty fields but sends `{}` if nothing changed | `OperatorEdit.tsx` | P1 | OPEN |
| B-016 | OperatorEdit | UI/Layout | District dropdown not filtered by province — shows all districts | `GeoSelectWithOther` not passed `province` value as prop | `OperatorEdit.tsx` · `GeoSelectWithOther.tsx` | P2 | OPEN |
| B-017 | OperatorEdit | Flow | Save button always active even when no changes made | `isDirty` state never set to true — dirty tracking not implemented | `OperatorEdit.tsx` | P3 | OPEN |
| B-018 | FarmerReview | Form | EditFarmer form does not pre-populate when opened from FarmerDetails Edit button | Navigation passes `farmer_id` but EditFarmer fetches fresh — race condition loses data | `EditFarmer.tsx` · `farmer.service.ts` | P1 | OPEN |
| B-019 | FarmerReview | Form | Crops Combobox shows only last selected crop — multi-select broken | `onChange` replaces entire crops value instead of appending to array | `EditFarmer.tsx` · `Combobox.tsx` | P1 | OPEN |
| B-020 | FarmerReview | UI/Layout | Province → District cascade does not reset district when province changes | `GeoSelectWithOther` `onProvinceChange` not clearing district state | `EditFarmer.tsx` · `GeoSelectWithOther.tsx` | P2 | OPEN |
| B-021 | FarmerReview | Flow | Cancel button navigates to dashboard instead of back to FarmerDetails | `navigate("/dashboard")` hardcoded — should be `navigate(-1)` | `EditFarmer.tsx` | P2 | OPEN |
| B-022 | FarmerReview | Data | Livestock types and quantities not shown — section appears empty | `quantity` field named `count` in DB and `quantity` in frontend — mismatch | `EditFarmer.tsx` · `farmer.service.ts` | P2 | OPEN |
| B-023 | AdminDashboard | Data | Stat cards show 0 for all metrics on first load — only populates after manual refresh | Dashboard service fetches before auth token is set in axios headers — race on mount | `AdminDashboard.tsx` · `dashboard.service.ts` | P1 | OPEN |
| B-024 | AdminDashboard | Data | Analytics chart province filter resets to "All" after navigating away and back | Province filter state in local `useState` — not preserved in URL | `AnalyticsDashboard.tsx` | P2 | OPEN |
| B-025 | AdminDashboard | UI/Layout | Recharts bar chart overflows container on tablet viewport (768px) | `ResponsiveContainer` parent has no defined width — collapses to 0 | `AnalyticsDashboard.tsx` | P2 | OPEN |
| B-026 | AdminDashboard | Data | Monthly trends chart shows flat line — all values appear as 0 | Date aggregation truncates timestamps to day not month — grouping wrong | `analytics_service.py` | P1 | OPEN |
| B-027 | AdminDashboard | UI/Layout | Sidebar nav active state not highlighted on Analytics page | Route path mismatch — nav checks `/admin/analytics` but route is `/admin/analytics-dashboard` | `Sidebar.tsx` · `App.tsx` | P3 | OPEN |
| B-028 | AdminDashboard | Data | Total operators count includes deactivated operators | `dashboard.py` count query missing `is_active: True` filter | `dashboard.py` | P2 | OPEN |
| B-029 | OperatorsList | UI/Layout | Operator list table columns misaligned on screens < 1024px — action buttons overlap | Table uses fixed pixel widths instead of responsive layout | `OperatorsList.tsx` | P3 | OPEN |
| B-030 | OperatorsList | Data | Farmer count per operator always shows 0 | No aggregation between operators and farmers collections | `operators.py` · `dashboard.py` | P2 | OPEN |
| B-031 | OperatorDetails | Data | Operator details page shows blank assigned farmers list even when farmers exist | `operator_id` field filter mismatch between route and DB field | `OperatorDetails.tsx` · `operators.py` | P1 | OPEN |
| B-032 | Registration | UI/Layout | Progress bar step indicator does not advance visually on Step 3 and Step 5 | `WizardSteps.tsx` receives `currentStep` prop but Step 3 and Step 5 don't call `onStepComplete` | `WizardSteps.tsx` · `Step3Farm.tsx` · `Step5PhotoUpload.tsx` | P1 | OPEN |
| B-033 | Registration | Form | Step 2 village field max length not enforced on mobile — user can type 500+ chars | Capacitor native keyboard ignores HTML `maxLength` | `Step2Address.tsx` | P3 | OPEN |
| B-034 | Registration | UI/Layout | Step 5 photo preview image stretched vertically on Android | `img` missing `aspect-ratio` or `object-cover` Tailwind class | `Step5PhotoUpload.tsx` | P2 | OPEN |
| B-035 | All Farmer Screens | UI/Layout | FarmerBottomNav overlaps page content — last list item hidden behind nav bar | Page containers missing `pb-20` to account for fixed bottom nav height | All farmer pages + `FarmerBottomNav.tsx` | P1 | OPEN |

---

## SECTION 1 — FARMER DETAILS & VERIFICATION PANEL
### Files: `FarmerDetails.tsx` · `verification.service.ts`

### Fix Instructions

**B-001 — Auto-expand verification panel from QR scan navigation**

In `QRScanner.tsx` navigate call:
```typescript
navigate("/farmers/" + farmerId, { state: { openVerification: true } });
```

In `FarmerDetails.tsx` useEffect:
```typescript
if (location.state?.openVerification) {
    setVerificationOpen(true);
    verificationRef.current?.scrollIntoView();
}
```

*Verify: Scan QR → FarmerDetails opens with verification panel expanded and scrolled into view.*

---

**B-002 — Re-fetch after approve/reject action**

In the mutation `onSuccess` callback:
```typescript
await fetchFarmer(farmerId);
// Or if using React Query:
queryClient.invalidateQueries(["farmer", farmerId]);
```

*Verify: Approve a document → status badge changes to Verified without page refresh.*

---

**B-003 — Fix audit trail endpoint call**

Check `FarmerDetails.tsx` — audit trail is likely calling `GET /api/farmers/{id}/audit` but the actual endpoint may be `GET /api/verification/audit?farmer_id={id}`. Align the call to match the actual route in `verification.py`.

*Verify: After 2 status changes → audit trail shows 2 entries with user, old status, new status, timestamp.*

---

**B-005 — Fix crops and livestock field name mapping**

In `farmer.service.ts`: check the actual field names returned by `GET /api/farmers/{id}`. If DB returns `crop_types` → map to `crops` in the service response type. Fix TypeScript interface to match actual API shape.

*Verify: FarmerDetails for farmer with maize + soybean → both displayed in farm section.*

---

**B-007 — Add role check to Generate QR button**

```typescript
{(currentUser.role === "OPERATOR" || currentUser.role === "ADMIN") && (
    <button>Generate QR</button>
)}
```

*Verify: Login as farmer → FarmerDetails → Generate QR button not visible.*

---

### Layout Quick Fixes

- **B-004:** Add `className="max-w-full object-cover rounded"` to all thumbnail `img` elements in the document list section
- **B-006:** Change rejection reason textarea from fixed width to `w-full min-h-[80px] resize-none`

---

## SECTION 2 — FARMER DOCUMENT WALLET
### File: `FarmerDocumentWallet.tsx`

### Fix Instructions

**B-008 — Fix status badge field name**

Change `doc.status` to `doc.verification_status` everywhere in `FarmerDocumentWallet.tsx`. Also confirm the API response field name from `GET /api/farmers/{id}/documents` and update the TypeScript interface.

*Verify: Farmer with 1 verified + 1 rejected doc → wallet shows correct green/red badges.*

---

**B-009 — Fix Re-upload button condition** *(depends on B-008 first)*

After fixing B-008 the condition `{doc.verification_status === "rejected" && <ReuploadButton />}` will work correctly.

*Verify: Verified document → no Re-upload button. Rejected document → Re-upload button visible.*

---

**B-010 — Use MIME type not file extension**

```typescript
const isPDF = doc.mime_type === "application/pdf";
const isImage = doc.mime_type?.startsWith("image/");
// Replace any doc.filename.includes(".pdf") checks with isPDF
```

*Verify: PDF document → PDF icon shown. JPG document → thumbnail shown. No broken images.*

---

**B-011 — Authenticated document download**

Replace `<a href="/api/files/{id}">` with an authenticated fetch:

```typescript
async function downloadDoc(fileId: string) {
    const res = await axiosInstance.get(`/files/${fileId}`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.filename || "document";
    a.click();
}
```

*Verify: Tap document name → file downloads correctly (not blank tab, not 401).*

---

### Layout Quick Fixes

- **B-012:** `if (!documents || documents.length === 0) return <EmptyState message="No documents uploaded yet." />` — must be before the `map()` call
- **B-013:** Change document card from `flex-row` to `flex-col sm:flex-row` and add `flex-wrap` to action buttons container

---

## SECTION 3 — OPERATOR EDIT
### File: `OperatorEdit.tsx` · `operators.py`

### Fix Instructions

**B-014 — Fix operator_id type mismatch causing blank form**

Check whether the `GET /api/operators/{id}` endpoint queries by `user_id` or MongoDB `_id`. Ensure the frontend passes the correct type. The simplest fix is to ensure the backend accepts the string `user_id` (which is used everywhere else) and the frontend passes that consistently.

*Verify: Open OperatorEdit page → all fields pre-populated with current operator values.*

---

**B-015 — Always send full current form values on save**

```typescript
const handleSubmit = async () => {
    const payload = { ...formValues }; // send complete current state
    await operatorService.updateOperator(operatorId, payload);
};
```

Do not build a partial patch object from dirty fields.

*Verify: Open OperatorEdit, change only name, save → name updated; district, phone and all other fields unchanged.*

---

**B-016 — Pass province to GeoSelectWithOther**

```tsx
<GeoSelectWithOther
    province={formValues.province}
    district={formValues.district}
    onProvinceChange={(v) => setFormValues({ ...formValues, province: v, district: "" })}
    onDistrictChange={(v) => setFormValues({ ...formValues, district: v })}
/>
```

*Verify: Change province to Copperbelt → district dropdown shows only Copperbelt districts.*

---

### Polish Fix

- **B-017:** Store original values in a `ref` and compare: `const isDirty = JSON.stringify(formValues) !== JSON.stringify(originalRef.current)`. Disable Save button when `!isDirty`.

---

## SECTION 4 — FARMER REVIEW (EditFarmer)
### File: `EditFarmer.tsx` · `farmer.service.ts`

### Fix Instructions

**B-018 — Pass farmer data through navigation state for instant pre-population**

In `FarmerDetails.tsx` Edit button:
```typescript
navigate("/farmers/" + farmerId + "/edit", { state: { farmerData: currentFarmerObject } });
```

In `EditFarmer.tsx`:
```typescript
const location = useLocation();
const [formValues, setFormValues] = useState(location.state?.farmerData || null);
useEffect(() => {
    if (!formValues) fetchFarmer(farmerId);
}, []);
```

*Verify: Click Edit on FarmerDetails → EditFarmer opens instantly with all fields pre-filled — no blank flash.*

---

**B-019 — Fix crops multi-select (also fix in Step3Farm.tsx)**

```typescript
// WRONG — replaces entire array
setCrops(newValue);

// CORRECT — appends to array
setCrops(prev => [...(prev || []).filter(c => c !== newCrop), newCrop]);
```

Add a remove (×) chip per crop so farmer can deselect individual crops.

*Verify: Edit farmer with maize + soybean, add sunflower → crops array has all 3. Remove maize → has soybean + sunflower only.*

---

**B-020 — Reset district when province changes**

Same fix as B-016: pass `province` to `GeoSelectWithOther` and clear `district` in `onProvinceChange` callback.

---

**B-021 — Cancel button should go back not to dashboard**

```typescript
<button onClick={() => navigate(-1)}>Cancel</button>
```

*Verify: Click Edit from FarmerDetails → make change → Cancel → returns to FarmerDetails.*

---

**B-022 — Fix livestock quantity field mapping**

In `farmer.service.ts`:
```typescript
farmer.livestock_types.map(l => ({ ...l, quantity: l.count ?? l.quantity ?? 0 }))
```

*Verify: EditFarmer for farmer with 5 cattle → livestock section shows cattle with quantity 5.*

---

## SECTION 5 — ADMIN DASHBOARD & ANALYTICS
### Files: `AdminDashboard.tsx` · `AnalyticsDashboard.tsx` · `dashboard.py` · `analytics_service.py`

### Fix Instructions

**B-023 — Delay fetch until auth token is confirmed present**

```typescript
useEffect(() => {
    if (!authStore.token) return; // wait for token
    fetchDashboardStats();
}, [authStore.token]);
```

*Verify: Open AdminDashboard → stat cards show real numbers immediately on first load.*

---

**B-024 — Store province filter in URL search params**

```typescript
const [searchParams, setSearchParams] = useSearchParams();
const province = searchParams.get("province") || "";
// On change:
setSearchParams({ province: newValue });
```

*Verify: Set province filter → navigate away → back → filter still applied.*

---

**B-025 — Fix Recharts container overflow**

```tsx
<div className="w-full h-64 min-w-0">
    <ResponsiveContainer width="100%" height="100%">
        <BarChart ...>
```

The `min-w-0` prevents the flex parent from expanding beyond its bounds.

*Verify: Open Analytics on 768px screen → bar chart renders correctly without overflow.*

---

**B-026 — Fix monthly trends aggregation — group by month not day**

In `analytics_service.py`:
```python
{"$group": {
    "_id": {
        "year": {"$year": "$created_at"},
        "month": {"$month": "$created_at"}
    },
    "count": {"$sum": 1}
}}
```

*Verify: Analytics monthly trends chart shows data points per month — not flat zero line.*

---

**B-028 — Add is_active filter to operator count**

In `dashboard.py`:
```python
await db.users.count_documents({"role": "OPERATOR", "is_active": True})
```

*Verify: Deactivate 2 operators → admin dashboard total operators count decreases by 2.*

---

### Navigation Fix

- **B-027:** In `Sidebar.tsx` find where active route is detected. Ensure `App.tsx` route path and `Sidebar` nav item path match exactly — pick one (`/admin/analytics` or `/admin/analytics-dashboard`) and apply consistently everywhere.

---

## SECTION 6 — OPERATOR LIST & DETAILS
### Files: `OperatorsList.tsx` · `OperatorDetails.tsx` · `operators.py`

### Fix Instructions

**B-030 — Add farmer count aggregation to operator list endpoint**

In `operators.py`:
```python
pipeline = [
    {"$match": {"role": "OPERATOR"}},
    {"$lookup": {
        "from": "farmers",
        "localField": "user_id",
        "foreignField": "operator_id",
        "as": "farmers"
    }},
    {"$addFields": {"farmer_count": {"$size": "$farmers"}}},
    {"$project": {"farmers": 0}}
]
```

*Verify: OperatorsList → each operator row shows correct farmer count (not 0).*

---

**B-031 — Fix OperatorDetails assigned farmers list**

In `operators.py`:
```python
await db.farmers.find({"operator_id": operator_user_id}).to_list(1000)
```

Confirm `operator_user_id` is the `user_id` string not MongoDB `_id`.

*Verify: Open OperatorDetails for operator with 5 farmers → farmer list shows all 5.*

---

### Layout Fix

- **B-029:** Replace fixed-width table with responsive grid: `grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-2`

---

## SECTION 7 — REGISTRATION & CROSS-SCREEN

### Fix Instructions

**B-032 — Wire progress bar to Step 3 and Step 5 completion**

In `FarmerRegistration/index.tsx`: confirm `currentStep` prop increments when user clicks Next on Step 3 and Step 5. In `Step3Farm.tsx` and `Step5PhotoUpload.tsx`: confirm `onNext()` or `onStepComplete()` is called in the button `onClick` handler.

*Verify: Complete Step 3 → progress bar advances to Step 3. Complete Step 5 → advances to Step 5.*

---

**B-035 — Add bottom padding to all farmer pages for FarmerBottomNav**

`FarmerBottomNav.tsx` is fixed position at bottom with height ~64px (`h-16`).

Add `pb-20` to the main scroll container in every farmer page:
- `FarmerDashboard.tsx`
- `FarmerDocumentWallet.tsx`
- `NotificationCentre.tsx`
- `FarmerSupplyRequests.tsx`
- `ChangeRequests.tsx`

*Verify: Open any farmer page on mobile → scroll to bottom → last list item fully visible above nav.*

---

### Quick Fixes

- **B-033:** In `Step2Address.tsx` add `maxLength={100}` to village `TextInput` and validate in `onChangeText` — Capacitor does not honour HTML `maxLength`
- **B-034:** In `Step5PhotoUpload.tsx` add `className="w-full aspect-square object-cover rounded-lg"` to the preview `img` element

---

## SECTION 8 — FULL ACCEPTANCE CHECKLIST

Test on physical Android device for mobile items · desktop browser for admin items · dev environment only.

### FarmerDetails
- [ ] QR scan → FarmerDetails opens with verification panel expanded and scrolled into view
- [ ] Approve document → status badge updates without page refresh
- [ ] Audit trail shows all status changes with correct user and timestamp
- [ ] Crops and livestock fields display correct data (not empty)
- [ ] Generate QR button hidden when logged in as farmer

### Document Wallet
- [ ] Verified doc → green badge. Rejected doc → red badge with reason. Pending → amber badge
- [ ] Re-upload button only on rejected documents — not on verified
- [ ] PDF document shows PDF icon. JPG shows thumbnail
- [ ] Tap document → file downloads correctly (not blank tab, not 401)
- [ ] 0 documents → empty state message shown

### Operator Edit
- [ ] Open OperatorEdit → all current values pre-filled
- [ ] Change province → district dropdown resets and filters to correct province
- [ ] Save only changed name → other fields unchanged in DB
- [ ] Cancel → returns to previous screen (not dashboard)

### EditFarmer (Farmer Review)
- [ ] Open EditFarmer from FarmerDetails → all fields pre-populated instantly
- [ ] Add 3 crops → all 3 in crops array in DB
- [ ] Remove 1 crop → removed from array, others intact
- [ ] Livestock quantity shows correctly
- [ ] Cancel → returns to FarmerDetails

### Admin Dashboard & Analytics
- [ ] Dashboard stat cards show real numbers on first load — no refresh needed
- [ ] Monthly trends chart shows data per month — not flat zero line
- [ ] Province filter on analytics survives navigation away and back
- [ ] Recharts bar chart renders correctly at 768px — no overflow
- [ ] Deactivated operators not counted in total
- [ ] Operator list shows correct farmer count per operator

### Cross-Screen
- [ ] All farmer pages: last item fully visible above FarmerBottomNav on mobile
- [ ] Registration progress bar advances on Step 3 and Step 5
- [ ] Photo preview in Step 5 shows correct aspect ratio — not stretched
