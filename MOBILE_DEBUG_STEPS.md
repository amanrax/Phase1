# Mobile App Debugging Steps

**Last Updated:** December 7, 2025, 3:15 PM UTC

## Current System Status ✅

- ✅ Backend: Running at `http://localhost:8000`
- ✅ ngrok Tunnel: `https://intercessional-unfudged-sanjuanita.ngrok-free.dev`
- ✅ APK File: `mobile-apk-new/app-debug.apk` (4.2M)
- ✅ Login Endpoint: Working at `/api/auth/login` (tested successfully)

## Step-by-Step Debugging

### Step 1: Test Backend from Your Phone's Browser 🌐

**Purpose:** Verify your phone can reach the backend through ngrok

1. **Open browser on your phone**
2. **Visit:** `https://intercessional-unfudged-sanjuanita.ngrok-free.dev/docs`

**Expected Results:**
- ✅ **SUCCESS:** You see FastAPI Swagger documentation page
- ❌ **FAIL:** Timeout, connection error, or ngrok warning page

**If you see ngrok warning page:**
- Click "Visit Site" button
- Bookmark the page
- Try again - warning should not appear anymore

**If connection fails:**
- Check your phone has internet
- Try on mobile data instead of WiFi
- Contact me - tunnel may be down

---

### Step 2: Test Login Endpoint from Phone Browser 📱

**Purpose:** Verify the specific login endpoint works

1. **On phone browser, visit:**
   ```
   https://intercessional-unfudged-sanjuanita.ngrok-free.dev/api/auth/login
   ```

2. **Expected result:**
   ```json
   {"detail":"Method Not Allowed"}
   ```
   ✅ **This is GOOD!** It means:
   - Server is reachable
   - Endpoint exists
   - Only POST requests allowed (GET not allowed = "Method Not Allowed")

❌ **If you see 404 or connection error:**
- Backend is not accessible
- Wrong URL

---

### Step 3: Install and Open the App 📲

1. **Transfer APK to phone:**
   - Email it to yourself
   - Use USB cable
   - Use cloud storage (Google Drive, Dropbox)
   - ADB: `adb install mobile-apk-new/app-debug.apk`

2. **Install APK:**
   - Allow "Install from unknown sources" if prompted
   - Install the app

3. **Open ZIAMIS app:**
   - You should see the login screen

---

### Step 4: Watch Backend Logs While Testing 👁️

**Before you test login on phone**, run this on Codespace:

```bash
docker logs farmer-backend -f --tail 20
```

Keep this terminal open. You'll see:
- ✅ **When app connects:** Requests appearing in logs
- ❌ **If no logs:** App is not reaching backend

---

### Step 5: Try to Login 🔐

**Credentials:**
- **Email:** `admin@ziamis.gov.zm`
- **Password:** `Admin@2024`

**Watch for these scenarios:**

#### Scenario A: Success ✅
- Brief spinner/loading
- Redirects to dashboard
- Backend logs show: `POST /api/auth/login → 200`

#### Scenario B: Wrong Credentials ⚠️
- Error: "Invalid credentials"
- Backend logs show: `POST /api/auth/login → 401`
- **This is good!** Means app is connecting

#### Scenario C: Network Error ❌
- Error: "Network error" or "Cannot connect"
- **No logs in backend** (no requests received)
- **Problem:** App cannot reach backend

#### Scenario D: Timeout ⏱️
- Loading spinner for 10+ seconds
- Then timeout error
- **Problem:** Request not reaching backend or backend not responding

---

### Step 6: Collect Debug Information 🔍

**If login doesn't work, collect this information:**

#### On Your Phone:
1. **Screenshot of the error message**
2. **What exactly does the error say?**
   - "Network error"
   - "Invalid credentials"
   - "Connection timeout"
   - "Cannot reach server"
   - Something else?

3. **Test browser again:**
   - Can you still access `/docs` in phone browser?
   - Yes or No?

4. **Phone details:**
   - Android version (e.g., Android 12, 13, 14)
   - On WiFi or Mobile Data?

#### On Codespace:
1. **Check if any requests appeared in logs:**
   ```bash
   docker logs farmer-backend --tail 50 | grep -i "auth"
   ```

2. **Check ngrok tunnel is still active:**
   ```bash
   curl http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url'
   ```

3. **Test backend directly:**
   ```bash
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@ziamis.gov.zm","password":"Admin@2024"}' | jq
   ```

---

## Common Problems & Quick Fixes

### Problem: "Network Error" in app, browser test works ✅❌

