# Android & iOS: Allowing HTTP (Development) and Network Security

This document shows safe, minimal changes to allow cleartext (HTTP) traffic for development builds
and the recommended production approach (HTTPS). Apply only the changes needed for your build type.

---

## 1) Android - network_security_config.xml (recommended way)

Create `android/app/src/main/res/xml/network_security_config.xml` with:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <domain-config cleartextTrafficPermitted="true">
    <!-- Allow your development host -->
    <domain includeSubdomains="false">13.204.83.198</domain>
  </domain-config>
</network-security-config>
```

Then reference it in `AndroidManifest.xml` (application element):

```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    android:usesCleartextTraffic="true"
    ...>
    ...
</application>
```

Notes:
- This approach restricts cleartext to the specified domain only.
- `android:usesCleartextTraffic="true"` is a broader flag (applies app-wide). Prefer `network_security_config` for domain-level control.

---

## 2) Android - Manifest quick dev option

If you prefer the quick dev toggle (less secure):

```xml
<application android:usesCleartextTraffic="true" ...>
  ...
</application>
```

Use this only for local testing; remove or tighten before production.

---

## 3) Capacitor config (already applied)

We set `frontend/capacitor.config.ts` to:

```ts
server: {
  androidScheme: 'http',
  cleartext: true,
  allowNavigation: ['13.204.83.198', '13.204.83.198:8000']
},
android: { allowMixedContent: true }
```

This config helps the Capacitor WebView allow HTTP during development. Keep it in dev builds only.

---

## 4) iOS (Info.plist) - temporary exception for development

Add to `Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSExceptionDomains</key>
  <dict>
    <key>13.204.83.198</key>
    <dict>
      <key>NSTemporaryExceptionAllowsInsecureHTTPLoads</key>
      <true/>
      <key>NSTemporaryExceptionRequiresForwardSecrecy</key>
      <false/>
    </dict>
  </dict>
</dict>
```

Again, prefer HTTPS for production and remove exceptions before release.

---

## 5) Production (recommended)

1. Put HTTPS in front of your backend (ALB with ACM cert, or CloudFront + ACM). Do not use raw IP for TLS.
2. Update `VITE_API_BASE_URL` / `VITE_MOBILE_API_URL` to `https://api.yourdomain.com` and rebuild signed APK.
3. Restrict security groups to required sources.

---

## 6) Quick verification steps (device)

- Uninstall old APK: `adb uninstall com.ziamis.farmer` (or your app id)
- Install new debug APK
- From device browser open: `http://13.204.83.198:8000/api/health`
- If failing, capture logs: `adb logcat` while attempting login

---

If you'd like, I can create the `network_security_config.xml` file into the Android project (if present) and update `AndroidManifest.xml` for you. Tell me to proceed and I'll patch files and commit them.
