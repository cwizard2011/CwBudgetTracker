import NetInfo from '@react-native-community/netinfo';
import firestore from '@react-native-firebase/firestore';
import { LocalStorage } from './LocalStorage';

/** Union local + remote by id so Firestore never wipes records that exist only on device (e.g. after backup restore). */
function mergeRecordsById<T extends { id: string; createdAt?: number; updatedAt?: number }>(
  local: T[],
  remote: T[],
): T[] {
  const byId = new Map<string, T>();
  for (const row of local) {
    if (row && typeof row.id === 'string') {
      byId.set(row.id, row);
    }
  }
  for (const row of remote) {
    if (!row || typeof row.id !== 'string') {
      continue;
    }
    const prev = byId.get(row.id);
    if (!prev) {
      byId.set(row.id, row);
      continue;
    }
    const tr = row.updatedAt ?? row.createdAt ?? 0;
    const tl = prev.updatedAt ?? prev.createdAt ?? 0;
    byId.set(row.id, tr >= tl ? row : prev);
  }
  return Array.from(byId.values());
}

class SyncService {
  private unsubscribeNetInfo: (() => void) | null = null;
  private syncing = false;

  start() {
    if (this.unsubscribeNetInfo) return; // already started
    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      if (state.isInternetReachable) {
        this.sync();
      }
    });
  }

  stop() {
    this.unsubscribeNetInfo?.();
    this.unsubscribeNetInfo = null;
  }

  private async pushPending() {
    try {
      const pending = await LocalStorage.getPendingMutations();
      if (!pending.length) return;

      const batch = firestore().batch();
      const budgetsCollection = firestore().collection('budgets');
      const loansCollection = firestore().collection('loans');

      for (const mutation of pending) {
        switch (mutation.collection) {
          case 'budgets': {
            const ref = budgetsCollection.doc(mutation.payload.id);
            mutation.type === 'delete'
              ? batch.delete(ref)
              : batch.set(ref, mutation.payload, { merge: true });
            break;
          }
          case 'loans': {
            const ref = loansCollection.doc(mutation.payload.id);
            mutation.type === 'delete'
              ? batch.delete(ref)
              : batch.set(ref, mutation.payload, { merge: true });
            break;
          }
        }
      }

      await batch.commit();
      await LocalStorage.clearPendingMutations();
    } catch (e) {
      console.warn('Push pending failed', e);
    }
  }

  private async pullRemote() {
    try {
      const [budgetsSnap, loansSnap] = await Promise.all([
        firestore().collection('budgets').get(),
        firestore().collection('loans').get(),
      ]);
      const budgets = budgetsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Array<{
        id: string;
        createdAt?: number;
        updatedAt?: number;
      }>;
      const loans = loansSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Array<{
        id: string;
        createdAt?: number;
        updatedAt?: number;
      }>;

      const [localBudgets, localLoans] = await Promise.all([
        LocalStorage.getBudgets(),
        LocalStorage.getLoans(),
      ]);

      // Never replace local with an empty remote snapshot (misconfigured / new project).
      const nextBudgets =
        budgets.length === 0 && localBudgets.length > 0 ? localBudgets : mergeRecordsById(localBudgets, budgets as any);
      const nextLoans =
        loans.length === 0 && localLoans.length > 0 ? localLoans : mergeRecordsById(localLoans, loans as any);

      await Promise.all([LocalStorage.saveBudgets(nextBudgets as any), LocalStorage.saveLoans(nextLoans as any)]);
    } catch (e) {
      console.warn('Pull remote failed', e);
    }
  }

  private async sync() {
    if (this.syncing) return;
    this.syncing = true;
    try {
      await this.pushPending();
      await this.pullRemote();
    } finally {
      this.syncing = false;
    }
  }
}

export const syncService = new SyncService();
