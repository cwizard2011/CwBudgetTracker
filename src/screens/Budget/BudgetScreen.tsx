import React, { useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

// Define the AppTheme type directly in this file
// This type represents the possible theme values

type AppTheme = 'light' | 'dark' | 'darkDim' | 'darkGray' | 'system';

const CustomCheckbox = ({ isChecked, onPress, theme }: { isChecked: boolean; onPress: () => void; theme: AppTheme }) => {
  const isLightTheme = theme === 'light';
  const backgroundColor = isChecked ? (isLightTheme ? Colors.primary : Colors.accent) : 'transparent';
  const checkColor = isLightTheme ? Colors.white : Colors.text;

  return (
    <TouchableOpacity onPress={onPress} style={{ width: 24, height: 24, borderWidth: 2, borderColor: Colors.text, alignItems: 'center', justifyContent: 'center', backgroundColor }}>
      {isChecked && <View style={{ width: 12, height: 12, backgroundColor: checkColor }} />}
    </TouchableOpacity>
  );
};

export function BudgetScreen() {
  const { budgets: contextBudgets, updateSpent, deleteBudgetSingle, deleteBudgetSeries, updateBudget } = useBudgets() as any;
  const { categories } = useCategories();
  const { locale, currency, theme } = useSettings();
  const t = useI18n();

  const [budgets, setBudgets] = useState<any[]>(contextBudgets || []);
  const [filterPeriod, setFilterPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [filterCategory, setFilterCategory] = useState<string | undefined>();
  const [groupBy, setGroupBy] = useState<'date' | 'category'>('date');
  const [sortKey, setSortKey] = useState<'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expandedBudgetId, setExpandedBudgetId] = useState<string | null>(null);

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

  // Remove ID generation logic for budget items
  const initializeBudgets = (budgets: any[]) => {
    return budgets.map(budget => {
      // Assume items already have IDs from add budget feature
      return { ...budget, items: budget.items || [] };
    });
  };

  useEffect(() => {
    setBudgets(initializeBudgets(contextBudgets));
  }, [contextBudgets]);

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

  const toggleExpandBudget = (budgetId: string) => {
    setExpandedBudgetId(prevId => (prevId === budgetId ? null : budgetId));
  };

  const toggleItemCompletion = (itemId: string) => {
    const updatedBudgets = budgets.map((budget: any) => {
      let budgetUpdated = false;
      const updatedItems = (budget.items || []).map((item: any) => {
        if (item.id === itemId) {
          const isCompleted = !item.isCompleted;
          budgetUpdated = true;
          return { ...item, isCompleted };
        }
        return item;
      });
      if (budgetUpdated) {
        const amountSpent = updatedItems.reduce((sum: number, item: any) => sum + (item.isCompleted ? item.amount : 0), 0);
        updateBudget(budget.id, { items: updatedItems, amountSpent: Math.max(amountSpent, 0) }); // Persist the updated items and amountSpent
        return { ...budget, items: updatedItems, amountSpent: Math.max(amountSpent, 0) };
      }
      return budget;
    });
    setBudgets(updatedBudgets);
  };

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

  const monthTotals = useMemo(() => {
    const planned = filtered.reduce((s: number, b: any) => s + (b.amountPlanned || 0), 0);
    const spent = filtered.reduce((s: number, b: any) => s + (b.amountSpent || 0), 0);
    return { planned, spent };
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
        <Text style={{ fontWeight: '700', color: Colors.text }}>{t('budget.summaries')}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ color: Colors.text }}>{t('budget.plannedTotal')}</Text>
          <Text style={{ color: Colors.text }}>{formatCurrency(monthTotals.planned, locale, currency)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ color: Colors.text }}>{t('budget.spentTotal')}</Text>
          <Text style={{ color: Colors.text }}>{formatCurrency(monthTotals.spent, locale, currency)}</Text>
        </View>
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
                <Text style={{ fontWeight: '600', color: Colors.text, flex: 1 }} numberOfLines={1} ellipsizeMode="tail">{item.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0, marginLeft: 8 }}>
                  <IconButton family="MaterialIcons" name="attach-money" onPress={() => openSpendModal(item.id)} style={{ marginLeft: 4 }} backgroundColor={Colors.successLight} color={Colors.white} />
                  <IconButton family="MaterialIcons" name="edit" onPress={() => { const { navigate } = require('../../utils/navigationRef'); (navigate as any)('BudgetDetails', { budget: item }); }} style={{ marginLeft: 4 }} backgroundColor={Colors.secondaryLight} color={Colors.white} />
                  <IconButton family="MaterialIcons" name="delete" onPress={() => openDeleteModal(item.id)} style={{ marginLeft: 4 }} backgroundColor={Colors.errorLight} color={Colors.white} />
                  {item.items && item.items.length > 0 && (
                    <IconButton
                      family="MaterialIcons"
                      name={expandedBudgetId === item.id ? "expand-less" : "expand-more"}
                      onPress={() => toggleExpandBudget(item.id)}
                      style={{ marginLeft: 4 }}
                      backgroundColor={Colors.secondaryLight}
                      color={Colors.white}
                    />
                  )}
                </View>
              </View>
              <Text style={{ marginBottom: 6, color: Colors.text }}>{formatCurrency(item.amountSpent || 0, locale, currency)} / {formatCurrency(item.amountPlanned || 0, locale, currency)}</Text>
              <ProgressBar progress={item.amountPlanned ? item.amountSpent / item.amountPlanned : 0} fillColor={Colors.success} />
              {expandedBudgetId === item.id && item.items && (
                <View>
                  {item.items.map((subItem: any) => (
                    <View key={subItem.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      <CustomCheckbox
                        isChecked={subItem.isCompleted}
                        onPress={() => toggleItemCompletion(subItem.id)}
                        theme={theme} // Pass the current theme here
                      />
                      <Text style={{ flex: 1, marginLeft: 8, color: Colors.text, textDecorationLine: subItem.isCompleted ? 'line-through' : 'none' }} numberOfLines={1} ellipsizeMode="tail">{subItem.name}</Text>
                      <Text style={{ marginLeft: 8, color: Colors.text, textDecorationLine: subItem.isCompleted ? 'line-through' : 'none' }}>{formatCurrency(subItem.amount, locale, currency)}</Text>
                    </View>
                  ))}
                </View>
              )}
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


