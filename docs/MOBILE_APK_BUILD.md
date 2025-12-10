# Mobile APK Build Guide

This summarizes how the APK is built and why it works now.

## What changed
- Routing fixed for mobile: `HashRouter` in `frontend/src/App.tsx` avoids `file://` issues in Capacitor.
- API base URL now comes from `.env.production` (`VITE_API_PROD_URL`/`VITE_API_BASE_URL`).
- Current example URL (Codespaces): `https://animated-cod-9grvj4gpw77f7xww-8000.app.github.dev`.
- CORS in backend is already permissive for ngrok/codespaces; add your domains before production launch.

## Required tooling
- Node 20+
- Android SDK (with `sdkmanager`, `platform-tools`, and a recent build-tools; Java 17)
- Capacitor CLI (`npx cap ...` is fine)

## Local build steps
1) Set production API URL:
   - Edit `frontend/.env.production`:
     - `VITE_API_PROD_URL=https://your-api-domain`
     - `VITE_API_BASE_URL=https://your-api-domain`
2) Build web assets:
   - `cd frontend`
   - `npm ci`
   - `npm run build`
3) Sync Capacitor:
   - `npx cap sync android`
4) Build APK:
   - `cd android`
   - `chmod +x gradlew`
   - `./gradlew assembleDebug`
5) Output:
   - `frontend/android/app/build/outputs/apk/debug/app-debug.apk`

## CI build (GitHub Actions)
- Workflow: `.github/workflows/build-android.yml`
- Trigger: push to `farmer-edit-fix` or `main`
- Artifact name: `ziamis-debug-apk`
- Download via GitHub Actions UI or `gh run download <run-id> --name ziamis-debug-apk`

## Mobile runtime URL logic
- `frontend/src/utils/axios.ts` + `frontend/src/config/mobile.ts` read `VITE_API_PROD_URL` when running under Capacitor.
- If not set, they fall back to `VITE_API_BASE_URL`, then localhost (useful only for emulators).

## CORS reminder
- Before going live with your own domain, add it to CORS allowlist in the backend (FastAPI middleware) and rebuild.

## Signing (optional for release)
- For debug we ship unsigned debug keys. For a release APK/AAB, generate a keystore and configure `android/gradle.properties` + `android/app/build.gradle` signingConfig.
