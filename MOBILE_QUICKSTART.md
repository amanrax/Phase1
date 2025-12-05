# 🌾 CEM Mobile Quick Start

## What's Been Set Up

✅ **Phase 1 Complete - PWA Ready**
- Progressive Web App manifest
- Service worker for offline support
- Mobile-optimized meta tags
- PWA icon structure

✅ **Phase 2 Ready - Capacitor Integration**
- Capacitor configuration files
- Mobile environment handling
- Build scripts and automation

## Next Steps

### 1. Install Dependencies (5 minutes)

```bash
cd frontend
npm install
```

This installs Capacitor and all required packages.

### 2. Generate Icons (Optional)

Replace placeholder icons with your branded CEM icons:

```bash
# Quick placeholder generation
./generate-icons.sh

# OR use proper tool (recommended)
npm install -g pwa-asset-generator
pwa-asset-generator your-logo.svg frontend/public/icons
```

### 3. Configure Production API

Edit `frontend/.env.production`:

```env
VITE_API_PROD_URL=https://your-production-api.com
VITE_API_BASE_URL=https://your-production-api.com
```

### 4. Build Mobile App

**Option A: Automated (Recommended)**
```bash
cd frontend
./build-mobile.sh
```

**Option B: Manual**
```bash
cd frontend
npm run build
npx cap add android
npx cap add ios
npx cap sync
```

### 5. Open in IDE

**Android Studio:**
```bash
npm run cap:open:android
```

**Xcode (macOS only):**
```bash
npm run cap:open:ios
```

### 6. Run on Device

- **Android**: Click Run button in Android Studio
- **iOS**: Click Run button in Xcode

## Testing the PWA (Web)

Before building mobile, test PWA features:

```bash
cd frontend
npm run build
npm run preview
```

Open in browser and check:
- Lighthouse PWA score (should be 90+)
- "Install app" prompt
- Offline functionality

## Key Files Created

```
frontend/
├── capacitor.config.ts          # Capacitor configuration
├── build-mobile.sh              # Automated build script
├── .env.development             # Dev environment
├── .env.production              # Production environment
├── public/
│   ├── manifest.json            # PWA manifest
│   ├── service-worker.js        # Service worker
│   └── icons/                   # App icons (72-512px)
├── src/
│   ├── config/
│   │   └── mobile.ts            # Mobile API config
│   └── registerSW.ts            # Service worker registration
```

## Build Commands Reference

```bash
# Development
npm run dev                      # Start dev server

# Production web build
npm run build                    # Build for web
npm run preview                  # Preview production build

# Mobile builds
npm run build:mobile             # Build web + sync Capacitor
npm run cap:sync                 # Sync web files to mobile
npm run cap:open:android         # Open Android Studio
npm run cap:open:ios             # Open Xcode
```

## Common Issues

### "Capacitor not found"
```bash
cd frontend
npm install
```

### "Android SDK not found"
Set ANDROID_HOME:
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools
```

### "API not reachable"
- Check `.env.production` has correct API URL
- Ensure API uses HTTPS (not HTTP)
- Verify CORS is enabled on backend

### Icons not showing
- Run `./generate-icons.sh` or create proper PNG icons
- Icons must be in `frontend/public/icons/`
- Sizes: 72, 96, 128, 144, 152, 192, 384, 512

## Documentation

- Full guide: `CEM_MOBILE_BUILD_GUIDE.md`
- Capacitor docs: https://capacitorjs.com/docs
- PWA checklist: https://web.dev/pwa-checklist/

## Need Help?

1. Check the full guide: `CEM_MOBILE_BUILD_GUIDE.md`
2. Run web build first to isolate issues
3. Test PWA features in browser before mobile build
4. Verify API connectivity separately

---

**Ready to build?** Start with step 1 above! 🚀
