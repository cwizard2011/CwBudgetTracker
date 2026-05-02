# Release Workflow

This document outlines the complete workflow for releasing a new version of BudgetTracker to the Google Play Store.

## Step 1: Update Version Numbers

Update the version in both files. Use semantic versioning (MAJOR.MINOR.PATCH):

### 1.1 Update `package.json`
```bash
# Open package.json and update the version field
# Example: "version": "2.3.0"
```

### 1.2 Update `android/app/build.gradle`
```bash
# Update both versionCode and versionName in android/app/build.gradle
# versionCode: increment by 1 (internal Android version number)
# versionName: use semantic versioning (e.g., "2.3.0")

# Example:
# versionCode 15  // Increment this for each Play Store release
# versionName "2.3.0"  // Use semantic versioning (major.minor.patch)
```

### 1.3 Commit Version Bump
```bash
git add package.json android/app/build.gradle
git commit -m "Bump version to X.Y.Z for Play Store release"
```

---

## Step 2: Create Release Notes for All Locales

Release notes must be **500 characters maximum** for each locale. Follow this format:

### Supported Locales:
- **EN** (English)
- **PT** (Portuguese)
- **FR** (French)
- **ES** (Spanish)
- **DE** (German)

### Create a file: `RELEASE_NOTES.md`

Format for each locale:

```markdown
## Release X.Y.Z - [Release Date]

### EN (English)
[Max 500 characters describing the changes, improvements, and bug fixes]

### PT (Portuguese)
[Max 500 characters describing the changes, improvements, and bug fixes in Portuguese]

### FR (French)
[Max 500 characters describing the changes, improvements, and bug fixes in French]

### ES (Spanish)
[Max 500 characters describing the changes, improvements, and bug fixes in Spanish]

### DE (German)
[Max 500 characters describing the changes, improvements, and bug fixes in German]
```

### Example Release Notes Structure:

```markdown
## Release 2.3.0 - May 2, 2026

### EN (English)
✨ New Features:
- Improved home screen layout with better spacing
- Enhanced user interface responsiveness

🐛 Bug Fixes:
- Fixed excessive padding on HomeScreen
- Optimized layout calculations

📱 Overall: BudgetTracker 2.3.0 brings UI refinements and stability improvements for a better budgeting experience.
[Character count: 245/500]

### PT (Portuguese)
✨ Novas Funcionalidades:
- Layout melhorado da tela inicial com melhor espaçamento
- Interface do usuário mais responsiva

🐛 Correções de Bugs:
- Padding excessivo corrigido na HomeScreen
- Cálculos de layout otimizados

📱 Geral: BudgetTracker 2.3.0 traz refinamentos de UI e melhorias de estabilidade para uma melhor experiência de orçamento.
[Character count: 285/500]

### FR (French)
✨ Nouvelles Fonctionnalités:
- Disposition améliorée de l'écran d'accueil avec meilleur espacement
- Interface utilisateur plus réactive

🐛 Corrections de Bugs:
- Rembourrage excessif corrigé sur HomeScreen
- Calculs de disposition optimisés

📱 Général: BudgetTracker 2.3.0 apporte des raffinements d'interface et des améliorations de stabilité pour une meilleure expérience budgétaire.
[Character count: 290/500]

### ES (Spanish)
✨ Nuevas Funcionalidades:
- Diseño mejorado de la pantalla de inicio con mejor espaciado
- Interfaz de usuario más receptiva

🐛 Correcciones de Errores:
- Relleno excesivo corregido en HomeScreen
- Cálculos de diseño optimizados

📱 General: BudgetTracker 2.3.0 trae refinamientos de interfaz y mejoras de estabilidad para una mejor experiencia presupuestaria.
[Character count: 280/500]

### DE (German)
✨ Neue Funktionen:
- Verbessertes Startbildschirm-Layout mit besserer Abstände
- Reaktionsfähigere Benutzeroberfläche

🐛 Fehlerkorrektionen:
- Übermäßiges Padding auf HomeScreen behoben
- Layout-Berechnungen optimiert

📱 Gesamt: BudgetTracker 2.3.0 bringt UI-Verfeinerungen und Stabilitätsverbesserungen für ein besseres Budget-Erlebnis.
[Character count: 285/500]
```

