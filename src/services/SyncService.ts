import NetInfo from '@react-native-community/netinfo';
import firestore from '@react-native-firebase/firestore';
import { LocalStorage } from './LocalStorage';

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
      const budgets = budgetsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const loans = loansSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Safety: never wipe local data just because remote is empty.
      // This can happen if Firestore is misconfigured, points at a new/empty project,
      // or if the app is used without user scoping but remote collections are empty.
      const [localBudgets, localLoans] = await Promise.all([
        LocalStorage.getBudgets(),
        LocalStorage.getLoans(),
      ]);

      const shouldApplyBudgets = budgets.length > 0 || localBudgets.length === 0;
      const shouldApplyLoans = loans.length > 0 || localLoans.length === 0;

      await Promise.all([
        shouldApplyBudgets ? LocalStorage.saveBudgets(budgets as any) : Promise.resolve(),
        shouldApplyLoans ? LocalStorage.saveLoans(loans as any) : Promise.resolve(),
      ]);
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
