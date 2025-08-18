import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PromptModal } from '../components/ui/PromptModal';
import { useBudgets } from '../context/BudgetContext';
import { useCategories } from '../context/CategoryContext';
import { Colors } from '../theme/colors';

export function BudgetDetailsScreen({ navigation, route }: any) {
  const { addBudget, updateBudget, updateBudgetSingle, updateBudgetSeries, updateBudgetFuture } = useBudgets() as any;
  const { categories, addCategory } = useCategories();

  const editing = route?.params?.budget || null;
  const [title, setTitle] = useState(editing?.title ?? '');
  const [amount, setAmount] = useState(editing ? String(editing.amountPlanned) : '');
  const [period, setPeriod] = useState(editing?.period ?? new Date().toISOString().slice(0, 7));
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [dateISO, setDateISO] = useState<string>(editing?.dateISO ?? new Date().toISOString().slice(0,10));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const dateObj = useMemo(() => {
    const [y,m,d] = dateISO.split('-').map(n => parseInt(n,10));
    return new Date(y, (m||1)-1, d||1);
  }, [dateISO]);
  const [category, setCategory] = useState<string | undefined>(editing?.category);
  const [newCategory, setNewCategory] = useState('');
  const [recurring, setRecurring] = useState<'weekly' | 'monthly' | 'quarterly' | 'annually' | 'none'>(editing?.recurring ?? 'none');
  const [categoryIcon, setCategoryIcon] = useState<string | undefined>(editing?.categoryIcon);
  const [anchorDateISO] = useState<string>(editing?.anchorDateISO ?? new Date().toISOString().slice(0, 10));
  const [recurringStopISO, setRecurringStopISO] = useState<string | undefined>(editing?.recurringStopISO);
  const [showStopPicker, setShowStopPicker] = useState(false);

  const [scopeModalVisible, setScopeModalVisible] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<any | null>(null);

  const handleSave = async () => {
    if (!title || !amount) return;
    const currentYM = new Date().toISOString().slice(0, 7);
    const today = new Date().toISOString().slice(0,10);
    if (period < currentYM) return;
    if (dateISO < today) return;
    const resolvedStop = recurring === 'none' ? undefined : recurringStopISO;
    const anchor = dateISO; // align anchor with chosen specific date
    if (editing) {
      const updates = { title, amountPlanned: parseFloat(amount), period, category, categoryIcon, recurring, anchorDateISO: anchor, dateISO, notes, recurringStopISO: resolvedStop };
      // If editing a recurring item or series, ask for scope
      const isRecurringItem = (editing.recurring && editing.recurring !== 'none') || !!editing.recurringGroupId;
      if (isRecurringItem) {
        setPendingUpdates(updates);
        setScopeModalVisible(true);
        return;
      }
      await updateBudget(editing.id, updates);
    } else {
      await addBudget({ title, amountPlanned: parseFloat(amount), period, category, categoryIcon, recurring, anchorDateISO: anchor, dateISO, notes, recurringStopISO: resolvedStop });
    }
    navigation.goBack();
  };

  const applySingle = async () => {
    if (!editing || !pendingUpdates) return;
    // Single occurrence: detach from series and keep date/period changes
    await updateBudgetSingle(editing.id, pendingUpdates);
    setScopeModalVisible(false);
    navigation.goBack();
  };

  const applySeries = async () => {
    if (!editing || !pendingUpdates) return;
    // For series updates, avoid shifting the schedule unexpectedly: do not propagate dateISO/period/anchor by default
    const { title: t, amountPlanned: ap, category: c, categoryIcon: ci, notes: n, recurring: r, recurringStopISO: rs } = pendingUpdates;
    await updateBudgetSeries(editing.id, { title: t, amountPlanned: ap, category: c, categoryIcon: ci, notes: n, recurring: r, recurringStopISO: rs });
    setScopeModalVisible(false);
    navigation.goBack();
  };

  const applyFuture = async () => {
    if (!editing || !pendingUpdates) return;
    await updateBudgetFuture(editing.id, pendingUpdates);
    setScopeModalVisible(false);
    navigation.goBack();
  };

  const addCustomCategory = async () => {
    if (!newCategory.trim()) return;
    await addCategory(newCategory.trim());
    setNewCategory('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.heading}>{editing ? 'Edit Budget' : 'New Budget'}</Text>
      <Input placeholder="Title" value={title} onChangeText={setTitle} style={{ marginBottom: 12 }} />
      <Input placeholder="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" style={{ marginBottom: 12 }} />
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity style={styles.pickerLike} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
          <Text style={{ color: Colors.text }}>{dateISO}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dateObj}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
            minimumDate={new Date()}
            onChange={(event: any, selected?: Date) => {
              // Hide immediately for both platforms
              setShowDatePicker(false);
              if (selected) {
                const y = selected.getFullYear();
                const m = String(selected.getMonth() + 1).padStart(2,'0');
                const d = String(selected.getDate()).padStart(2,'0');
                const nextISO = `${y}-${m}-${d}`;
                setDateISO(nextISO);
                setPeriod(`${y}-${m}`);
              }
            }}
          />
        )}
      </View>
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.label}>Category</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CategoryPicker', { value: category, icon: categoryIcon, onSelect: (v: string, i: string) => { setCategory(v); setCategoryIcon(i); navigation.goBack(); } })}
          style={styles.pickerLike}
          activeOpacity={0.7}
        >
          <Text style={{ color: category ? Colors.text : Colors.mutedText }}>{categoryIcon ? `${categoryIcon} ` : ''}{category || 'Select category'}</Text>
        </TouchableOpacity>
      </View>
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.label}>Recurring</Text>
        <Button
          title={`Recurring: ${recurring === 'none' ? 'None' : recurring[0].toUpperCase() + recurring.slice(1)}`}
          onPress={() => navigation.navigate('RecurringPicker', { value: recurring, onSelect: (v: any) => { setRecurring(v); navigation.goBack(); } })}
          variant="neutral"
        />
      </View>
      {recurring !== 'none' && (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Recurring End Date (inclusive)</Text>
          <TouchableOpacity style={styles.pickerLike} onPress={() => setShowStopPicker(true)} activeOpacity={0.7}>
            <Text style={{ color: recurringStopISO ? Colors.text : Colors.mutedText }}>{recurringStopISO || 'Select recurring end date'}</Text>
          </TouchableOpacity>
          {showStopPicker && (
            <DateTimePicker
              value={recurringStopISO ? new Date(recurringStopISO) : new Date(dateISO)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              minimumDate={new Date(dateISO)}
              onChange={(event: any, selected?: Date) => {
                setShowStopPicker(false);
                if (selected) {
                  const y = selected.getFullYear();
                  const m = String(selected.getMonth() + 1).padStart(2,'0');
                  const d = String(selected.getDate()).padStart(2,'0');
                  setRecurringStopISO(`${y}-${m}-${d}`);
                }
              }}
            />
          )}
        </View>
      )}
      <Input placeholder="Notes" value={notes} onChangeText={setNotes} style={{ marginBottom: 16 }} />
      <Button title="Save" onPress={handleSave} variant="primary" />

      <PromptModal visible={scopeModalVisible} title="Apply changes to" onCancel={() => setScopeModalVisible(false)} showConfirm={false} cancelText="Close">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Button title="This Occurrence" variant="primary" onPress={applySingle} style={{ marginRight: 8, marginBottom: 8 }} />
          <Button title="All Recurring" variant="secondary" onPress={applySeries} style={{ marginRight: 8, marginBottom: 8 }} />
          <Button title="Future Recurring" variant="neutral" onPress={applyFuture} />
        </View>
      </PromptModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  heading: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  label: { color: Colors.mutedText, marginBottom: 6 },
  pickerLike: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
});


