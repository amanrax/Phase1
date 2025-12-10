# ZIAMIS Testing & Verification Guide

This document provides instructions for testing and verifying the ZIAMIS application without making major code changes.

## Quick Start

### Backend Tests
```bash
cd backend
./run_tests.sh
```

### Frontend Tests (Manual)
```bash
cd frontend
npm run dev
# Open browser and follow manual test checklist below
```

## Test Coverage

### ✅ Backend Tests Implemented

#### 1. Authentication (`tests/test_auth.py`)
- [x] Admin login with correct role
- [x] Operator login with correct role
- [x] Farmer login with NRC and DOB
- [x] Role mismatch validation (admin credentials + operator role = error)
- [x] Invalid credentials rejected
- [x] Inactive users cannot login
- [x] Token refresh functionality

#### 2. Logging System (`tests/test_logging.py`)
- [x] Log structure validation (timestamp, level, module, action, details, user_id, role)
- [x] Password/token sanitization in logs
- [x] Log cleanup task (delete old INFO logs, keep ERROR logs longer)
- [x] Log viewer endpoints (/api/logs with pagination and filters)
- [x] Log stats endpoint

#### 3. Admin Operations (`tests/test_admin_operations.py`)
- [x] Create operator
- [x] Deactivate operator
- [x] Deactivated operator cannot login
- [x] Edit operator
- [x] List farmers with pagination
- [x] Get farmer details
- [x] Deactivate farmer (blocks login)
- [x] Document upload status tracking
- [x] Role enforcement (operator cannot delete farmer, farmer cannot access admin routes)

#### 4. Geo Data (`tests/test_geo_data.py`)
- [x] Get provinces list
- [x] Get districts by province (cascading)
- [x] Get chiefdoms by district
- [x] Create custom province via "Others" option
- [x] Create custom district
- [x] Prevent duplicate custom entries
- [x] Custom entries appear in dropdown lists

## Manual Testing Checklist

### 1. Admin Role - Complete Flow

#### Login & Auth
- [ ] Login with admin credentials → redirected to /admin-dashboard
- [ ] Login with wrong password → error shown, no redirect
- [ ] Select "Operator" tab + enter admin credentials → error: "Invalid credentials for operator login"
- [ ] Token expires after 30 min → auto-logout with warning at 25 min

#### Operator Management
- [ ] Click "Operators" → list loads
- [ ] Click "Create Operator" → form opens
  - [ ] All dropdowns (province, district) load data
  - [ ] Select "Others - Specify" in province dropdown
  - [ ] Text input appears, enter "New Custom Province"
  - [ ] Submit form → operator created
  - [ ] Re-open form → "New Custom Province" appears in dropdown
- [ ] View operator details → all data displayed correctly
- [ ] Edit operator → form prefills with existing data
- [ ] Deactivate operator toggle → status changes
- [ ] Logout, try to login as deactivated operator → blocked with "Account disabled" message

#### Farmer Creation Wizard
- [ ] Click "Create Farmer" → Step 1 opens
- [ ] **Step 1 (Personal Info)**:
  - [ ] Fill all required fields
  - [ ] Validation shows errors for invalid NRC format
  - [ ] Click "Next" → goes to Step 2
- [ ] **Step 2 (Address)**:
  - [ ] Province dropdown loads
  - [ ] Select province → district dropdown populates
  - [ ] Select district → chiefdom dropdown populates
  - [ ] Select chiefdom → village input enabled
  - [ ] Test "Others - Specify" for each level
  - [ ] Click "Next" → goes to Step 3
- [ ] **Step 3 (Farm Details)**:
  - [ ] Enter farm size, select crops
  - [ ] Click "Next" → goes to Step 4
- [ ] **Step 4 (Preview)**:
  - [ ] All entered data displays correctly
  - [ ] Click "Back" → returns to Step 3 with data intact
  - [ ] Click "Next" → goes to Step 5
- [ ] **Step 5 (Photo Upload)**:
  - [ ] Upload photo → preview shows
  - [ ] Photo path stored in DB
  - [ ] Click "Next" → goes to Step 6
- [ ] **Step 6 (Documents Upload)**:
  - [ ] Upload NRC document → status changes to "uploaded"
  - [ ] Upload Land Title → NRC status remains "uploaded" (independent tracking)
  - [ ] Each document type has own progress indicator
  - [ ] Click "Next" → goes to Step 7
- [ ] **Step 7 (Complete)**:
  - [ ] Success message shows farmer name and farmer_id
  - [ ] Farmer appears in farmers list

#### Farmer CRUD
- [ ] Farmers list → pagination works (20 per page)
- [ ] Search by name/NRC/phone works
- [ ] Filter by district works
- [ ] Click farmer → detail view shows all sections
- [ ] Edit farmer:
  - [ ] All dropdowns prefill with saved values
  - [ ] Can change province → district updates
  - [ ] Save → changes persist
- [ ] Deactivate farmer → status changes
- [ ] Logout, try farmer login → blocked with error
- [ ] Reactivate farmer → login works again

