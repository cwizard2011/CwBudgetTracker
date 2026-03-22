/**
 * OAuth 2.0 client IDs for `GoogleSignin.configure({ webClientId })`.
 *
 * **Must be type "Web application"** (same Google Cloud / Firebase project as the Android app,
 * e.g. `cw-budgettracker`). Do **not** use the **Android** OAuth client id here — that commonly
 * leads to DEVELOPER_ERROR or 403 access_denied on the consent screen.
 * Firebase: Project settings → Your apps → Web app → Web client ID. Or Google Cloud → Credentials.
 *
 * Register **SHA-1** fingerprints: `cd android && ./gradlew :app:signingReport` → Firebase Android app
 * `com.cwbudgettracker`.
 *
 * **Enable Google Drive API** on the **same** Google Cloud project as these Web client IDs (project
 * number is the digits before the first hyphen in the client id). Console → APIs & Services →
 * Library → “Google Drive API” → Enable. If you see “Drive API has not been used in project …”,
 * enable it on that project number.
 *
 * **403 access_denied:** OAuth consent screen in "Testing" → add the Google account under **Test users**;
 * or user tapped Block / denied Drive access. See https://react-native-google-signin.github.io/docs/troubleshooting
 *
 * Debug vs release: `__DEV__` selects DEBUG vs PROD (can point to the same Web client if you prefer).
 */
const GOOGLE_OAUTH_WEB_CLIENT_ID_DEBUG =
  '434356332670-3dtelogsdflm8ala9giipf5qr0qq0sii.apps.googleusercontent.com';

const GOOGLE_OAUTH_WEB_CLIENT_ID_PROD =
  '434356332670-f7879gdf3ol0cq6esh2787d82g82dlv1.apps.googleusercontent.com';

/** Resolved Web client ID for @react-native-google-signin/google-signin. */
export const GOOGLE_OAUTH_WEB_CLIENT_ID = __DEV__
  ? GOOGLE_OAUTH_WEB_CLIENT_ID_DEBUG
  : GOOGLE_OAUTH_WEB_CLIENT_ID_PROD;
