import React, { createContext, useContext, useEffect, useState } from 'react';
import uuid from 'react-native-uuid';
import { Budget } from '../models/Budget';
import { LocalStorage } from '../services/LocalStorage';
import { syncService } from '../services/SyncService';

const generateUniqueId = (baseId: string, dateISO: string) => `${baseId}-${dateISO}-${Math.random().toString(36).substr(2, 9)}`;

interface BudgetContextValue {
  budgets: Budget[];
  addBudget: (input: {
    title: string;
    amountPlanned: number;
    period: string; // YYYY-MM
    category?: string;
    categoryIcon?: string;
    recurring?: 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'none';
    anchorDateISO?: string;
    dateISO?: string;
    recurringStopISO?: string;
    notes?: string;
    items: { id: string; name: string; amount: number, isCompleted: boolean }[];
  }) => Promise<void>;
  updateSpent: (budgetId: string, amountDelta: number) => Promise<void>;
  updateBudget: (budgetId: string, updates: Partial<Budget>) => Promise<void>;
  updateBudgetSingle: (budgetId: string, updates: Partial<Budget>) => Promise<void>;
  updateBudgetSeries: (budgetId: string, updates: Partial<Budget>) => Promise<void>;
  updateBudgetFuture: (budgetId: string, updates: Partial<Budget>) => Promise<void>;
  deleteBudget: (budgetId: string) => Promise<void>;
  deleteBudgetSingle: (budgetId: string) => Promise<void>;
  deleteBudgetSeries: (budgetId: string) => Promise<void>;
}

