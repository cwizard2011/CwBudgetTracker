---
name: playstore-release
description: >-
  Run the full Google Play Store release workflow for BudgetTracker. Bumps version numbers,
  generates multilingual release notes, and builds the AAB bundle. Use when the user says
  "release", "playstore release", "create a release", "build for playstore", or "publish".
---

# Play Store Release Workflow

When the user asks for a release, execute all three steps in order.

## Step 1: Bump Version Numbers

Read the current values from `android/app/build.gradle`:

```
versionCode NN
versionName "X.Y.Z"
```

- Increment `versionCode` by 1.
- Ask the user what the new `versionName` should be, or infer from context (patch bump by default).
- Update both values in `android/app/build.gradle` using StrReplace.

## Step 2: Generate Release Notes

Analyze all changes since the last release (use `git log` against the previous tag or recent commits).

Write release notes to `docs/release-notes-vX.Y.Z.md` in the Play Store locale format.

**Rules:**
- Each locale block MUST be under 500 characters (Play Store hard limit).
- Use bullet points with `•` (not `-`).
- Keep each bullet to one line — concise and impactful.
- Cover the 5 supported locales: `en-US`, `pt-BR`, `fr-FR`, `es-ES`, `de-DE`.

**Format — copy-paste ready for Play Console:**

```
<en-US>
• Feature one — short description
• Feature two — short description
• Bug fix or improvement
</en-US>

<pt-BR>
• Recurso um — descrição curta
• Recurso dois — descrição curta
</pt-BR>

<fr-FR>
• Fonctionnalité un — description courte
• Fonctionnalité deux — description courte
</fr-FR>

<es-ES>
• Función uno — descripción corta
• Función dos — descripción corta
</es-ES>

<de-DE>
• Funktion eins — kurze Beschreibung
• Funktion zwei — kurze Beschreibung
</de-DE>
```

## Step 3: Build Release Bundle

Run the release bundle build:

```bash
cd /Users/cwizard/Desktop/development/personal/BudgetTracker
npm run android:bundle:release
```

Wait for `BUILD SUCCESSFUL`, then confirm the output file size:

```bash
ls -lh android/app/build/outputs/bundle/release/app-release.aab
```

Report the AAB path and file size to the user.

## Completion Checklist

After all steps, confirm:
- [ ] `versionCode` incremented in `build.gradle`
- [ ] `versionName` updated in `build.gradle`
- [ ] Release notes written to `docs/release-notes-vX.Y.Z.md`
- [ ] Each locale block is under 500 characters
- [ ] AAB built successfully at `android/app/build/outputs/bundle/release/app-release.aab`
