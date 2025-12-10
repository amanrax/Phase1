# Mobile App Network Error - Fixed! ✅

**Issue:** Mobile app showed "Network Error" when trying to login  
**Root Cause:** CORS preflight OPTIONS requests were failing (400 Bad Request)  
**Date Fixed:** December 7, 2025, 3:23 PM UTC

---

## What Was Wrong? 🔍

The backend's CORS configuration didn't include origins used by Capacitor mobile apps:
- `capacitor://localhost`
- `https://localhost`
- `ionic://localhost`

When the mobile app tried to make API requests, the browser (embedded in the app) sent a CORS preflight OPTIONS request first. The backend rejected it with **400 Bad Request**, causing the "Network Error" you saw.

**Evidence from logs:**
```
INFO: 172.18.0.1:48470 - "OPTIONS /api/auth/login HTTP/1.1" 400 Bad Request
```

---

## What We Fixed ✅

### 1. Updated CORS Configuration (`backend/app/main.py`)

**Added mobile app origins:**
```python
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:8000",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:3000",
    # Capacitor mobile app origins (NEW!)
    "capacitor://localhost",
    "https://localhost",
    "ionic://localhost",
    "http://localhost",
]
```

**Enhanced regex to support ngrok:**
```python
allow_origin_regex = r"^https:\/\/([a-z0-9\-]+-(?:5173|8000|3000)\.app\.github\.dev|[a-z0-9\-]+\.ngrok-free\.(app|dev)|[a-z0-9\-]+\.ngrok\.io)$"
```

Now accepts requests from:
- ✅ GitHub Codespaces
- ✅ ngrok tunnels (all variants: .ngrok.io, .ngrok-free.app, .ngrok-free.dev)
- ✅ Capacitor mobile apps
- ✅ Ionic mobile apps

### 2. Restarted Backend
```bash
docker restart farmer-backend
```

### 3. Rebuilt Mobile APK
Triggered new GitHub Actions build with CORS fix.

---

## Verification Tests ✅

### Test 1: CORS Preflight (Local)
```bash
curl -X OPTIONS "http://localhost:8000/api/auth/login" \
  -H "Origin: capacitor://localhost" \
  -H "Access-Control-Request-Method: POST"
```

**Result:** ✅ HTTP 200 with correct CORS headers

### Test 2: CORS Preflight (Through ngrok)
```bash
curl -X OPTIONS "https://intercessional-unfudged-sanjuanita.ngrok-free.dev/api/auth/login" \
  -H "Origin: capacitor://localhost" \
  -H "Access-Control-Request-Method: POST"
```

**Result:** ✅ HTTP 200 with correct CORS headers
```
access-control-allow-origin: capacitor://localhost
access-control-allow-methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
access-control-allow-credentials: true
```

### Test 3: Actual Login Request
```bash
curl -X POST "https://intercessional-unfudged-sanjuanita.ngrok-free.dev/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: capacitor://localhost" \
  -d '{"email":"admin@ziamis.gov.zm","password":"Admin@2024"}'
```

**Result:** ✅ HTTP 200 with JWT tokens

---

## How to Test the Fixed APK 📱

### Step 1: Wait for Build to Complete
```bash
gh run watch $(gh run list --workflow build-android.yml --limit 1 --json databaseId --jq '.[0].databaseId')
```

Estimated time: 2-3 minutes

### Step 2: Download New APK
```bash
cd /workspaces/Phase1
rm -rf mobile-apk-fixed
gh run download $(gh run list --workflow build-android.yml --limit 1 --json databaseId --jq '.[0].databaseId') -n ziamis-debug-apk -D ./mobile-apk-fixed
ls -lh mobile-apk-fixed/
```

### Step 3: Install on Phone
1. **Uninstall old app completely:**
   - Long press ZIAMIS app icon
   - Select "Uninstall"
   - Or: Settings → Apps → ZIAMIS → Uninstall

2. **Transfer new APK to phone:**
   - Email: `mobile-apk-fixed/app-debug.apk`
   - Or use: `adb install mobile-apk-fixed/app-debug.apk`

3. **Install and test:**
   - Allow "Install from unknown sources"
   - Open ZIAMIS app
   - Try login with:
     - Email: `admin@ziamis.gov.zm`
     - Password: `Admin@2024`

### Step 4: Watch Logs During Test
```bash
docker logs farmer-backend -f
```

You should now see successful requests:
```
INFO: "OPTIONS /api/auth/login HTTP/1.1" 200 OK
INFO: "POST /api/auth/login HTTP/1.1" 200 OK
```

---

## Expected Behavior Now ✅

### Before Fix ❌
1. Open app → Login screen
2. Enter credentials → Click Login
3. **Error:** "Network Error"
4. Backend logs: `OPTIONS /api/auth/login → 400 Bad Request`

