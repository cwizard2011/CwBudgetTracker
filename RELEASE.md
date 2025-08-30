# Release Build Instructions

## Android Release Build

### 1. Generate a Keystore
```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias cwbudgettracker -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Configure Signing
Either set environment variables:
```bash
export MYAPP_UPLOAD_STORE_FILE=/Users/cwizard/Desktop/development/personal/BudgetTracker/android/app/release.keystore
export MYAPP_UPLOAD_STORE_PASSWORD=your-store-password
export MYAPP_UPLOAD_KEY_ALIAS=cwbudgettracker
export MYAPP_UPLOAD_KEY_PASSWORD=your-key-password
```

Or update `android/app/keystore.properties` with your keystore details.

### 3. Build Release Bundle (AAB)
```bash
npm run android:bundle:release
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`

### 4. Build Release APK (optional)
```bash
npm run android:assemble:release
```
Output: `android/app/build/outputs/apk/release/app-release.apk`

## iOS Release Build

### 1. Build for Device
```bash
DEVICE_ID=your-device-id npm run ios:device:update:release
```

### 2. Build for Simulator
```bash
npm run ios:simulator:build:release
```

## Release Checklist

- [x] Console logs stripped in production (via babel-plugin-transform-remove-console)
- [x] ProGuard/R8 enabled for Android
- [x] Resources shrinking enabled for Android
- [x] Version codes updated (Android: versionCode=2, versionName="1.1.0")
- [x] Release signing configured
- [x] Assets optimized
- [x] Release build scripts added to package.json

## Notes

- The Android release build uses R8 for code shrinking and optimization
- iOS builds use the Release configuration which includes optimization
- Both platforms strip console logs in production via Babel plugin
- Android bundle (.aab) is preferred for Play Store submission
- Remember to increment versionCode for each Play Store release
