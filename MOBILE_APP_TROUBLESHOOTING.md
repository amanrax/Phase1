# Mobile App Troubleshooting Guide

**Last Updated:** December 7, 2025

## Current Status
- ✅ ngrok tunnel: `https://intercessional-unfudged-sanjuanita.ngrok-free.dev`
- ✅ Backend: Running and healthy on port 8000
- ✅ APK Location: `./mobile-apk-new/app-debug.apk`

## Quick Diagnostic Checklist

### 1. **Verify APK Has Correct URL**
The APK was built with ngrok URL. To confirm:
```bash
# Check what URL was used when building
cat frontend/.env.production
```
Expected: `VITE_API_PROD_URL=https://intercessional-unfudged-sanjuanita.ngrok-free.dev`

### 2. **Test Backend Connectivity from Phone**
**On your phone's browser**, visit:
```
https://intercessional-unfudged-sanjuanita.ngrok-free.dev/docs
```
✅ **Should see:** FastAPI documentation page
❌ **If not working:** ngrok tunnel issue (see section below)

### 3. **Test Login Endpoint Directly**
**On your phone's browser**, visit:
```
https://intercessional-unfudged-sanjuanita.ngrok-free.dev/auth/login
```
✅ **Should see:** JSON error like `{"detail":"Method Not Allowed"}` (this is GOOD - means server is responding)
❌ **If timeout/connection error:** Network or tunnel issue

### 4. **Check ngrok Tunnel Status**
```bash
# Run on Codespace
curl http://localhost:4040/api/tunnels | jq
```
Look for:
- `"public_url": "https://intercessional-unfudged-sanjuanita.ngrok-free.dev"`
- `"status": "online"`

### 5. **Verify Backend Logs**
```bash
# Check backend logs for incoming requests
docker logs farmer-backend --tail 50 -f
```
When you try to login on the mobile app, you should see requests appearing here.

## Common Issues & Solutions

### Issue 1: "Network Error" or "Connection Failed"
**Symptoms:** App shows network error, can't reach server

**Test:**
1. Open phone browser → visit ngrok URL/docs
2. If browser CAN access it but app CANNOT:
   - **Problem:** APK was built with wrong URL
   - **Solution:** Rebuild APK (see section below)

3. If browser CANNOT access it:
   - **Problem:** ngrok tunnel or backend down
   - **Solution:** Restart tunnel (see section below)

### Issue 2: ngrok "Visit Site" Warning Page
**Symptoms:** Phone browser shows ngrok warning page asking to click "Visit Site"

**Cause:** ngrok free tier shows warning page on first visit

**Solution:**
1. On phone browser, visit the ngrok URL
2. Click "Visit Site" button
3. Now try the app again

**Alternative:** Use ngrok authtoken to skip this (already configured)

### Issue 3: Wrong APK Downloaded/Installed
**Symptoms:** App connects to wrong server or localhost

**Check:** 
```bash
# List all downloaded APKs
ls -lh mobile-apk-new/
```

**Solution:** Make sure you installed the file from `mobile-apk-new/app-debug.apk`

### Issue 4: Backend Not Running
**Symptoms:** ngrok tunnel works but returns errors

**Check:**
```bash
docker ps --filter "name=backend"
```

**Solution:**
```bash
docker-compose up -d backend
```

## How to Restart Everything

### Restart ngrok Tunnel
```bash
# Kill existing tunnel
pkill ngrok

# Start new tunnel (in background)
nohup ngrok http 8000 > ngrok.log 2>&1 &

# Wait 2 seconds for tunnel to start
sleep 2

# Get new URL
NEW_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
echo "New ngrok URL: $NEW_URL"

# Update .env.production
cd frontend
echo "# Mobile app production configuration" > .env.production
echo "# Last updated: $(date)" >> .env.production
echo "VITE_API_PROD_URL=$NEW_URL" >> .env.production
echo "VITE_API_BASE_URL=$NEW_URL" >> .env.production

# Rebuild APK
cd ..
./rebuild-mobile.sh "$NEW_URL"
```

### Restart Backend
```bash
docker-compose restart backend
```

### Full System Restart
```bash
# Restart all services
docker-compose down
docker-compose up -d

# Wait for backend to be healthy
sleep 10

# Restart ngrok
pkill ngrok
nohup ngrok http 8000 > ngrok.log 2>&1 &
sleep 2

# Get URL and rebuild
NEW_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
./rebuild-mobile.sh "$NEW_URL"
```

## Testing Steps (On Phone)

### Step 1: Browser Test
1. Open browser on your phone
2. Visit: `https://intercessional-unfudged-sanjuanita.ngrok-free.dev/docs`
3. ✅ Should see FastAPI Swagger documentation

### Step 2: Install APK
1. Transfer `mobile-apk-new/app-debug.apk` to phone
2. Install (allow unknown sources if needed)
3. Open ZIAMIS app

### Step 3: Login Test
Use these credentials:
- **Email:** `admin@ziamis.gov.zm`
- **Password:** `Admin@2024`

### Step 4: Watch Logs
While testing on phone, watch Codespace logs:
```bash
# Terminal 1: Backend logs
docker logs farmer-backend -f

# Terminal 2: ngrok requests
curl http://localhost:4040/api/requests/http | jq
```

## Debug Information to Collect

If still not working, collect this info:

### On Codespace:
```bash
# 1. Current ngrok URL
curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url'

# 2. Backend status
docker ps --filter "name=backend"

# 3. .env.production content
cat frontend/.env.production

# 4. Recent backend logs
docker logs farmer-backend --tail 20

# 5. Test from Codespace
curl -I https://intercessional-unfudged-sanjuanita.ngrok-free.dev/docs
```

### On Phone:
1. Screenshot of error message in app
2. Screenshot of browser test (visiting ngrok URL/docs)
3. Android version
4. App version (check in app settings if available)

### What Happens When Login:
1. App sends POST request to: `https://intercessional-unfudged-sanjuanita.ngrok-free.dev/auth/login`
2. ngrok forwards to: `http://localhost:8000/auth/login`
3. Backend processes request and returns JWT token
4. App stores token and redirects to dashboard

## Expected Behavior

### Successful Login Flow:
1. Enter credentials → Click Login
2. Brief loading spinner
3. Redirect to Dashboard
4. See "Welcome, Admin" message

### Failed Login (Wrong Credentials):
1. Enter credentials → Click Login
2. Red error message: "Invalid credentials"
3. Stay on login screen

### Failed Login (Network Error):
1. Enter credentials → Click Login
2. Error message: "Network error" or "Cannot reach server"
3. **This means:** App can't reach the backend URL

## Quick Test Script

Run this on Codespace to verify everything:
```bash
./test-mobile-setup.sh
```

This will test:
- ✅ ngrok tunnel running
- ✅ Backend responding
- ✅ .env.production configured
- ✅ APK file exists
- ✅ Endpoints accessible

## Next Steps If Still Not Working

1. **Run the test script:** `./test-mobile-setup.sh`
2. **On phone browser:** Visit ngrok URL to verify connectivity
3. **Collect debug info** using commands above
4. **Check backend logs** while attempting login
5. **Try rebuilding APK** with current ngrok URL

## Important Notes

⚠️ **ngrok URL changes** when:
- Codespace restarts
- ngrok process is killed/restarted
- After ~8 hours (free tier session limit)

When URL changes, you **must rebuild and reinstall** the APK.

⚠️ **APK caches old URL** - uninstalling and reinstalling may help if you suspect wrong URL is cached.

⚠️ **First-time ngrok warning** - You may need to click "Visit Site" on ngrok warning page (do this in phone browser first).
