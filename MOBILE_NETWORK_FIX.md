# 🔧 Fixing Mobile App Network Error

## Problem
The mobile app shows "network error" because it's trying to connect to `localhost:8000`, which doesn't work on a mobile device. The phone can't access "localhost" of the Codespace.

---

## ✅ Solutions (Choose One)

### 🎯 Solution 1: Use ngrok (Recommended for Testing)

**Easiest way to test with your Codespace backend**

1. **Install ngrok** (if not already):
   ```bash
   # In Codespace terminal
   curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
   echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
   sudo apt update && sudo apt install ngrok
   ```

2. **Sign up and get auth token**:
   - Go to https://dashboard.ngrok.com/signup
   - Get your auth token
   - Run: `ngrok config add-authtoken YOUR_TOKEN`

3. **Start ngrok tunnel**:
   ```bash
   ngrok http 8000
   ```

4. **Copy the HTTPS URL** (example: `https://abc123.ngrok.io`)

5. **Update `.env.production`**:
   ```bash
   cd /workspaces/Phase1/frontend
   nano .env.production
   ```
   
   Change to:
   ```env
   VITE_API_PROD_URL=https://YOUR-NGROK-URL.ngrok.io
   VITE_API_BASE_URL=https://YOUR-NGROK-URL.ngrok.io
   ```

6. **Rebuild the app**:
   ```bash
   npm run build
   npx cap sync
   cd android && ./gradlew assembleDebug
   ```

7. **Install new APK** on your phone

---

### 🌐 Solution 2: Use Local Network IP (Same WiFi)

**If your phone and computer are on the same WiFi network**

1. **Find your computer's local IP**:
   
   **Windows**:
   ```cmd
   ipconfig
   ```
   Look for "IPv4 Address" (example: 192.168.1.100)
   
   **Mac/Linux**:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   # OR
   ip addr show | grep "inet " | grep -v 127.0.0.1
   ```

2. **Update `.env.production`**:
   ```env
   VITE_API_PROD_URL=http://192.168.1.100:8000
   VITE_API_BASE_URL=http://192.168.1.100:8000
   ```
   (Replace with YOUR actual IP)

3. **Update Android config** to allow HTTP:
   
   Edit `frontend/android/app/src/main/AndroidManifest.xml`:
   ```xml
   <application
       android:usesCleartextTraffic="true"
       ...>
   ```

4. **Make sure backend is accessible**:
   ```bash
   # Backend must listen on 0.0.0.0 not 127.0.0.1
   # In docker-compose.yml, backend ports should be:
   ports:
     - "0.0.0.0:8000:8000"
   ```

5. **Rebuild and install**

---

### 🚀 Solution 3: Deploy Backend to Production

**For permanent production use**

1. **Deploy backend** to a cloud service:
   - **Railway**: https://railway.app
   - **Render**: https://render.com
   - **DigitalOcean**: https://digitalocean.com
   - **AWS/Azure/GCP**

2. **Get the public URL** (example: `https://api.ziamis.gov.zm`)

3. **Update `.env.production`**:
   ```env
   VITE_API_PROD_URL=https://api.ziamis.gov.zm
   VITE_API_BASE_URL=https://api.ziamis.gov.zm
   ```

4. **Rebuild the app**

---

## 🔨 Quick Fix Script

Save this as `rebuild-mobile.sh`:

```bash
#!/bin/bash
# Quick rebuild mobile app with new API URL

echo "🔧 Rebuilding mobile app..."

# Check if ngrok URL is provided
if [ -z "$1" ]; then
    echo "Usage: ./rebuild-mobile.sh https://your-ngrok-url.ngrok.io"
    exit 1
fi

API_URL=$1

# Update .env.production
cd /workspaces/Phase1/frontend
cat > .env.production << EOF
VITE_API_PROD_URL=${API_URL}
VITE_API_BASE_URL=${API_URL}
EOF

echo "✅ Updated .env.production with: $API_URL"

# Build
npm run build
npx cap sync android

# Build APK
cd android
./gradlew assembleDebug

echo "✅ APK built: android/app/build/outputs/apk/debug/app-debug.apk"
```

**Usage**:
```bash
chmod +x rebuild-mobile.sh
./rebuild-mobile.sh https://abc123.ngrok.io
```

---

## 📱 Testing the Fix

After rebuilding with correct API URL:

1. Install the new APK
2. Open the app
3. Try to login:
   - Email: `admin@ziamis.gov.zm`
   - Password: `Admin@2024`

If successful, you should see the dashboard!

---

## 🐛 Troubleshooting

### Still getting network error?

1. **Check backend is running**:
   ```bash
   curl http://localhost:8000/api/health
   # OR
   curl https://your-ngrok-url.ngrok.io/api/health
   ```

2. **Check CORS settings** in `backend/app/main.py`:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],  # For testing
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

3. **Check Android logs**:
   ```bash
   adb logcat | grep -i "network\|http\|error"
   ```

4. **Verify .env file was used**:
   - Check `frontend/dist/assets/` files contain your API URL

---

## 🎯 Recommended Quick Start

**For immediate testing (5 minutes)**:

```bash
# Terminal 1: Start ngrok
ngrok http 8000

# Terminal 2: Rebuild app
cd /workspaces/Phase1/frontend
# Edit .env.production with ngrok URL
npm run build
npx cap sync
cd android && ./gradlew assembleDebug

# Install new APK on phone
```

---

## 💡 Pro Tip

For frequent testing, keep ngrok URL stable:
1. Get ngrok paid plan (or free static domain)
2. Use reserved domain in `.env.production`
3. No need to rebuild for each test session

---

Need help? Check which solution works best for your setup!
