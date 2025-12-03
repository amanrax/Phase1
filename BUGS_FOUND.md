# ZIAMIS - Bugs & Issues Found During Testing

**Date:** December 3, 2025  
**Testing Phase:** Comprehensive API Testing  
**Total Issues:** 3 (1 High, 1 Medium, 1 Low)

---

## 🔴 BUG #1: Document Upload "Stream Consumed" Error (HIGH PRIORITY)

### Status
**OPEN** - Blocks document upload functionality

### Severity
**HIGH** - Core feature broken

### Description
Document upload endpoint returns "Stream consumed" internal server error when attempting to upload any document type (NRC, land title, license, certificate).

### Location
- **File:** `backend/app/routes/uploads.py`
- **Endpoint:** `POST /api/uploads/{farmer_id}/document?doc_type={type}`
- **Method:** File upload with multipart/form-data

### Steps to Reproduce
```bash
# Create test file
echo "Test NRC document" > /tmp/test_nrc.txt

# Upload document
curl -X POST "http://localhost:8000/api/uploads/ZM8AC3063F/document?doc_type=nrc" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@/tmp/test_nrc.txt"
```

### Expected Result
```json
{
  "message": "Document uploaded successfully",
  "file_path": "uploads/farmers/documents/ZM8AC3063F_nrc_1234567890.pdf",
  "doc_type": "nrc"
}
```

### Actual Result
```json
{
  "detail": "Internal server error",
  "message": "Stream consumed"
}
```

### Root Cause Analysis
The file upload stream is being read/consumed before being saved to disk. Common causes:
1. Reading `file.file.read()` before `file.save()`
2. Multiple reads of the same stream without seeking back to position 0
3. Validation reading entire stream before processing

### Proposed Fix
Review `backend/app/routes/uploads.py` and check:
```python
# WRONG - reads stream then tries to save
async def upload_document(file: UploadFile):
    content = await file.read()  # Consumes stream
    # ... validation ...
    file.save(path)  # ❌ Stream already consumed

# CORRECT - save first or use file_obj
async def upload_document(file: UploadFile):
    with open(path, "wb") as f:
        f.write(await file.read())  # ✅ Save directly
    # ... validation on saved file ...
```

### Impact
- Cannot upload new documents via API
- Farmers cannot provide NRC, land title, license documents
- Verification workflow blocked
- Existing documents in database show previous uploads worked (feature was functional before)

### Workaround
None - feature broken

### Test Case
```python
def test_upload_nrc_document(admin_token, test_farmer_id):
    """Test NRC document upload"""
    files = {'file': ('test_nrc.pdf', b'PDF content', 'application/pdf')}
    response = client.post(
        f"/api/uploads/{test_farmer_id}/document?doc_type=nrc",
        headers={"Authorization": f"Bearer {admin_token}"},
        files=files
    )
    assert response.status_code == 200
    data = response.json()
    assert "file_path" in data
    assert data["doc_type"] == "nrc"
```

---

## 🟡 BUG #2: Celery Worker Not Running (MEDIUM PRIORITY)

### Status
**OPEN** - Background tasks not processing

### Severity
**MEDIUM** - Feature degraded but has workaround

### Description
ID card generation tasks are queued successfully but not processed because Celery worker is not running in docker-compose.

### Location
- **Service:** celery-worker
- **Config:** `docker-compose.yml`
- **Task:** `backend/app/tasks/id_card_task.py`

### Steps to Reproduce
```bash
# Generate ID card
curl -X POST "http://localhost:8000/api/farmers/ZM8AC3063F/generate-idcard" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Response: {"message": "ID card generation queued", "farmer_id": "ZM8AC3063F"}

# Check worker status
docker-compose ps celery-worker
# Result: Service not running
```

### Expected Result
- Celery worker running as docker-compose service
- Task processed within seconds
- PDF generated in `uploads/idcards/ZM8AC3063F_card.pdf`
- Database updated with `id_card_path` and `id_card_generated_at`

### Actual Result
- Task queued in Redis
- No worker to process task
- PDF not generated
- Database not updated

### Root Cause Analysis
1. Celery worker service not defined in `docker-compose.yml`, OR
2. Service defined but not started, OR
3. Worker command incorrect

### Proposed Fix

**Option 1: Add worker service to docker-compose.yml**
```yaml
services:
  celery-worker:
    build: ./backend
    command: celery -A app.tasks.celery_app worker --loglevel=info
    volumes:
      - ./backend:/app
      - ./uploads:/app/uploads
    environment:
      - MONGO_URL=${MONGO_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - redis
      - mongodb
```

**Option 2: Start existing service**
```bash
docker-compose up -d celery-worker
```

**Option 3: Run worker manually (development)**
```bash
cd backend
celery -A app.tasks.celery_app worker --loglevel=info
```

### Impact
- ID cards queued but not generated
- Farmers cannot download ID cards
- Admin must manually trigger generation or run worker separately
- Existing PDFs in `uploads/idcards/` show feature worked previously