const BudgetContext = createContext<BudgetContextValue>({} as BudgetContextValue);

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);

  useEffect(() => {
    const load = async () => {
      const stored = await LocalStorage.getBudgets();
      const missingRecurring = buildMissingRecurringOccurrences(stored);
      if (!missingRecurring.length) {
        setBudgets(stored);
        return;
      }

      const next = [...stored, ...missingRecurring];
      setBudgets(next);
      await LocalStorage.saveBudgets(next);
      for (const created of missingRecurring) {
        await LocalStorage.enqueueMutation({ collection: 'budgets', type: 'create', payload: created });
      }
    };
    load();
  }, []);

  function addDays(date: Date, days: number) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  function addMonths(date: Date, months: number) {
    const d = new Date(date.getTime());
    d.setMonth(d.getMonth() + months);
    return d;
  }

  function addYears(date: Date, years: number) {
    const d = new Date(date.getTime());
    d.setFullYear(d.getFullYear() + years);
    return d;
  }

  function toISODate(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function toYearMonth(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  function parseISODateLocal(value?: string): Date | null {
    if (!value) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    const parsed = new Date(y, m - 1, d);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  function dateOfBudget(budget: Budget): Date | null {
    if (budget.dateISO) return parseISODateLocal(budget.dateISO);
    return parseISODateLocal(`${budget.period}-01`);
  }

  function dateKeyOfBudget(budget: Budget): string {
    return budget.dateISO || `${budget.period}-01`;
  }

  function nextRecurringDate(current: Date, recurring: Budget['recurring']): Date {
    switch (recurring) {
      case 'weekly':
        return addDays(current, 7);
      case 'monthly':
        return addMonths(current, 1);
      case 'quarterly':
        return addMonths(current, 3);
      case 'annually':
        return addYears(current, 1);
      default:
        return addMonths(current, 1);
    }
  }

  function cloneItemsForOccurrence(items: Budget['items'], parentId: string, dateISO: string) {
    return (items || []).map(item => ({
      ...item,
      id: generateUniqueId(item.id, dateISO),
      isCompleted: false,
      parent_id: parentId,
    }));
  }

  function buildMissingRecurringOccurrences(existing: Budget[]): Budget[] {
    if (!existing.length) return [];

    const groupedBySeries = new Map<string, Budget[]>();
    for (const budget of existing) {
      if (!budget.recurring || budget.recurring === 'none') continue;
      const groupId = budget.recurringGroupId || budget.id;
      if (!groupedBySeries.has(groupId)) groupedBySeries.set(groupId, []);
      groupedBySeries.get(groupId)!.push(budget);
    }

    if (!groupedBySeries.size) return [];

    const now = new Date();
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const nowTs = Date.now();
    const knownKeys = new Set<string>(existing.map(b => `${b.recurringGroupId || b.id}|${dateKeyOfBudget(b)}`));
    const created: Budget[] = [];

    for (const [groupId, series] of groupedBySeries.entries()) {
      const seed = series.find(s => !s.isAutoGenerated) || series[0];
      const recurrence = seed.recurring;
      if (!recurrence || recurrence === 'none') continue;

      const stopDate = parseISODateLocal(seed.recurringStopISO);
      const horizon = stopDate && stopDate < endOfCurrentMonth ? stopDate : endOfCurrentMonth;

      let latestDate: Date | null = null;
      for (const item of series) {
        const itemDate = dateOfBudget(item);
        if (!itemDate) continue;
        if (!latestDate || itemDate > latestDate) latestDate = itemDate;
      }

      const startFrom = latestDate
        || parseISODateLocal(seed.anchorDateISO)
        || parseISODateLocal(seed.dateISO)
        || parseISODateLocal(`${seed.period}-01`);
      if (!startFrom) continue;

      let cursor = new Date(startFrom.getTime());
      while (true) {
        cursor = nextRecurringDate(cursor, recurrence);
        if (cursor > horizon) break;

        const dateISO = toISODate(cursor);
        const key = `${groupId}|${dateISO}`;
        if (knownKeys.has(key)) continue;

        const occurrence: Budget = {
          ...seed,
          id: uuid.v4().toString(),
          dateISO,
          period: toYearMonth(cursor),
          recurringGroupId: groupId,
          isAutoGenerated: true,
          createdAt: nowTs,
          updatedAt: nowTs,
          amountSpent: 0,
          items: cloneItemsForOccurrence(seed.items, seed.id, dateISO),
        };

        created.push(occurrence);
        knownKeys.add(key);
      }
    }

    return created;
  }

  const persistAndQueueBudgets = async (nextBudgets: Budget[]) => {
    setBudgets(nextBudgets);
    await LocalStorage.saveBudgets(nextBudgets);
    // Enqueue mutation for synchronization
    for (const budget of nextBudgets) {
      await LocalStorage.enqueueMutation({ collection: 'budgets', type: 'update', payload: budget });
    }
  };

  const addBudget: BudgetContextValue['addBudget'] = async ({ title, amountPlanned, period, category, categoryIcon, recurring = 'none', anchorDateISO, dateISO, recurringStopISO, notes, items }) => {
    const now = Date.now();
    const baseId = uuid.v4().toString();
    const recurringGroupId = recurring && recurring !== 'none' ? baseId : undefined;

    const baseBudget: Budget = {
      id: baseId,
      title,
      amountPlanned,
      amountSpent: 0,
      period,
      category,
      categoryIcon,
      recurring,
      anchorDateISO,
      recurringStopISO,
      recurringGroupId,
      isAutoGenerated: false,
      notes,
      dateISO,
      createdAt: now,
      updatedAt: now,
      items: items.map(item => ({ ...item, id: generateUniqueId(item.id, dateISO || 'unknown'), parent_id: baseId })), // Ensure unique item IDs and add parent_id
    };

    let newItems: Budget[] = [baseBudget];

    // Auto-generate future occurrences when recurring with a stop date
    if (recurring && recurring !== 'none' && anchorDateISO && recurringStopISO) {
      try {
        const start = parseISODateLocal(anchorDateISO);
        const end = parseISODateLocal(recurringStopISO);
        if (start && end && end >= start) {
          let cursor = new Date(start.getTime());
          while (true) {
            // advance cursor
            cursor = nextRecurringDate(cursor, recurring);
            if (cursor > end) break;
            const occurrenceISO = toISODate(cursor);
            const occurrence: Budget = {
              ...baseBudget,
              id: uuid.v4().toString(),
              dateISO: occurrenceISO,
              period: toYearMonth(cursor),
              isAutoGenerated: true,
              createdAt: now,
              updatedAt: now,
              amountSpent: 0,
              items: cloneItemsForOccurrence(baseBudget.items, baseId, occurrenceISO),
            };
            newItems.push(occurrence);
          }
        }
      } catch {}
    }

    const next = [...budgets, ...newItems];
    await persistAndQueueBudgets(next);
    syncService.start(); // Start synchronization
  };

  /* Update amount spent */
  const updateSpent: BudgetContextValue['updateSpent'] = async (budgetId, amountDelta) => {
    if (amountDelta === 0) return;
    const next = budgets.map(b =>
      b.id === budgetId
        ? { ...b, amountSpent: Math.max(0, b.amountSpent + amountDelta), updatedAt: Date.now() }
        : b,
    );
    const updated = next.find(b => b.id === budgetId);
    setBudgets(next);
    await LocalStorage.saveBudgets(next);
    if (updated) {
      await LocalStorage.enqueueMutation({ collection: 'budgets', type: 'update', payload: updated });
    }
  };

  /* Update budget fields; when recurring fields change, regenerate auto-occurrences */
  const updateBudget: BudgetContextValue['updateBudget'] = async (budgetId, updates) => {
    const existing = budgets.find(b => b.id === budgetId);
    if (!existing) return;

    const merged: Budget = { ...existing, ...updates, updatedAt: Date.now() } as Budget;

    let working = budgets.slice();

    const scheduleChanged =
      'recurring' in updates || 'anchorDateISO' in updates || 'recurringStopISO' in updates || 'dateISO' in updates;

    if (scheduleChanged) {
      // Remove previous auto-generated occurrences for this series
      if (existing.recurringGroupId) {
        working = working.filter(b => !(b.recurringGroupId === existing.recurringGroupId && b.isAutoGenerated));
      }

      // Ensure group id
      const recurringGroupId = merged.recurring && merged.recurring !== 'none' ? (existing.recurringGroupId || existing.id) : undefined;
      merged.recurringGroupId = recurringGroupId;

      // Regenerate if we have a stop date and a recurrence rule
      const newItems: Budget[] = [];
      if (merged.recurring && merged.recurring !== 'none' && merged.anchorDateISO && merged.recurringStopISO) {
        try {
          const start = parseISODateLocal(merged.anchorDateISO);
          const end = parseISODateLocal(merged.recurringStopISO);
          if (start && end && end >= start) {
            let cursor = new Date(start.getTime());
            while (true) {
              cursor = nextRecurringDate(cursor, merged.recurring);
              if (cursor > end) break;
              const occurrenceISO = toISODate(cursor);
              const occurrence: Budget = {
                ...merged,
                id: uuid.v4().toString(),
                dateISO: occurrenceISO,
                period: toYearMonth(cursor),
                isAutoGenerated: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                amountSpent: 0,
                items: cloneItemsForOccurrence(merged.items, merged.id, occurrenceISO),
              };
              newItems.push(occurrence);
            }
          }
        } catch {}
      }

      // Replace base and append regenerated items
      working = working.map(b => (b.id === budgetId ? merged : b));
      working = [...working, ...newItems];

      setBudgets(working);
      await LocalStorage.saveBudgets(working);
      await LocalStorage.enqueueMutation({ collection: 'budgets', type: 'update', payload: merged });
      for (const item of newItems) {
        await LocalStorage.enqueueMutation({ collection: 'budgets', type: 'create', payload: item });
      }
      return;
    }

    const next = working.map(b => (b.id === budgetId ? merged : b));
    setBudgets(next);
    await LocalStorage.saveBudgets(next);
    await LocalStorage.enqueueMutation({ collection: 'budgets', type: 'update', payload: merged });
  };

  /* Update only this occurrence; if part of a series, detach it */
  const updateBudgetSingle: BudgetContextValue['updateBudgetSingle'] = async (budgetId, updates) => {
    const existing = budgets.find(b => b.id === budgetId);
    if (!existing) return;
    const merged: Budget = {
      ...existing,
      ...updates,
      // Detach from series if applicable
      recurring: 'none',
      recurringGroupId: undefined,
      anchorDateISO: undefined,
      recurringStopISO: undefined,
      isAutoGenerated: false,
      updatedAt: Date.now(),
    } as Budget;
    const next = budgets.map(b => (b.id === budgetId ? merged : b));
    setBudgets(next);
    await LocalStorage.saveBudgets(next);
    await LocalStorage.enqueueMutation({ collection: 'budgets', type: 'update', payload: merged });
  };

  /* Update entire series; resolve base budget and call updateBudget */
  const updateBudgetSeries: BudgetContextValue['updateBudgetSeries'] = async (budgetId, updates) => {
    const existing = budgets.find(b => b.id === budgetId);
    if (!existing) return;
    const baseId = existing.recurringGroupId || existing.id;
    await updateBudget(baseId, updates);
  };

  /* Update only future occurrences (including the selected one) */
  const updateBudgetFuture: BudgetContextValue['updateBudgetFuture'] = async (budgetId, updates) => {
    const target = budgets.find(b => b.id === budgetId);
    if (!target) return;

    // If not a series, behave like single
    if ((!target.recurringGroupId && (!target.recurring || target.recurring === 'none'))) {
      await updateBudgetSingle(budgetId, updates);
      return;
    }

    const now = Date.now();
    const groupId = target.recurringGroupId || target.id;
    const cutoff = target.dateISO || `${target.period}-01`;

    // Remove all occurrences in the series with date >= cutoff, except the selected one itself
    const removed: Budget[] = [];
    let working = budgets.filter(b => {
      const inGroup = b.recurringGroupId === groupId;
      const dateIso = b.dateISO || `${b.period}-01`;
      const isFutureOrCurrent = dateIso >= cutoff;
      const isSelected = b.id === budgetId;
      const toRemove = inGroup && isFutureOrCurrent && !isSelected;
      if (toRemove) removed.push(b);
      return !toRemove;
    });

    // Update the selected occurrence as the new base for the future branch
    const existingIdx = working.findIndex(b => b.id === budgetId);
    if (existingIdx >= 0) {
      const merged: Budget = {
        ...working[existingIdx],
        ...updates,
        recurringGroupId: groupId,
        isAutoGenerated: false,
        updatedAt: now,
      } as Budget;
      working[existingIdx] = merged;

      // If still recurring, regenerate occurrences after cutoff based on possibly updated rule
      const recurrence = merged.recurring;
      const stopISO = merged.recurringStopISO;
      const anchorISO = merged.dateISO || cutoff;
      const itemsToAppend: Budget[] = [];
      if (recurrence && recurrence !== 'none' && stopISO) {
        try {
          const anchor = parseISODateLocal(anchorISO);
          const end = parseISODateLocal(stopISO);
          if (anchor && end && anchor <= end) {
            let cursor = new Date(anchor.getTime());
            while (true) {
              cursor = nextRecurringDate(cursor, recurrence);
              if (cursor > end) break;
              const occurrenceISO = toISODate(cursor);
              const occ: Budget = {
                ...merged,
                id: uuid.v4().toString(),
                dateISO: occurrenceISO,
                period: toYearMonth(cursor),
                isAutoGenerated: true,
                createdAt: now,
                updatedAt: now,
                amountSpent: 0,
                items: cloneItemsForOccurrence(merged.items, merged.id, occurrenceISO),
              };
              itemsToAppend.push(occ);
            }
          }
        } catch {}
      }

      const next = [...working, ...itemsToAppend];
      setBudgets(next);
      await LocalStorage.saveBudgets(next);
      await LocalStorage.enqueueMutation({ collection: 'budgets', type: 'update', payload: working[existingIdx] });
      for (const del of removed) {
        await LocalStorage.enqueueMutation({ collection: 'budgets', type: 'delete', payload: del });
      }
      for (const item of itemsToAppend) {
        await LocalStorage.enqueueMutation({ collection: 'budgets', type: 'create', payload: item });
      }
      return;
    }
  };

  /* Delete budget */
  const deleteBudget: BudgetContextValue['deleteBudget'] = async budgetId => {
    const target = budgets.find(b => b.id === budgetId);
    if (!target) return;
    let next: Budget[];
    // If deleting a base recurring budget, also remove auto-generated siblings in the same series
    if (target.recurringGroupId && !target.isAutoGenerated) {
      next = budgets.filter(b => b.recurringGroupId !== target.recurringGroupId);
    } else {
      next = budgets.filter(b => b.id !== budgetId);
    }
    const deleted = target;
    setBudgets(next);
    await LocalStorage.saveBudgets(next);
    if (deleted) {
      await LocalStorage.enqueueMutation({ collection: 'budgets', type: 'delete', payload: deleted });
    }
  };

  /* Delete only this occurrence */
  const deleteBudgetSingle: BudgetContextValue['deleteBudgetSingle'] = async budgetId => {
    const target = budgets.find(b => b.id === budgetId);
    if (!target) return;
    const next = budgets.filter(b => b.id !== budgetId);
    setBudgets(next);
    await LocalStorage.saveBudgets(next);
    await LocalStorage.enqueueMutation({ collection: 'budgets', type: 'delete', payload: target });
  };

  /* Delete entire series */
  const deleteBudgetSeries: BudgetContextValue['deleteBudgetSeries'] = async budgetId => {
    const target = budgets.find(b => b.id === budgetId);
    if (!target) return;
    const groupId = target.recurringGroupId || target.id;
    const next = budgets.filter(b => b.recurringGroupId !== groupId);
    setBudgets(next);
    await LocalStorage.saveBudgets(next);
    // enqueue delete for each removed item for sync
    for (const removed of budgets.filter(b => b.recurringGroupId === groupId)) {
      await LocalStorage.enqueueMutation({ collection: 'budgets', type: 'delete', payload: removed });
    }
  };

  return (
    <BudgetContext.Provider value={{ budgets, addBudget, updateSpent, updateBudget, updateBudgetSingle, updateBudgetSeries, updateBudgetFuture, deleteBudget, deleteBudgetSingle, deleteBudgetSeries }}>
      {children}
    </BudgetContext.Provider>
  );
};

export const useBudgets = () => useContext(BudgetContext);