---

## Step 3: Create Release Bundle for Google Play Store

### 3.1 Configure Release Signing

Ensure your environment variables are set:

```bash
export MYAPP_UPLOAD_STORE_FILE=/Users/cwizard/Desktop/development/personal/BudgetTracker/android/app/release.keystore
export MYAPP_UPLOAD_STORE_PASSWORD=your-store-password
export MYAPP_UPLOAD_KEY_ALIAS=cwbudgettracker
export MYAPP_UPLOAD_KEY_PASSWORD=your-key-password
```

Or add them to `~/.zshrc` or `~/.bash_profile` for persistence.

### 3.2 Build the Release Bundle

```bash
npm run android:bundle:release
```

This creates:
- **Output**: `android/app/build/outputs/bundle/release/app-release.aab`
- **File Size**: Typically 30-50MB
- **Format**: Android App Bundle (AAB) — preferred for Play Store

### 3.3 Verify the Bundle

```bash
# Check if file exists and has reasonable size
ls -lh android/app/build/outputs/bundle/release/app-release.aab
```

---

## Step 4: Upload to Google Play Store

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app: **BudgetTracker**
3. Navigate to **Release > Production**
4. Click **Create new release**
5. Upload the `.aab` file from `android/app/build/outputs/bundle/release/app-release.aab`
6. Add release notes for each language (from Step 2)
7. Review the version details
8. Click **Review release** and then **Confirm rollout**

---

## Complete Release Checklist

- [ ] Updated version in `package.json`
- [ ] Updated `versionCode` in `android/app/build.gradle`
- [ ] Updated `versionName` in `android/app/build.gradle`
- [ ] Created release notes for all 5 locales (EN, PT, FR, ES, DE)
- [ ] Each release note is ≤ 500 characters
- [ ] Committed version bump with `git commit`
- [ ] Built release bundle with `npm run android:bundle:release`
- [ ] Verified `.aab` file exists: `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] Uploaded to Google Play Console
- [ ] Added release notes in Google Play Console
- [ ] Confirmed rollout in Play Store

---

## Quick Command Reference

```bash
# 1. Update versions (edit files manually)
# Then commit:
git add package.json android/app/build.gradle
git commit -m "Bump version to X.Y.Z for Play Store release"

# 2. Set signing env vars (if not already set)
export MYAPP_UPLOAD_STORE_FILE=/Users/cwizard/Desktop/development/personal/BudgetTracker/android/app/release.keystore
export MYAPP_UPLOAD_STORE_PASSWORD=your-store-password
export MYAPP_UPLOAD_KEY_ALIAS=cwbudgettracker
export MYAPP_UPLOAD_KEY_PASSWORD=your-key-password

# 3. Build release bundle
npm run android:bundle:release

# 4. Verify
ls -lh android/app/build/outputs/bundle/release/app-release.aab

# 5. Upload to Play Store via Google Play Console (manual step)
```

---

## Troubleshooting

### Build Fails with "Keystore not found"
- Verify environment variables are set correctly
- Check keystore file exists: `ls -la android/app/release.keystore`

### Build Fails with "Invalid keystore password"
- Verify `MYAPP_UPLOAD_STORE_PASSWORD` is correct
- Re-run with correct credentials

### Bundle Too Large
- Check `node_modules` for unused dependencies
- Verify ProGuard/R8 is enabled in `build.gradle`
- Confirm resources shrinking is enabled

### Version Code Already Exists
- Increment `versionCode` to the next integer
- Ensure it's higher than any previous released version

---

## Notes

- **Android App Bundle (AAB)** is the modern format preferred by Google Play Store
- The versionCode must always increase with each release
- Release notes are the first thing users see about your update
- Testing on a device or emulator before release is recommended
- Google Play may take 2-4 hours to process and distribute the new version
