# 🎯 Building ZIAMIS Mobile App - Options

## Current Situation

The mobile app code is **100% ready**! However, GitHub Codespaces doesn't have Android SDK pre-installed. Here are your options to build the APK:

---

## ✅ Option 1: Build Locally (Recommended - 10 minutes)

### Prerequisites
- Windows, macOS, or Linux
- Node.js 18+ installed
- Android Studio installed

### Steps

1. **Clone the repository** (or download it):
   ```bash
   git clone https://github.com/amanrax/Phase1.git
   cd Phase1
   ```

2. **Switch to farmer-edit-fix branch**:
   ```bash
   git checkout farmer-edit-fix
   ```

3. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

4. **Build the web app**:
   ```bash
   npm run build
   ```

5. **Sync with Capacitor**:
   ```bash
   npx cap sync
   ```

6. **Open in Android Studio**:
   ```bash
   npx cap open android
   ```

7. **Build APK in Android Studio**:
   - Wait for Gradle sync to complete
   - Click **Build → Build Bundle(s) / APK(s) → Build APK**
   - APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🚀 Option 2: GitHub Actions (Automated - FREE)

Create a workflow to build automatically in the cloud:

### Create `.github/workflows/build-android.yml`:

```yaml
name: Build Android APK

on:
  push:
    branches: [ farmer-edit-fix, main ]
  workflow_dispatch:  # Manual trigger

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        
    - name: Setup Java 17
      uses: actions/setup-java@v4
      with:
        distribution: 'temurin'
        java-version: '17'
        
    - name: Install dependencies
      working-directory: ./frontend
      run: npm install
      
    - name: Build web app
      working-directory: ./frontend
      run: npm run build
      
    - name: Sync Capacitor
      working-directory: ./frontend
      run: npx cap sync
      
    - name: Build APK
      working-directory: ./frontend/android
      run: |
        chmod +x ./gradlew
        ./gradlew assembleDebug
        
    - name: Upload APK
      uses: actions/upload-artifact@v4
      with:
        name: app-debug
        path: frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

### After creating the workflow:

1. **Commit and push**:
   ```bash
   git add .github/workflows/build-android.yml
   git commit -m "Add Android build workflow"
   git push
   ```

2. **Run the workflow**:
   - Go to GitHub → Actions tab
   - Select "Build Android APK"
   - Click "Run workflow"
   - Wait ~5-10 minutes
   - Download APK from artifacts

---

## 📦 Option 3: Use Build Script in Codespace (Partial)

You can prepare everything in Codespace, then finish locally:

```bash
cd /workspaces/Phase1/frontend

# Build web app (this works in Codespace)
npm run build

# Sync Capacitor (this works too)
npx cap sync

# Download the entire frontend/android folder
# Then on local machine with Android Studio:
# - Open the android folder
# - Build APK
```

---

## 🎨 Option 4: EAS Build (Expo Application Services)

If you want cloud building without local setup:

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Configure EAS**:
   ```bash
   cd /workspaces/Phase1/frontend
   eas build:configure
   ```

4. **Build in cloud**:
   ```bash
   eas build --platform android
   ```

Note: Requires Expo account (free tier available)

---

## 📱 Option 5: Install APK Tool & Build (Advanced)

Install Android SDK in Codespace:

```bash
# This takes ~10-15 minutes and ~8GB space
cd ~
wget https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip
unzip commandlinetools-linux-9477386_latest.zip -d android-sdk
export ANDROID_HOME=~/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/bin:$ANDROID_HOME/platform-tools

# Install SDK components
sdkmanager --sdk_root=$ANDROID_HOME --install "platform-tools" "platforms;android-34" "build-tools;34.0.0"

# Then build
cd /workspaces/Phase1/frontend/android
./gradlew assembleDebug
```

---

## ✅ Recommended Approach

**For fastest results**: Use **Option 1** (Build Locally)

**For CI/CD**: Use **Option 2** (GitHub Actions)

**For no local setup**: Use **Option 4** (EAS Build)

---

## 📊 What's Already Done

✅ React app built and optimized
✅ Capacitor configured (`capacitor.config.ts`)
✅ Android project generated (`frontend/android/`)
✅ iOS project generated (`frontend/ios/`)
✅ PWA manifest configured
✅ App icons ready (all sizes)
✅ Splash screen configured
✅ Web assets synced to native platforms

**All you need is to run the final Android build step!**

---

## 🐛 Troubleshooting

### If build fails locally:

```bash
# Clean Gradle cache
cd frontend/android
./gradlew clean

# Delete build folders
rm -rf app/build
rm -rf build

# Rebuild
./gradlew assembleDebug
```

### If Capacitor sync fails:

```bash
cd frontend
npm run build
npx cap sync --force
```

---

## 📲 After Building

Once you have `app-debug.apk`:

1. **Transfer to phone**:
   - USB, email, Google Drive, etc.

2. **Install on phone**:
   - Enable "Install from Unknown Sources"
   - Open APK file
   - Install

3. **Test the app**:
   - Login as admin or operator
   - Register farmers
   - Generate ID cards
   - Test offline mode

---

## 🎓 Resources

- Android Studio: https://developer.android.com/studio
- Capacitor: https://capacitorjs.com/docs
- EAS Build: https://docs.expo.dev/build/introduction/
- GitHub Actions: https://docs.github.com/actions

---

Need help with any of these options? Let me know which one you'd like to proceed with!