**Diagnosis:** APK built with wrong URL or missing `/api` prefix

**Solution:**
```bash
# 1. Check what URL is in the APK
cat frontend/.env.production

# 2. Rebuild APK
./rebuild-mobile.sh "https://intercessional-unfudged-sanjuanita.ngrok-free.dev"

# 3. Wait for build (2-3 minutes)
# 4. Download new APK
rm -rf mobile-apk-new
gh run download $(gh run list --workflow build-android.yml --limit 1 --json databaseId --jq '.[0].databaseId') -n ziamis-debug-apk -D ./mobile-apk-new

# 5. Transfer and reinstall on phone
```

---

### Problem: ngrok Warning Page "Visit Site" 🚧

**Diagnosis:** ngrok free tier shows warning on first visit

**Solution:**
1. On phone browser, visit the ngrok URL
2. Click "Visit Site"
3. Try app again

**Prevention:**
- Already configured ngrok authtoken (should skip warning)
- If still appears, it's a one-time thing per session

---

### Problem: Backend Logs Show No Requests 📭

**Diagnosis:** App is not reaching backend at all

**Possible Causes:**
1. **Wrong URL in APK**
   - Check: `cat frontend/.env.production`
   - Should match current ngrok URL

2. **App using cached old URL**
   - Uninstall app completely
   - Clear app data (Settings → Apps → ZIAMIS → Storage → Clear Data)
   - Reinstall fresh APK

3. **Phone network blocking connection**
   - Try on different WiFi
   - Try on mobile data
   - Check if corporate firewall blocks ngrok domains

4. **ngrok tunnel down**
   - Check: `pgrep -f ngrok` (should return PID)
   - Restart: `nohup ngrok http 8000 > ngrok.log 2>&1 &`

---

### Problem: CORS Error ⛔

**Diagnosis:** Backend rejects request due to origin mismatch

**Solution:**
Backend already configured to allow all origins with ngrok. Should not happen.

If it does:
```bash
# Check backend logs for CORS errors
docker logs farmer-backend | grep -i cors
```

---

## Advanced Debugging: Inspect APK Configuration 🔧

To verify what URL is compiled into the APK:

```bash
# Extract APK
cd /tmp
unzip /workspaces/Phase1/mobile-apk-new/app-debug.apk

# Search for API URL in JavaScript bundles
grep -r "intercessional-unfudged-sanjuanita" assets/ 2>/dev/null | head -5

# Should see the ngrok URL in the compiled JS files
```

---

## Testing Checklist ✓

Before contacting for help, verify:

- [ ] Backend is running: `docker ps | grep backend`
- [ ] ngrok is running: `pgrep -f ngrok`
- [ ] ngrok URL is correct: `curl http://localhost:4040/api/tunnels | jq`
- [ ] Backend responds: `curl https://intercessional-unfudged-sanjuanita.ngrok-free.dev/docs`
- [ ] Login endpoint works: `curl -X POST https://intercessional-unfudged-sanjuanita.ngrok-free.dev/api/auth/login`
- [ ] Phone browser can access ngrok URL
- [ ] Phone browser can access `/docs`
- [ ] APK file is correct: `ls -lh mobile-apk-new/app-debug.apk`
- [ ] `.env.production` has correct URL: `cat frontend/.env.production`

---

## Get Live Help 🆘

If still stuck, run this and send me the output:

```bash
# Comprehensive diagnostic
./test-mobile-setup.sh > debug-output.txt 2>&1

# Add backend logs
echo -e "\n\n=== BACKEND LOGS ===" >> debug-output.txt
docker logs farmer-backend --tail 50 >> debug-output.txt 2>&1

# Add ngrok status
echo -e "\n\n=== NGROK STATUS ===" >> debug-output.txt
curl -s http://localhost:4040/api/tunnels >> debug-output.txt 2>&1

# Add .env.production
echo -e "\n\n=== ENV PRODUCTION ===" >> debug-output.txt
cat frontend/.env.production >> debug-output.txt 2>&1

# Show me the file
cat debug-output.txt
```

Then tell me:
1. **What error do you see in the app?** (exact message)
2. **Does phone browser work?** (can you access `/docs`?)
3. **Do backend logs show any requests?** (when you try to login)

---

## Expected Timeline ⏰

- **Setup verification:** 2 minutes
- **Browser tests:** 1 minute  
- **App install:** 1-2 minutes
- **Login test:** 30 seconds
- **Total:** ~5 minutes

If any step takes longer or fails, **stop and collect debug info** from that step.