### After Fix ✅
1. Open app → Login screen
2. Enter credentials → Click Login
3. Brief loading spinner
4. **Success:** Redirects to Dashboard
5. Backend logs:
   ```
   INFO: "OPTIONS /api/auth/login HTTP/1.1" 200 OK
   INFO: "POST /api/auth/login HTTP/1.1" 200 OK
   ```

---

## Technical Details 🔧

### What is CORS Preflight?

When a web/mobile app makes a cross-origin API request with:
- Custom headers (e.g., `Authorization`)
- Methods other than GET/POST
- Content-Type other than `application/x-www-form-urlencoded`

The browser **first** sends an OPTIONS request to ask:
> "Is my origin allowed to make this request?"

If the server says NO (or doesn't respond properly), the actual request never happens.

### Why Capacitor Uses Special Origins

Capacitor mobile apps don't run on a traditional web server. Instead, they use special protocols:
- **`capacitor://localhost`** - Default Capacitor protocol
- **`https://localhost`** - When using HTTPS mode
- **`ionic://localhost`** - For Ionic apps

These must be explicitly allowed in CORS configuration.

### Why We Need ngrok Regex

ngrok URLs change format:
- Legacy: `https://abc123.ngrok.io`
- New free: `https://abc-def-ghi.ngrok-free.app`
- Custom: `https://my-name.ngrok-free.dev`

The regex pattern allows ALL ngrok domains automatically.

---

## Files Changed 📝

### `/workspaces/Phase1/backend/app/main.py`
- Added Capacitor origins to `allowed_origins` list
- Enhanced `allow_origin_regex` to support ngrok domains
- Commit: `3bb3b6d`

---

## Troubleshooting (If Still Not Working) 🔍

### Issue: Still shows "Network Error"

**Check 1:** Is the new APK actually installed?
```bash
# Get build ID of latest successful build
gh run list --workflow build-android.yml --limit 5
```

Make sure you downloaded and installed the **LATEST** build after commit `3bb3b6d`.

**Check 2:** Clear app data
```
Settings → Apps → ZIAMIS → Storage → Clear Data
```

**Check 3:** Uninstall completely and reinstall
- Don't use "Update" - do a fresh install

**Check 4:** Check backend logs
```bash
docker logs farmer-backend -f
```

When you try to login, you should see:
- ✅ `OPTIONS /api/auth/login → 200` (preflight passes)
- ✅ `POST /api/auth/login → 200` (login succeeds)

If you see:
- ❌ `OPTIONS /api/auth/login → 400` = CORS still broken (wrong APK or backend not restarted)
- ❌ No logs at all = App not reaching backend (ngrok issue or wrong URL in APK)

---

## Testing Checklist ✓

Before reporting issues:

- [ ] Backend restarted: `docker logs farmer-backend | grep "CORS Allowed Origins"`
  - Should include: `capacitor://localhost`
- [ ] ngrok tunnel active: `curl http://localhost:4040/api/tunnels | jq`
- [ ] New APK built AFTER commit `3bb3b6d`
- [ ] Old app completely uninstalled
- [ ] New APK installed fresh
- [ ] Phone has internet connection
- [ ] Can access ngrok URL in phone browser

---

## Build Information 📦

**Latest Build:**
- Commit: `3bb3b6d` - "fix: Add Capacitor and ngrok origins to CORS for mobile app support"
- Branch: `farmer-edit-fix`
- Workflow: `build-android.yml`
- Build ID: Check with `gh run list --workflow build-android.yml --limit 1`

**Download Command:**
```bash
rm -rf mobile-apk-fixed
gh run download $(gh run list --workflow build-android.yml --limit 1 --json databaseId --jq '.[0].databaseId') -n ziamis-debug-apk -D ./mobile-apk-fixed
```

---

## Next Steps 🚀

1. **Wait for build to complete** (~2-3 minutes)
2. **Download the new APK** (see command above)
3. **Uninstall old app completely**
4. **Install new APK**
5. **Test login**
6. **Report results** - Did it work? What do you see?

---

## Contact/Support 💬

If the app still doesn't work after installing the new APK, run this diagnostic:

```bash
# Collect all debug info
./test-mobile-setup.sh > mobile-debug.txt 2>&1
echo -e "\n\n=== CORS CONFIG ===" >> mobile-debug.txt
docker logs farmer-backend 2>&1 | grep -A5 "CORS Allowed Origins" >> mobile-debug.txt
echo -e "\n\n=== RECENT REQUESTS ===" >> mobile-debug.txt
docker logs farmer-backend --tail 30 >> mobile-debug.txt

cat mobile-debug.txt
```

Then share:
1. The output above
2. Exact error message from app
3. Screenshot of error
4. Can you access ngrok URL in phone browser? (Yes/No)
