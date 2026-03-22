import { Platform } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GOOGLE_OAUTH_WEB_CLIENT_ID } from '../config/googleDrive';
import { backupService } from './BackupService';

const DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
/** Single file in the hidden appDataFolder (only this app can access it). */
const DRIVE_BACKUP_NAME = 'CwBudgetTracker-appdata-backup.json';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const id = GOOGLE_OAUTH_WEB_CLIENT_ID?.trim();
  if (!id) {
    throw new Error('GOOGLE_OAUTH_NOT_CONFIGURED');
  }
  GoogleSignin.configure({
    webClientId: id,
    scopes: [DRIVE_APPDATA_SCOPE],
    offlineAccess: false,
  });
  configured = true;
}

async function interactiveSignIn(): Promise<void> {
  const res = await GoogleSignin.signIn();
  if (res.type !== 'success') {
    const err = new Error(
      res.type === 'cancelled' ? 'SIGN_IN_CANCELLED' : 'SIGN_IN_FAILED',
    ) as Error & { code?: string };
    if (res.type === 'cancelled') err.code = statusCodes.SIGN_IN_CANCELLED;
    throw err;
  }
}

async function ensureSignedInForDrive(): Promise<void> {
  ensureConfigured();
  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  let signedInUser = GoogleSignin.getCurrentUser();

  // Cached user can be stale (e.g. OAuth client ID or signing cert changed); tokens then fail.
  if (signedInUser) {
    try {
      await GoogleSignin.getTokens();
    } catch {
      await GoogleSignin.signOut();
      signedInUser = null;
    }
  }

  if (!signedInUser && GoogleSignin.hasPreviousSignIn()) {
    try {
      const silent = await GoogleSignin.signInSilently();
      if (silent.type === 'success') {
        signedInUser = silent.data;
      }
    } catch {
      await GoogleSignin.signOut();
      signedInUser = null;
    }
  }

  if (!signedInUser) {
    await interactiveSignIn();
  }

  const scopeAdd = await GoogleSignin.addScopes({ scopes: [DRIVE_APPDATA_SCOPE] });
  if (scopeAdd && scopeAdd.type === 'cancelled') {
    const err = new Error('SIGN_IN_CANCELLED') as Error & { code?: string };
    err.code = statusCodes.SIGN_IN_CANCELLED;
    throw err;
  }
}

async function getAccessToken(): Promise<string> {
  const tokens = await GoogleSignin.getTokens();
  if (!tokens.accessToken) {
    throw new Error('No access token from Google Sign-In.');
  }
  return tokens.accessToken;
}

function formatDriveError(status: number, text: string): string {
  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: string; errors?: Array<{ message?: string; reason?: string }> };
    };
    const msg = parsed?.error?.message || parsed?.error?.errors?.[0]?.message;
    const reason = parsed?.error?.errors?.[0]?.reason;
    if (msg && reason) return `${status}: ${msg} (${reason})`;
    if (msg) return `${status}: ${msg}`;
    if (reason) return `${status}: ${reason}`;
  } catch {
    // ignore
  }
  return text || `HTTP ${status}`;
}

async function driveFetchJson(
  url: string,
  accessToken: string,
  init?: RequestInit,
): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers as Record<string, string>),
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(formatDriveError(res.status, text));
  }
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

type BackupFileMeta = { id: string; modifiedTime?: string };

/** All files matching the backup name (handles legacy duplicates). */
async function listBackupFilesMeta(accessToken: string): Promise<BackupFileMeta[]> {
  const out: BackupFileMeta[] = [];
  let pageToken: string | undefined;
  const q = encodeURIComponent(`name='${DRIVE_BACKUP_NAME.replace(/'/g, "\\'")}' and trashed=false`);
  for (;;) {
    let url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=nextPageToken,files(id,modifiedTime)&q=${q}&supportsAllDrives=true&pageSize=100`;
    if (pageToken) {
      url += `&pageToken=${encodeURIComponent(pageToken)}`;
    }
    const json = (await driveFetchJson(url, accessToken)) as {
      files?: Array<{ id?: string; modifiedTime?: string }>;
      nextPageToken?: string;
    };
    for (const f of json.files ?? []) {
      if (typeof f.id === 'string') {
        out.push({ id: f.id, modifiedTime: f.modifiedTime });
      }
    }
    pageToken = json.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

function sortNewestBackupFirst(files: BackupFileMeta[]): void {
  files.sort((a, b) => {
    const ta = new Date(a.modifiedTime || 0).getTime();
    const tb = new Date(b.modifiedTime || 0).getTime();
    return tb - ta;
  });
}

async function deleteDriveFile(fileId: string, accessToken: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(formatDriveError(res.status, text));
  }
}

/** Create empty file in appDataFolder, then upload bytes (avoids multipart/related issues on RN fetch). */
async function createEmptyAppDataFile(accessToken: string): Promise<string> {
  const url =
    'https://www.googleapis.com/drive/v3/files?fields=id&supportsAllDrives=true';
  const json = (await driveFetchJson(url, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({
      name: DRIVE_BACKUP_NAME,
      parents: ['appDataFolder'],
      mimeType: 'application/json',
    }),
  })) as { id?: string };
  const id = json?.id;
  if (typeof id !== 'string') {
    throw new Error('Drive did not return a file id when creating backup.');
  }
  return id;
}

async function uploadMediaFull(fileId: string, accessToken: string, body: string): Promise<void> {
  const url = `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media&supportsAllDrives=true`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatDriveError(res.status, text));
  }
}

async function downloadFileMedia(fileId: string, accessToken: string): Promise<string> {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(formatDriveError(res.status, text));
  }
  return text;
}

export const googleDriveBackupService = {
  isConfigured(): boolean {
    return GOOGLE_OAUTH_WEB_CLIENT_ID.trim().length > 0;
  },

  /**
   * Uploads the latest backup and replaces any previous cloud copy: updates the newest file by
   * modified time, deletes older duplicate files with the same name (if any).
   */
  async uploadBackup(): Promise<void> {
    const { content } = await backupService.createBackupPayload();
    await ensureSignedInForDrive();
    const accessToken = await getAccessToken();
    const files = await listBackupFilesMeta(accessToken);
    sortNewestBackupFirst(files);
    if (files.length === 0) {
      const newId = await createEmptyAppDataFile(accessToken);
      await uploadMediaFull(newId, accessToken, content);
      return;
    }
    await uploadMediaFull(files[0].id, accessToken, content);
    for (let i = 1; i < files.length; i++) {
      await deleteDriveFile(files[i].id, accessToken);
    }
  },

  async restoreBackup(): Promise<void> {
    await ensureSignedInForDrive();
    const accessToken = await getAccessToken();
    const files = await listBackupFilesMeta(accessToken);
    sortNewestBackupFirst(files);
    if (files.length === 0) {
      throw new Error('NO_CLOUD_BACKUP');
    }
    const json = await downloadFileMedia(files[0].id, accessToken);
    await backupService.restoreFromJsonContent(json, 'Google Drive');
  },
};
