# Comprehensive Testing & Enhancement Task

## Project Context
This is a Farmer Management System (ZIAMIS) with:
- **Backend**: FastAPI + MongoDB ATLAS + Celery + Redis
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Roles**: Admin, Operator, Farmer

##  1: LOGGING SYSTEM IMPLEMENTATION

### 1.1 Create Backend Logging Service
Create `backend/app/services/logging_service.py`:
- Implement structured logging that stores logs in MongoDB collection `system_logs`
- Log schema: `{timestamp, level, module, endpoint, user_id, role, action, details, ip_address, request_id}`
- Add log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Include request/response timing for performance tracking

### 1.2 Create Logging Middleware
Create `backend/app/middleware/logging_middleware.py`:
- Intercept all requests and log: method, path, user, duration, status_code
- Generate unique request_id for traceability
- Log request body (sanitize passwords/tokens)
- Log response status and errors

### 1.3 Add Logs to ALL Route Files
Update these files with structured logging:
- `backend/app/routes/auth.py` - Log login/logout/refresh attempts with success/failure
- `backend/app/routes/farmers.py` - Log all CRUD operations
- `backend/app/routes/operators.py` - Log operator management actions
- `backend/app/routes/users.py` - Log user management
- `backend/app/routes/farmer_idcards.py` - Log ID card generation
- `backend/app/routes/farmer_photos.py` - Log photo uploads/deletes
- `backend/app/routes/uploads.py` - Log document operations
- `backend/app/routes/geo.py` - Log geo data access
- `backend/app/routes/dashboard.py` - Log dashboard queries
- `backend/app/routes/reports.py` - Log report generation

### 1.4 Log Cleanup Celery Task
Create `backend/app/tasks/log_cleanup_task.py`:
- Schedule task to run daily at midnight
- Delete logs older than 24 hours
- Keep ERROR/CRITICAL logs for 7 days
- Log the cleanup action itself

### 1.5 Log Viewer API & Frontend
Create `backend/app/routes/logs.py`:
- GET /logs - Paginated logs with filters (level, module, user, date range)
- GET /logs/stats - Log statistics (counts by level, module)
- Only accessible by Admin role

Create `frontend/src/pages/LogViewer.tsx`:
- Real-time log viewer with auto-refresh
- Filter by level, module, date
- Search by user/action
- Export logs as CSV

---

##  2: ADMIN ROLE TESTING

### 2.1 Authentication Tests
Test file: Ensure Login.tsx handles:
- [ ] Valid admin login → redirect to /admin-dashboard
- [ ] Invalid credentials → show error notification
- [ ] Session expiry → redirect to login with message
- [ ] Token refresh flow working correctly

### 2.2 Operator Management (Admin)
Test 
- [ ] Create new operator with all required fields
- [ ] All dropdowns (province, district, chiefdom) fetch from `/geo/*` endpoints
- [ ] If dropdown value not available → "Others" option shows text input
- [ ] New "Others" values saved to database for future use
- [ ] Activate/Deactivate operator toggle works
- [ ] After deactivating operator → login as that operator should FAIL with message "Account deactivated"
- [ ] View operator details shows all data correctly
- [ ] Edit operator loads existing data including dropdown selections
- [ ] Save operator updates persists changes

### 2.3 Admin User Management
Test user creation flow:
- [ ] Admin can create new Admin users
- [ ] New admin can login successfully
- [ ] Proper role assignment and permissions

### 2.4 Farmer Creation (by Admin)
Test  steps:
- [ ] Step1 - All personal fields + validation
- [ ] Step2 - Cascading dropdowns (Province→District→Chiefdom→Village)
- [ ] Step3 - Farm details with crop selection
- [ ] Step4 - Review all entered data
- [ ] Step5 - Photo capture/upload working
- [ ] Step6 - Document upload with status tracking
- [ ] Step7 - Success message with farmer ID

### 2.5 Document Upload Status Fix
In Step6
- [ ] Each document should have independent status (pending/uploaded/verified)
- [ ] Uploading one document should NOT affect others' status
- [ ] Show individual upload progress per document type

### 2.6 Farmer CRUD Operations (Admin)
Test 
- [ ] List all farmers with pagination
- [ ] View farmer details shows complete info
- [ ] Edit farmer → FarmerEdit.tsx loads ALL existing data
- [ ] Edit form dropdowns pre-select saved values
- [ ] Delete farmer with confirmation
- [ ] Activate/Deactivate farmer works
- [ ] Deactivated farmer cannot login

### 2.7 Supply Requests Review (Admin)
- [ ] View pending supply requests from farmers
- [ ] Approve/Reject requests with notes
- [ ] Notification sent to farmer on decision

### 2.8 Reports (Admin)
Test reports.py and frontend report pages:
- [ ] Generate farmer reports (by province, district, status)
- [ ] Generate operator activity reports
- [ ] Reports are accurate and match database
- [ ] Export to PDF/CSV/xlsx working
		if chosedn pdf  ADJUCT page accordingly or give user the choice to choose only limited data so taht it can be exported to pdf
- [ ] Reports are readable and properly formatted

---

## 3: OPERATOR ROLE TESTING

### 3.1 Operator Login
- [ ] Login with valid operator credentials
- [ ] Redirect to /operator-dashboard
- [ ] Deactivated operator shows "Account deactivated" error

### 3.2 Farmer CRUD (by Operator)
- [ ] Operator can create new farmers
- [ ] Operator can view farmers (filtered by their assigned area)
- [ ] Operator can edit farmer data
- [ ] Operator can upload photos/documents for farmers
- [ ] Operator CANNOT delete farmers (admin only)
- [ ] Operator CANNOT deactivate farmers (admin only)

