import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

const BACKUP_FILE_PREFIX = 'cwbudgettracker-backup-';
const BACKUP_FILE_EXT = '.json';
const KEY_BUDGETS = 'budgets';
const KEY_LOANS = 'loans';
const KEY_PENDING_MUTATIONS = 'pending_mutations';

interface BackupPayloadV1 {
  schemaVersion: 1;
  app: 'CwBudgetTracker';
  createdAt: number;
  data: Record<string, string>;
}

function formatTimestampForFile(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

function backupDirectories(): string[] {
  const dirs = [RNFS.DownloadDirectoryPath, RNFS.DocumentDirectoryPath].filter(Boolean) as string[];
  return Array.from(new Set(dirs));
}

function isBackupFilename(name: string): boolean {
  return name.startsWith(BACKUP_FILE_PREFIX) && name.endsWith(BACKUP_FILE_EXT);
}

function normalizeBackupData(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid backup format.');
  }

  // Preferred structured payload
  const maybePayload = raw as Partial<BackupPayloadV1>;
  if (maybePayload.schemaVersion === 1 && maybePayload.app === 'CwBudgetTracker' && maybePayload.data && typeof maybePayload.data === 'object') {
    const entries = Object.entries(maybePayload.data);
    const valid = entries.filter(([, v]) => typeof v === 'string') as Array<[string, string]>;
    return Object.fromEntries(valid);
  }

  // Backward-compatible plain key/value object
  const entries = Object.entries(raw as Record<string, unknown>);
  const valid = entries.filter(([, v]) => typeof v === 'string') as Array<[string, string]>;
  if (!valid.length) {
    throw new Error('Backup file is empty or invalid.');
  }
  return Object.fromEntries(valid);
}

function buildSafetyPendingMutations(data: Record<string, string>): string | null {
  const pending: Array<{ collection: 'budgets' | 'loans'; type: 'create'; payload: any }> = [];

  try {
    const budgets = JSON.parse(data[KEY_BUDGETS] || '[]');
    if (Array.isArray(budgets)) {
      budgets.forEach(item => {
        if (item && typeof item === 'object' && typeof item.id === 'string') {
          pending.push({ collection: 'budgets', type: 'create', payload: item });
        }
      });
    }
  } catch {
    // ignore invalid payloads
  }

  try {
    const loans = JSON.parse(data[KEY_LOANS] || '[]');
    if (Array.isArray(loans)) {
      loans.forEach(item => {
        if (item && typeof item === 'object' && typeof item.id === 'string') {
          pending.push({ collection: 'loans', type: 'create', payload: item });
        }
      });
    }
  } catch {
    // ignore invalid payloads
  }

  if (!pending.length) return null;
  return JSON.stringify(pending);
}

function normalizeReadablePath(path: string): string {
  let normalized = path.trim();
  if (normalized.startsWith('file://')) {
    normalized = normalized.replace('file://', '');
  }
  try {
    normalized = decodeURI(normalized);
  } catch {
    // keep original when URI decoding fails
  }
  return normalized;
}

async function collectStorageData(): Promise<Record<string, string>> {
  const keys = await AsyncStorage.getAllKeys();
  if (!keys.length) return {};
  const pairs = await AsyncStorage.multiGet(keys);
  const data: Record<string, string> = {};
  for (const [key, value] of pairs) {
    if (typeof value === 'string') data[key] = value;
  }
  return data;
}

async function findLatestBackupFilePath(): Promise<string | null> {
  const files: Array<{ path: string; mtimeMs: number }> = [];
  for (const dir of backupDirectories()) {
    try {
      const list = await RNFS.readDir(dir);
      for (const file of list) {
        if (!file.isFile() || !isBackupFilename(file.name)) continue;
        const mtimeMs = file.mtime ? new Date(file.mtime).getTime() : 0;
        files.push({ path: file.path, mtimeMs });
      }
    } catch {
      // ignore unreadable directories
    }
  }
  if (!files.length) return null;
  files.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return files[0].path;
}

async function buildBackupPayload(): Promise<{ content: string; fileName: string; keysCount: number }> {
  const data = await collectStorageData();
  const payload: BackupPayloadV1 = {
    schemaVersion: 1,
    app: 'CwBudgetTracker',
    createdAt: Date.now(),
    data,
  };
  const fileName = `${BACKUP_FILE_PREFIX}${formatTimestampForFile(new Date())}${BACKUP_FILE_EXT}`;
  const content = JSON.stringify(payload, null, 2);
  return { content, fileName, keysCount: Object.keys(data).length };
}

async function applyRestoreFromParsedContent(content: string, resultLabel: string) {
  const parsed = JSON.parse(content) as unknown;
  const data = normalizeBackupData(parsed);
  const safetyPending = buildSafetyPendingMutations(data);
  if (safetyPending) {
    data[KEY_PENDING_MUTATIONS] = safetyPending;
  }
  const entries = Object.entries(data);

  await AsyncStorage.clear();
  if (entries.length) {
    await AsyncStorage.multiSet(entries);
  }

  return { path: resultLabel, keysCount: entries.length };
}

export const backupService = {
  async createBackupPayload() {
    return buildBackupPayload();
  },

  async createBackup() {
    const { content, fileName, keysCount } = await buildBackupPayload();
    const dirs = backupDirectories();
    let lastError: unknown = null;

    for (const dir of dirs) {
      const path = `${dir}/${fileName}`;
      try {
        await RNFS.writeFile(path, content, 'utf8');
        return { path, keysCount };
      } catch (e) {
        lastError = e;
      }
    }

    throw lastError || new Error('Failed to write backup file.');
  },

  async restoreFromJsonContent(content: string, sourceLabel = 'Google Drive') {
    return applyRestoreFromParsedContent(content, sourceLabel);
  },

  async restoreFromPath(path: string) {
    const normalizedPath = normalizeReadablePath(path);
    if (!normalizedPath) {
      throw new Error('No restore file selected.');
    }
    const exists = await RNFS.exists(normalizedPath);
    if (!exists) {
      throw new Error('Selected restore file was not found.');
    }

    const content = await RNFS.readFile(normalizedPath, 'utf8');
    return applyRestoreFromParsedContent(content, normalizedPath);
  },

  async restoreLatestBackup() {
    const path = await findLatestBackupFilePath();
    if (!path) {
      throw new Error('No backup file found.');
    }
    return this.restoreFromPath(path);
  },
};

