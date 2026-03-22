/** Android `DEVELOPER_ERROR` / code 10 = Firebase/Google Cloud config mismatch (SHA-1, package name, or client ID type). */
export function isGoogleSignInDeveloperError(error: unknown): boolean {
  const e = error as { code?: string | number; message?: string };
  const code = e?.code;
  const msg = String(e?.message ?? '');
  if (code === 10 || code === '10') return true;
  if (msg.includes('DEVELOPER_ERROR')) return true;
  if (msg.includes('Developer console is not set up')) return true;
  return false;
}

/** OAuth consent returned 403 / access_denied (wrong client type, test user list, or user denied scopes). */
export function isGoogleOAuthAccessDenied(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? '');
  if (/\baccess_denied\b/i.test(msg)) return true;
  if (/403/.test(msg) && /access denied/i.test(msg)) return true;
  return false;
}

/** Drive REST API returned 403 because Drive API is disabled for the GCP project tied to the OAuth token. */
export function isGoogleDriveApiDisabledError(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? '');
  if (msg.includes('Google Drive API has not been used')) return true;
  if (msg.includes('drive.googleapis.com/overview')) return true;
  if (/403/.test(msg) && /drive\.googleapis\.com/i.test(msg) && /disabled|has not been used/i.test(msg)) {
    return true;
  }
  return false;
}

/** Drive returned 403/507 etc. because the user's Google storage quota is full (upload/update). */
export function isGoogleDriveStorageQuotaError(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? '');
  if (/storageQuotaExceeded/i.test(msg)) return true;
  if (/drive storage quota/i.test(msg)) return true;
  if (/insufficient.*storage|storage.*full/i.test(msg)) return true;
  if (/507/.test(msg) && /insufficient/i.test(msg)) return true;
  return false;
}