### 3.3 Operator Self-Management
- [ ] Operator can view own profile
- [ ] Operator can edit own profile (limited fields)
- [ ] Operator CANNOT change own role/status

### 3.4 ID Card Operations (Operator)
- [ ] Generate ID card for farmers
- [ ] View ID card (front/back)
- [ ] Regenerate ID card
- [ ] Download ID card PDF

---

## 4: FARMER ROLE TESTING

### 4.1 Farmer Login
- [ ] Login with farmer credentials (farmer_id + password or phone+OTP)
- [ ] Redirect to /farmer-dashboard
- [ ] Deactivated farmer shows "Account deactivated" error

### 4.2 Farmer Self-Service
Test 
- [ ] View own profile/details
- [ ] Edit allowed fields (phone, email, address)
- [ ] CANNOT edit NRC, farmer_id, registration date
- [ ] View/download own ID card
- [ ] Upload/replace own photo
- [ ] Upload/replace documents

### 4.3 Supply Request (Farmer)
- [ ] Farmer can submit supply requests
- [ ] View request status (pending/approved/rejected)
- [ ] Receive notification on status change

---

##  5: ID CARD OPERATIONS (ALL ROLES)

### 5.1 ID Card Generation
Test 
- [ ] POST /farmers/{id}/idcard - Generates ID card (Celery task)


### 5.2 ID Card Viewing
- [ ] View ID card modal with front/back flip animation
- [ ] All data renders correctly from database

### 5.3 ID Card Download
- [ ] Download as PDF with both sides
- [ ] PDF quality suitable for printing (300 DPI)
- [ ] Filename: {farmer_id}_IDCard.pdf

### 5.4 ID Card Regeneration
- [ ] Regenerate after farmer data update
- [ ] Old ID card replaced
- [ ] QR code updated with new data

---

##  6: DROPDOWN & DYNAMIC DATA HANDLING

### 6.1 Geo Data Dropdowns
For ALL forms (CreateFarmer, EditFarmer, CreateOperator, EditOperator):
- [ ] Province dropdown fetches from GET /geo/provinces
- [ ] District dropdown fetches from GET /geo/districts?province={id}
- [ ] Chiefdom dropdown fetches from GET /geo/chiefdoms?district={id}
- [ ] Village dropdown (if exists) fetches accordingly

### 6.2 "Others" Option Implementation
When dropdown value not available:
- [ ] Last option in each dropdown is "Others - Specify"
- [ ] Selecting "Others" shows a text input field
- [ ] On form submit, new value is added to database
- [ ] New value available in dropdown for future forms


### 6.3 Edit Form Data Loading
In 
- [ ] All text fields pre-populated with existing data
- [ ] All dropdown fields pre-select the saved value
- [ ] Date fields show existing dates
- [ ] Boolean toggles reflect current state
- [ ] Photo preview shows existing photo
- [ ] Document list shows uploaded documents
When dropdown value not available:
- [ ] Last option in each dropdown is "Others - Specify"
- [ ] Selecting "Others" shows a text input field
- [ ] On form submit, new value is added to database
- [ ] New value available in dropdown for future forms

---

##  7: NAVIGATION & ROUTING

### 7.1 Back Button Behavior
Implement role-aware navigation in ALL pages:

### 7.2 Protected Routes
In
- [ ] Admin routes only accessible by admin
- [ ] Operator routes accessible by admin + operator
- [ ] Farmer routes accessible by all authenticated users
- [ ] Unauthorized access redirects to appropriate dashboard

---

##  8: ERROR HANDLING & NOTIFICATIONS

### 8.1 Backend Error Handling
In all route files, implement consistent error responses:

### 8.2 Frontend Notification System
Create `frontend/src/components/Notification.tsx`:
- Toast notifications for success/error/warning/info
- Auto-dismiss after 5 seconds
- Stack multiple notifications
- Action buttons for some notifications

### 8.3 Form Validation Messages
- [ ] Show inline validation errors below fields
- [ ] Highlight invalid fields with red border
- [ ] Show success message on successful submit
- [ ] Show specific error message on failure

### 8.4 API Error Handling in Services
Update all services in `frontend/src/services/*`:

---

##  9: ADDITIONAL REQUIREMENTS

### 9.1 Session Management
- [ ] Auto-logout after 30 minutes of inactivity
- [ ] Show session expiry warning at 25 minutes
- [ ] Allow session extension

### 9.2 Audit Trail
- [ ] Track all data changes with before/after values
- [ ] Store: who, when, what changed
- [ ] Viewable by Admin in audit log page

### 9.3 Data Export
- [ ] Export farmer list to CSV/Excel/
		if chosen pdf  ADJUCT page accordingly or give user the choice to choose only limited data so taht it can be exported to pdf
- [ ] Export reports to PDF
- [ ] Bulk export with filters

### 9.4 Search & Filtering
- [ ] Global search across farmers (name, NRC, farmer_id, phone)
- [ ] Advanced filters (province, district, status, date range)
- [ ] Save filter presets

### 9.5 Performance
- [ ] Pagination on all list views (default 20 items)
- [ ] Lazy loading for images
- [ ] Debounce search inputs
- [ ] Loading states for all async operations

---


## TESTING 

Run through  checklist after implementation:


---

## CONSTRAINTS

1. **DO NOT** hardcode any data - all dynamic from database
2. **DO NOT** change existing working logic
3. **PRESERVE** (async) vs  (sync) 
4. **MAINTAIN** existing auth flow (token refresh then logout)
5. **FOLLOW** existing code patterns and file structure
6. **USE** TypeScript strict mode - no `as any`
7. **LOG** all operations with proper context