### Workaround
Start Celery worker manually in separate terminal:
```bash
cd /workspaces/Phase1/backend
celery -A app.tasks.celery_app worker --loglevel=info
```

### Verification
```bash
# After starting worker:
# 1. Generate ID card
curl -X POST "http://localhost:8000/api/farmers/ZM8AC3063F/generate-idcard" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 2. Wait 5-10 seconds

# 3. Check file created
ls -lh uploads/idcards/ZM8AC3063F_card.pdf

# 4. Verify database updated
curl -X GET "http://localhost:8000/api/farmers/ZM8AC3063F" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.id_card_path'
```

---

## 🟢 ISSUE #3: No Refresh Token in Login Response (LOW PRIORITY)

### Status
**OPEN** - May be by design

### Severity
**LOW** - Minor inconvenience

### Description
Login endpoint does not return `refresh_token` in response, only `access_token`. Users must re-login after token expiry (30 minutes).

### Location
- **File:** `backend/app/routes/auth.py` (login endpoint)
- **Endpoint:** `POST /api/auth/login`
- **Feature:** Token refresh mechanism

### Steps to Reproduce
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ziamis.gov.zm","password":"Admin@2024"}'
```

### Expected Result (if refresh tokens implemented)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 1800,
  "token_type": "bearer",
  "user": {...}
}
```

### Actual Result
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 1800,
  "token_type": "bearer",
  "user": {...}
}
```

### Root Cause Analysis
Refresh token feature not implemented. This may be intentional design decision:
- Admin tool with limited concurrent users
- 30-minute sessions acceptable for security
- Simpler token management without refresh flow

### Proposed Fix (if needed)

**Backend - Generate refresh token:**
```python
# In auth.py login endpoint
refresh_payload = {
    "sub": user_id,
    "type": "refresh",
    "exp": datetime.utcnow() + timedelta(days=7)
}
refresh_token = jwt.encode(refresh_payload, SECRET_KEY, algorithm="HS256")

return {
    "access_token": access_token,
    "refresh_token": refresh_token,  # Add this
    "expires_in": 1800,
    "token_type": "bearer",
    "user": user_dict
}
```

**Backend - Add refresh endpoint:**
```python
@router.post("/refresh")
async def refresh_token(refresh_token: str):
    """Exchange refresh token for new access token"""
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid token type")
        
        # Generate new access token
        user_id = payload["sub"]
        new_access_token = create_access_token(user_id)
        
        return {
            "access_token": new_access_token,
            "expires_in": 1800,
            "token_type": "bearer"
        }
    except JWTError:
        raise HTTPException(401, "Invalid refresh token")
```

**Frontend - Store and use refresh token:**
```typescript
// In authStore.ts
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;  // Add this
  // ...
}

// In axios.ts interceptor
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      const refreshToken = authStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post('/auth/refresh', { refresh_token: refreshToken });
          authStore.getState().setAccessToken(data.access_token);
          error.config.headers.Authorization = `Bearer ${data.access_token}`;
          return axios.request(error.config);  // Retry original request
        } catch (refreshError) {
          authStore.getState().logout();  // Refresh failed, logout
        }
      }
    }
    return Promise.reject(error);
  }
);
```

### Impact
- Users must re-login every 30 minutes
- Session continuity interrupted
- Minor inconvenience for long admin sessions

### Workaround
Users can re-login when token expires. 30-minute sessions are acceptable for most admin workflows.

### Decision Required
**Product Owner:** Determine if refresh token feature is needed:
- **Keep current behavior:** 30-minute sessions sufficient for admin tool
- **Implement refresh tokens:** Better UX for long sessions

---

## Summary

| Bug # | Title | Severity | Status | Impact | Fix Effort |
|-------|-------|----------|--------|--------|------------|
| #1 | Document Upload Stream Error | HIGH | OPEN | Blocks uploads | LOW (1-2 hours) |
| #2 | Celery Worker Not Running | MEDIUM | OPEN | Degrades ID cards | LOW (5 minutes) |
| #3 | No Refresh Token | LOW | OPEN | Minor UX issue | MEDIUM (4-6 hours) |

### Recommended Priority
1. **Bug #2** - Start Celery worker (immediate, 5-minute fix)
2. **Bug #1** - Fix document upload (high impact, low effort)
3. **Issue #3** - Refresh token (nice-to-have, can defer)

---

## Test Environment
- **Backend:** http://localhost:8000
- **Database:** zambian_farmer_db (MongoDB Atlas)
- **Redis:** localhost:6379
- **Test Data:** 26 farmers, 11 operators, 5 supply requests

## Testing Tools
- **API:** curl, Postman
- **Automation:** pytest 7.4.3, bash scripts
- **Monitoring:** docker-compose logs

---

**Report Generated:** December 3, 2025  
**Testing Phase:** Comprehensive API Testing  
**Next Review:** After bug fixes implemented
