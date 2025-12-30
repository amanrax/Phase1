# Building Mobile APK Locally (Development)

This guide helps you build a development APK that talks to a locally-running backend.

Prerequisites:
- Node.js & npm
- Capacitor & Android Studio (Android SDK + emulator/device)
- Backend running locally on port 8000 (e.g., `uvicorn app.main:app --reload --port 8000`)

Steps:

1. Choose the correct backend host for your device:
  - Android emulator (default): `http://10.0.2.2:8000`
  - Android emulator (modern): `http://10.0.2.2:8000` or `http://localhost:8000` depending on emulator
  - Physical device: your machine IP, e.g. `http://192.168.1.100:8000`

2. From repo root run the helper script (example for emulator):

```bash
chmod +x ./scripts/build_local_apk.sh
./scripts/build_local_apk.sh --mobile-url http://10.0.2.2:8000
```

3. Open Android project in Android Studio and build the APK:

```bash
npx cap open android
# then build/run in Android Studio
```

Notes:
- The script prepares `dist/` with `VITE_MOBILE_API_URL` baked in for the production build.
- If you change the backend URL after installing the app, rebuild the app.
- For quick testing, you can also run the web app in the mobile browser and point to the same backend URL.
