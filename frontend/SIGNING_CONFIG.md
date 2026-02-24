# 🔐 Signing Configuration Template

## Android Signing

### Generate Keystore

```bash
cd frontend
./scripts/create-keystore.sh
```

### GitHub Secrets (for CI/CD)

Add these secrets to your GitHub repository:
Settings → Secrets and variables → Actions → New repository secret

1. **RELEASE_KEYSTORE_BASE64**
   ```bash
   base64 -w 0 cem-release-key.keystore | pbcopy  # macOS
   base64 -w 0 cem-release-key.keystore > keystore.txt  # Linux
   ```
   Copy the content and paste as secret value

2. **RELEASE_KEYSTORE_PASSWORD**
   - Your keystore password

3. **RELEASE_KEY_ALIAS**
   - Default: `cem-farmer-key`

4. **RELEASE_KEY_PASSWORD**
   - Your key password (can be same as keystore password)

### Local Environment Variables

For local development, add to `~/.bashrc` or `~/.zshrc`:

```bash
export RELEASE_KEYSTORE_FILE="$HOME/.android/cem-release-key.keystore"
export RELEASE_KEYSTORE_PASSWORD="your_store_password_here"
export RELEASE_KEY_ALIAS="cem-farmer-key"
export RELEASE_KEY_PASSWORD="your_key_password_here"
```

---

## iOS Signing

### Configure in Xcode

1. Open project:
   ```bash
   cd frontend
   npx cap open ios
   ```

2. Select "App" target → Signing & Capabilities

3. Choose your Team and Signing Certificate

### Certificates Required

- **Development**: For testing on devices
- **Distribution**: For App Store submission

### Provisioning Profiles

- **Development**: For internal testing
- **Ad Hoc**: For beta testing (TestFlight)
- **App Store**: For production release

---

## Security Best Practices

❌ **NEVER commit these files:**
- `*.keystore`
- `*.p12`
- `*.mobileprovision`
- Any file containing passwords

✅ **DO commit:**
- `.gitignore` (with signing files excluded)
- Build scripts (without credentials)
- Documentation

---

## Keystore Information Template

Keep this information in a secure location (password manager):

```
App: CEM Farmer
Platform: Android
Keystore File: cem-release-key.keystore
Keystore Password: [REDACTED]
Key Alias: cem-farmer-key
Key Password: [REDACTED]
Validity: 10000 days
DN: CN=CEM, OU=Agriculture, O=Government of Zambia, L=Lusaka, ST=Lusaka, C=ZM
Created: [DATE]
Expires: [DATE]
```

---

## Verification

### Verify Android Signing

```bash
# Check keystore
keytool -list -v -keystore cem-release-key.keystore

# Verify signed APK
jarsigner -verify -verbose -certs app-release.apk

# Get APK signature
apksigner verify --print-certs app-release.apk
```

### Verify iOS Signing

```bash
# Check certificate
security find-identity -v -p codesigning

# Verify IPA
codesign -dv --verbose=4 App.ipa
```

---

## Troubleshooting

### "Keystore not found"
Ensure `RELEASE_KEYSTORE_FILE` points to the correct path:
```bash
echo $RELEASE_KEYSTORE_FILE
ls -la $RELEASE_KEYSTORE_FILE
```

### "Wrong password"
Double-check environment variables:
```bash
echo $RELEASE_KEYSTORE_PASSWORD
echo $RELEASE_KEY_PASSWORD
```

### "Certificate expired" (iOS)
Renew certificate in Apple Developer Portal

---

## Recovery

### Lost Keystore (Android)
⚠️ **Cannot recover!** You'll need to:
1. Generate new keystore
2. Update app with new signature
3. Users must uninstall old app and install new one

### Lost Certificate (iOS)
Can be revoked and regenerated in Apple Developer Portal