#### Supply Requests
- [ ] View supply requests list
- [ ] Filter by status (pending/approved/rejected)
- [ ] Approve request with notes → status updates, notification sent
- [ ] Reject request → status updates

#### Reports
- [ ] Farmer by region report → data matches DB
- [ ] Operator activity report → shows logs
- [ ] Export CSV → file downloads with correct data
- [ ] Export PDF:
  - [ ] Opens PDF in new tab
  - [ ] Content is readable and properly formatted
  - [ ] All selected columns appear

### 2. Operator Role - Complete Flow

#### Login & Permissions
- [ ] Login with operator credentials → /operator-dashboard
- [ ] Try to access /admin/users → blocked (403 or redirect)

#### Farmer Management
- [ ] Create farmer (within assigned district)
- [ ] View farmers in assigned district only
- [ ] Edit farmer data
- [ ] Upload/replace farmer photo
- [ ] Upload documents → status updates
- [ ] **Cannot** delete farmer (button disabled or 403 error)
- [ ] **Cannot** deactivate farmer (button disabled or 403 error)

#### ID Card Operations
- [ ] View farmer → click "Generate ID Card"
- [ ] Card generates → view front/back
- [ ] Flip animation works
- [ ] Download PDF → opens with both sides
- [ ] Update farmer data → regenerate card → new card reflects changes

#### Self-Management
- [ ] View own profile
- [ ] Edit contact info (phone, email)
- [ ] **Cannot** change role or status

### 3. Farmer Role - Complete Flow

#### Login & Access
- [ ] Login with NRC + DOB → /farmer-dashboard
- [ ] Dashboard shows correct summary

#### Self-Service
- [ ] View personal details
- [ ] Edit allowed fields (phone, email, address)
- [ ] **Cannot** edit NRC, farmer_id, registration date (fields disabled)
- [ ] View photo and documents
- [ ] Upload/replace photo where allowed

#### ID Card
- [ ] View own ID card (front/back)
- [ ] Flip animation works
- [ ] Download PDF

#### Supply Requests
- [ ] Submit supply request
- [ ] View request status
- [ ] See notification when admin approves/rejects

### 4. Cross-Cutting Concerns

#### Session Management
- [ ] After 25 minutes of inactivity → warning modal appears
- [ ] Click "Stay Logged In" → session extends, modal closes
- [ ] Click "Logout Now" → redirected to login
- [ ] After 30 minutes → auto-logout

#### Notifications/Toasts
- [ ] Success toast on successful operations (green)
- [ ] Error toast on failures (red)
- [ ] Warning toast for warnings (yellow)
- [ ] Info toast for information (blue)
- [ ] Auto-dismiss after 5 seconds
- [ ] Multiple toasts stack correctly

#### Form Validation
- [ ] Required fields show error if empty
- [ ] Invalid email format shows error
- [ ] Invalid NRC format shows error
- [ ] Field highlights red on error
- [ ] Error messages are clear

#### Error Handling
- [ ] Network error → user-friendly message
- [ ] 500 error → "Something went wrong" message
- [ ] 403 error → "Permission denied" message
- [ ] Form shows API error messages

#### Navigation
- [ ] Back button in farmer details → returns to list
- [ ] Back in edit form → returns to details
- [ ] Breadcrumbs work correctly
- [ ] Unauthorized route access → redirect to appropriate dashboard

#### Performance
- [ ] Farmers list with 100+ items → pagination works
- [ ] Image thumbnails use lazy loading
- [ ] Search input is debounced (doesn't search on every keystroke)
- [ ] All async operations show loading spinner
- [ ] UI doesn't freeze during operations

## Running Automated Tests

### Backend
```bash
cd backend
pip install -r requirements-test.txt
pytest tests/ -v --cov=app
```

### Test Database
Tests use a separate test database (`zambian_farmer_db_test`) which is automatically cleaned up.

## Coverage Gaps

### Not Yet Tested (Requires Manual Verification)
1. **ID Card Generation**: Celery task execution, QR code content, PDF quality
2. **Photo/Document Upload**: Actual file storage, path validation
3. **Email Notifications**: SMTP integration, email content
4. **Audit Trail**: Complete before/after logging for all changes
5. **Data Export**: Excel format validation, large dataset handling
6. **Search Performance**: With 10,000+ farmers
7. **Concurrent Users**: Multiple users editing same farmer

### Future Test Additions
- E2E tests with Playwright/Selenium
- Load testing with Locust
- Security testing (SQL injection, XSS, CSRF)
- API contract tests with Pact
- Integration tests with real MongoDB

## Bug Reporting

When finding bugs during testing:

1. **Don't fix immediately** - document first
2. Note:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Browser/environment
   - Screenshots if applicable
3. Create minimal test case
4. Add test that reproduces bug
5. Then make minimal fix

## Test Maintenance

- Run tests before every commit
- Update tests when adding features
- Keep tests focused and independent
- Mock external dependencies (email, SMS, etc.)
- Use fixtures for common setup

## CI/CD Integration (Future)

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run backend tests
        run: cd backend && ./run_tests.sh
```

---

**Last Updated**: December 3, 2025
**Test Coverage**: ~60% of critical paths
**Status**: ✅ Core functionality verified
