import React, { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { IconButton } from '../../components/ui/IconButton';
import { MonthPicker } from '../../components/ui/MonthPicker';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { useBudgets } from '../../context/BudgetContext';
import { useCategories } from '../../context/CategoryContext';
import { useSettings } from '../../context/SettingsContext';
import { Colors } from '../../theme/colors';
import { formatCurrency } from '../../utils/format';
import { useI18n } from '../../utils/i18n';
import { ConfirmDeleteModal, DeleteModal, FilterModal, GroupModal, SortModal, SpendModal } from './components/Modals';
import { SectionHeader } from './components/SectionHeader';
import { TopActions } from './components/TopActions';

export function BudgetScreen() {
  const { budgets, updateSpent, deleteBudgetSingle, deleteBudgetSeries } = useBudgets() as any;
  const { categories } = useCategories();
  const { locale, currency } = useSettings();
  const t = useI18n();

  const [filterPeriod, setFilterPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [filterCategory, setFilterCategory] = useState<string | undefined>();
  const [groupBy, setGroupBy] = useState<'date' | 'category'>('date');
  const [sortKey, setSortKey] = useState<'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const [spendModalVisible, setSpendModalVisible] = useState(false);
  const [spendAmount, setSpendAmount] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);

  const defaultSortKey: 'date' | 'amount' = 'date';
  const defaultSortDir: 'asc' | 'desc' = 'desc';
  const defaultGroupBy: 'date' | 'category' = 'date';

  const hasCustomView = useMemo(() => {
    return !!(filterCategory || sortKey !== defaultSortKey || sortDir !== defaultSortDir || groupBy !== defaultGroupBy);
  }, [filterCategory, sortKey, sortDir, groupBy]);

  const resetView = () => {
    setFilterCategory(undefined);
    setSortKey(defaultSortKey);
    setSortDir(defaultSortDir);
    setGroupBy(defaultGroupBy);
    setFilterModalVisible(false);
    setSortModalVisible(false);
    setGroupModalVisible(false);
  };

  const openSpendModal = (budgetId: string) => {
    setSelectedBudgetId(budgetId);
    setSpendAmount('');
    setSpendModalVisible(true);
  };
  const openDeleteModal = (budgetId: string) => {
    setSelectedBudgetId(budgetId);
    const b = budgets.find((x: any) => x.id === budgetId);
    const isRecurring = b && b.recurring && b.recurring !== 'none';
    if (isRecurring) setDeleteModalVisible(true);
    else setConfirmDeleteVisible(true);
  };
  // edit scope handled in details screen on Save

  const filtered = useMemo(() => budgets.filter((b: any) => b.period === filterPeriod && (!filterCategory || (b.category || 'Uncategorized') === filterCategory)), [budgets, filterPeriod, filterCategory]);

  function dateKeyOf(b: any): string { return b.dateISO || `${b.period}-01`; }
  function compareItems(a: any, b: any): number {
    const cmp = sortKey === 'date' ? dateKeyOf(a).localeCompare(dateKeyOf(b)) : (a.amountPlanned || 0) - (b.amountPlanned || 0);
    return sortDir === 'asc' ? cmp : -cmp;
  }

  const sections = useMemo(() => {
    const map = new Map<string, typeof budgets>();
    if (groupBy === 'category') {
      filtered.forEach((b: any) => { const k = b.category || 'Uncategorized'; if (!map.has(k)) map.set(k, []); map.get(k)!.push(b); });
    } else {
      filtered.forEach((b: any) => { const k = dateKeyOf(b); if (!map.has(k)) map.set(k, []); map.get(k)!.push(b); });
    }
    for (const [, arr] of map.entries()) arr.sort(compareItems);
    let entries = Array.from(map.entries());
    if (groupBy === 'date') entries.sort((a, b) => (sortDir === 'asc' ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0])));
    else entries.sort((a, b) => a[0].localeCompare(b[0]));
    return entries.map(([key, data]) => ({ title: key, data: collapsed[key] ? [] : data }));
  }, [filtered, groupBy, sortKey, sortDir, collapsed]);

  const summaries = useMemo(() => {
    const byCat = new Map<string, { planned: number; spent: number }>();
    filtered.forEach((b: any) => {
      const k = b.category || 'Uncategorized';
      const s = byCat.get(k) || { planned: 0, spent: 0 };
      s.planned += b.amountPlanned; s.spent += b.amountSpent; byCat.set(k, s);
    });
    return Array.from(byCat.entries()).map(([k, v]) => ({ k, ...v }));
  }, [filtered]);

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <TopActions
        onFilter={() => setFilterModalVisible(true)}
        onSort={() => setSortModalVisible(true)}
        onGroup={() => setGroupModalVisible(true)}
        onAddBudget={() => { const { navigate } = require('../../utils/navigationRef'); (navigate as any)('BudgetDetails'); }}
        onReset={resetView}
        showReset={hasCustomView}
      />

      <View style={[styles.rowWrap, { marginTop: 12, paddingTop: 12 }]}>
        <MonthPicker yearMonth={filterPeriod} onChange={setFilterPeriod} />
      </View>

      <View style={[styles.rowWrap, { marginTop: 12 }]}> 
        <Text style={styles.sectionHeading}>{t('budget.summaries')}</Text>
        {summaries.map(s => (
          <View key={s.k} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ color: Colors.text }}>{s.k}</Text>
            <Text style={{ color: Colors.mutedText }}>{formatCurrency(s.spent, locale, currency)} / {formatCurrency(s.planned, locale, currency)}</Text>
          </View>
        ))}
        {(() => {
          const totalExcess = filtered.reduce((sum: number, b: any) => {
            const over = (b.amountSpent || 0) - (b.amountPlanned || 0);
            return sum + (over > 0 ? over : 0);
          }, 0);
          return (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={{ color: Colors.text, fontWeight: '700' }}>{t('budget.excess')}</Text>
              <Text style={{ color: totalExcess > 0 ? Colors.error : Colors.mutedText, fontWeight: '700' }}>
                {formatCurrency(totalExcess, locale, currency)}
              </Text>
            </View>
          );
        })()}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section: { title } }) => (
          <SectionHeader
            title={title}
            displayTitle={groupBy === 'date' ? new Date(title).toLocaleString(locale, { month: 'long', day: 'numeric', year: 'numeric' }) : title}
            collapsed={!!collapsed[title]}
            onToggle={() => setCollapsed(prev => ({ ...prev, [title]: !prev[title] }))}
          />
        )}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.title}>{item.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <IconButton family="MaterialIcons" name="attach-money" onPress={() => openSpendModal(item.id)} style={{ marginLeft: 4 }} backgroundColor={Colors.successLight} />
                  <IconButton family="MaterialIcons" name="edit" onPress={() => { const { navigate } = require('../../utils/navigationRef'); (navigate as any)('BudgetDetails', { budget: item }); }} style={{ marginLeft: 4 }} backgroundColor={Colors.secondaryLight} />
                  <IconButton family="MaterialIcons" name="delete" onPress={() => openDeleteModal(item.id)} style={{ marginLeft: 4 }} backgroundColor={Colors.errorLight} />
                </View>
              </View>
              <Text style={{ marginBottom: 6, color: Colors.mutedText }}>{formatCurrency(item.amountSpent || 0, locale, currency)} / {formatCurrency(item.amountPlanned || 0, locale, currency)}</Text>
              <ProgressBar progress={item.amountPlanned ? item.amountSpent / item.amountPlanned : 0} fillColor={Colors.success} />
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <SpendModal visible={spendModalVisible} amount={spendAmount} onChange={setSpendAmount} onCancel={() => setSpendModalVisible(false)} onSave={async () => { const amt = parseFloat(spendAmount); if (!isNaN(amt) && amt > 0 && selectedBudgetId) { await updateSpent(selectedBudgetId, amt); setSpendModalVisible(false); } }} />

      <FilterModal visible={filterModalVisible} categories={categories} selected={filterCategory} onSelect={(v?: string) => setFilterCategory(v)} onClose={() => setFilterModalVisible(false)} />
      <SortModal visible={sortModalVisible} sortKey={sortKey} sortDir={sortDir} setSortKey={setSortKey} setSortDir={setSortDir} onClose={() => setSortModalVisible(false)} />
      <GroupModal visible={groupModalVisible} groupBy={groupBy} setGroupBy={setGroupBy} onClose={() => setGroupModalVisible(false)} />
      <DeleteModal visible={deleteModalVisible} onCancel={() => setDeleteModalVisible(false)} onDeleteOne={() => { if (selectedBudgetId) deleteBudgetSingle(selectedBudgetId); setDeleteModalVisible(false); }} onDeleteAll={() => { if (selectedBudgetId) deleteBudgetSeries(selectedBudgetId); setDeleteModalVisible(false); }} />
      <ConfirmDeleteModal visible={confirmDeleteVisible} onCancel={() => setConfirmDeleteVisible(false)} onConfirm={() => { if (selectedBudgetId) deleteBudgetSingle(selectedBudgetId); setConfirmDeleteVisible(false); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background },
  rowWrap: { flexDirection: 'column' },
  item: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Colors.border, flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontWeight: '600', color: Colors.heading },
  sectionHeading: { fontWeight: '700', color: Colors.text },
});


