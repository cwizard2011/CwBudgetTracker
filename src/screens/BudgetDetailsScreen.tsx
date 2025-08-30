import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { CalculatorModal } from '../components/ui/CalculatorModal';
import { IconButton } from '../components/ui/IconButton';
import { Input } from '../components/ui/Input';
import { PromptModal } from '../components/ui/PromptModal';
import { useBudgets } from '../context/BudgetContext';
import { useCategories } from '../context/CategoryContext';
import { useSettings } from '../context/SettingsContext';
import { Colors } from '../theme/colors';
import { useI18n } from '../utils/i18n';

export function BudgetDetailsScreen({ navigation, route }: any) {
  const { addBudget, updateBudget, updateBudgetSingle, updateBudgetSeries, updateBudgetFuture } = useBudgets() as any;
  const { categories, addCategory } = useCategories();
  const t = useI18n();

  const editing = route?.params?.budget || null;
  const [isEditing, setIsEditing] = useState(!!editing);
  const [saveAndExit, setSaveAndExit] = useState(false);
  const [title, setTitle] = useState(editing?.title ?? '');
  const [amount, setAmount] = useState(editing ? String(editing.amountPlanned) : '');
  const [showCalc, setShowCalc] = useState(false);
  const [period, setPeriod] = useState(editing?.period ?? new Date().toISOString().slice(0, 7));
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [dateISO, setDateISO] = useState<string>(editing?.dateISO ?? new Date().toISOString().slice(0,10));
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const dateObj = useMemo(() => {
    const [y,m,d] = dateISO.split('-').map(n => parseInt(n,10));
    return new Date(y, (m||1)-1, d||1);
  }, [dateISO]);
  const [category, setCategory] = useState<string | undefined>(editing?.category);
  const [recurring, setRecurring] = useState<'weekly' | 'monthly' | 'quarterly' | 'annually' | 'none'>(editing?.recurring ?? 'none');
  const [categoryIcon, setCategoryIcon] = useState<string | undefined>(editing?.categoryIcon);
  const [recurringStopISO, setRecurringStopISO] = useState<string | undefined>(editing?.recurringStopISO);
  const [showStopPicker, setShowStopPicker] = useState(false);
  const { locale } = useSettings();

  const [scopeModalVisible, setScopeModalVisible] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<any | null>(null);
  const [showItemInputs, setShowItemInputs] = useState(false);

  const handleSave = async () => {
    if (!title || !amount) return;
    const currentYM = new Date().toISOString().slice(0, 7);
    const today = new Date().toISOString().slice(0,10);
    if (!isEditing) {
      if (period < currentYM) return;
      if (dateISO < today) return;
    }
    const resolvedStop = recurring === 'none' ? undefined : recurringStopISO;
    const anchor = dateISO;
    const chosenCategory = (category && category.trim()) ? category : 'General';
    const itemsToSave = itemFields.map(field => ({
      id: field.id, // Ensure ID is included
      name: field.name,
      amount: parseFloat(field.amount),
      isCompleted: false, // Default to false
    }));
    setSaveAndExit(true);
    if (isEditing) {
      const updates = { title, amountPlanned: parseFloat(amount), period, category, categoryIcon, recurring, anchorDateISO: anchor, dateISO, notes, recurringStopISO: resolvedStop, items: itemsToSave };
      if (editing.recurring !== 'none' && recurring !== 'none') { // Show prompt only if already a recurrent budget
        setPendingUpdates(updates);
        setScopeModalVisible(true);
      } else {
        await updateBudget(editing.id, updates);
        navigation.goBack();
      }
    } else {
      if (chosenCategory === 'General' && !categories.includes('General')) {
        await addCategory('General');
      }
      await addBudget({ title, amountPlanned: parseFloat(amount), period, category: chosenCategory, categoryIcon, recurring, anchorDateISO: anchor, dateISO, notes, recurringStopISO: resolvedStop, items: itemsToSave });
      navigation.goBack();
    }
  };

  const applySingle = async () => {
    if (!editing) return;
    await updateBudgetSingle(editing.id, pendingUpdates);
    setScopeModalVisible(false);
    if (saveAndExit) {
      navigation.goBack(); // Ensure it exits to Budget list page
    } else {
      resetForm(); // Reset form for Save and Add New
    }
  };

  const applySeries = async () => {
    if (!editing || !pendingUpdates) return;
    const { title: t, amountPlanned: ap, category: c, categoryIcon: ci, notes: n, recurring: r, recurringStopISO: rs } = pendingUpdates;
    const itemsToSave = itemFields.map(field => ({ name: field.name, amount: parseFloat(field.amount) }));
    await updateBudgetSeries(editing.id, { title: t, amountPlanned: ap, category: c, categoryIcon: ci, notes: n, recurring: r, recurringStopISO: rs, items: itemsToSave });
    setScopeModalVisible(false);
    if (saveAndExit) {
      navigation.goBack(); // Ensure it exits to Budget list page
    } else {
      resetForm(); // Reset form for Save and Add New
    }
  };

  const applyFuture = async () => {
    if (!editing || !pendingUpdates) return;
    await updateBudgetFuture(editing.id, pendingUpdates);
    setScopeModalVisible(false);
    if (saveAndExit) {
      navigation.goBack(); // Ensure it exits to Budget list page
    } else {
      resetForm(); // Reset form for Save and Add New
    }
  };

  const handleSaveAndAddNew = async () => {
    if (!title || !amount) return;
    const currentYM = new Date().toISOString().slice(0, 7);
    const today = new Date().toISOString().slice(0,10);
    if (!isEditing) {
      if (period < currentYM) return;
      if (dateISO < today) return;
    }
    const resolvedStop = recurring === 'none' ? undefined : recurringStopISO;
    const anchor = dateISO;
    const chosenCategory = (category && category.trim()) ? category : 'General';
    const itemsToSave = itemFields.map(field => ({ name: field.name, amount: parseFloat(field.amount) }));
    if (isEditing) {
      const updates = { title, amountPlanned: parseFloat(amount), period, category, categoryIcon, recurring, anchorDateISO: anchor, dateISO, notes, recurringStopISO: resolvedStop, items: itemsToSave };
      if (editing.recurring !== 'none' && recurring !== 'none') { // Show prompt only if already a recurrent budget
        setPendingUpdates(updates);
        setScopeModalVisible(true);
      } else {
        await updateBudget(editing.id, updates);
        resetForm();
      }
    } else {
      if (chosenCategory === 'General' && !categories.includes('General')) {
        await addCategory('General');
      }
      await addBudget({ title, amountPlanned: parseFloat(amount), period, category: chosenCategory, categoryIcon, recurring, anchorDateISO: anchor, dateISO, notes, recurringStopISO: resolvedStop, items: itemsToSave });
      resetForm();
    }
  };

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setNotes('');
    setItems([]);
    setItemFields([]);
    setCategory(undefined);
    setCategoryIcon(undefined);
    setRecurring('none');
    setRecurringStopISO(undefined);
    setDateISO(new Date().toISOString().slice(0,10));
    setIsEditing(false);
  };

  const stylesDyn = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    heading: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 12 },
    label: { color: Colors.mutedText, marginBottom: 6 },
    pickerLike: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: Colors.surface },
    input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 10, marginBottom: 12 },
  });

  const isDarkBg = (() => {
    const hex = Colors.background || '#000000';
    const h = hex.replace('#','');
    const r = parseInt(h.substring(0,2),16) || 0;
    const g = parseInt(h.substring(2,4),16) || 0;
    const b = parseInt(h.substring(4,6),16) || 0;
    const luminance = 0.2126*r + 0.7152*g + 0.0722*b;
    return luminance < 128;
  })();

  const [items, setItems] = useState<{ name: string; amount: number }[]>([]);
  const [itemFields, setItemFields] = useState<Array<{ id: string; name: string; amount: string }>>([]);

  useEffect(() => {
    if (editing) {
      setIsEditing(true);
      if (editing.items && editing.items.length > 0) {
        setItemFields(editing.items.map((item: any) => ({ id: item.id, name: item.name, amount: item.amount.toString() })));
      } else {
        setItemFields([{ id: generateId(), name: editing.title || 'Untitled', amount: editing.amountPlanned ? editing.amountPlanned.toString() : '0' }]);
      }
    } else {
      setIsEditing(false);
    }
  }, [editing]);

  useEffect(() => {
    setTitle(editing?.title || '');
    setAmount(editing ? String(editing.amountPlanned) : '');
    setPeriod(editing?.period || new Date().toISOString().slice(0, 7));
    setNotes(editing?.notes || '');
    setDateISO(editing?.dateISO || new Date().toISOString().slice(0,10));
    setCategory(editing?.category);
    setCategoryIcon(editing?.categoryIcon);
    setRecurring(editing?.recurring || 'none');
    setRecurringStopISO(editing?.recurringStopISO);
  }, [editing]);

  useEffect(() => {
    if (category && itemFields.length === 0 && !isEditing) {
      addItemField();
    }
  }, [category]);

  const deleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const addItemField = () => {
    setItemFields([...itemFields, { id: generateId(), name: '', amount: '' }]); // Generate ID for new item
  };

  const updateItemField = (index: number, field: 'name' | 'amount', value: string) => {
    const updatedFields = [...itemFields];
    updatedFields[index][field] = value;
    setItemFields(updatedFields);
  };

  useEffect(() => {
    const total = itemFields.reduce((sum, item) => sum + parseFloat(item.amount.toString() || '0'), 0);
    setAmount(total.toFixed(2));
  }, [itemFields]);

  const removeItemField = (index: number) => {
    setItemFields(itemFields.filter((_, i) => i !== index));
  };
  const areAllFieldsFilled = itemFields.every(field => field.name && field.amount);

  const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

  const isSaveDisabled = !title || !dateISO || !category || itemFields.length === 0 || !areAllFieldsFilled;

  return (
    <ScrollView style={stylesDyn.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={stylesDyn.heading}>{isEditing ? t('budget.edit') : t('budget.new')}</Text>
      <View style={{ marginBottom: 12 }}>
        <Text style={stylesDyn.label}>{t('budget.title')}</Text>
        <Input placeholder={t('budget.title')} value={title} onChangeText={setTitle} style={{ marginBottom: 12 }} />
      </View>
      <View style={{ marginBottom: 12 }}>
        <Text style={stylesDyn.label}>{t('budget.date')}</Text>
        <TouchableOpacity style={stylesDyn.pickerLike} onPress={() => setShowDatePicker(s => !s)} activeOpacity={0.7}>
          <Text style={{ color: Colors.text }}>{dateISO}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dateObj}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
            minimumDate={new Date()}
            locale={locale}
            themeVariant={isDarkBg ? 'dark' : 'light'}
            {...(Platform.OS === 'ios' ? { textColor: Colors.text as any } : {})}
            onChange={(event: any, selected?: Date) => {
              if (Platform.OS !== 'ios') setShowDatePicker(false);
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
        <Text style={stylesDyn.label}>{t('budget.category')}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CategoryPicker', { value: category, icon: categoryIcon, onSelect: (v: string, i: string) => { setCategory(v); setCategoryIcon(i); navigation.goBack(); } })}
          style={stylesDyn.pickerLike}
          activeOpacity={0.7}
        >
          <Text style={{ color: category ? Colors.text : Colors.mutedText }}>{categoryIcon ? `${categoryIcon} ` : ''}{category || t('budget.selectCategory')}</Text>
        </TouchableOpacity>
        {category && (
          <View style={{ marginBottom: 12, marginTop: 12 }}>
            {itemFields.map((field, index) => (
              <View key={field.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 12 }}>
                <TextInput
                  placeholder={t('budget.itemName')}
                  value={field.name}
                  onChangeText={(value) => updateItemField(index, 'name', value)}
                  style={[stylesDyn.input, { flex: 1, marginRight: 8, color: Colors.text }]}
                  placeholderTextColor={Colors.mutedText}
                />
                <TextInput
                  placeholder={t('budget.itemAmount')}
                  value={field.amount}
                  onChangeText={(value) => {
                    if (/^\d*\.?\d*$/.test(value)) {
                      updateItemField(index, 'amount', value);
                    }
                  }}
                  keyboardType="numeric"
                  style={[stylesDyn.input, { flex: 1, marginRight: 8, color: Colors.text }]}
                  placeholderTextColor={Colors.mutedText}
                />
                <IconButton
                  family="MaterialIcons"
                  name="close"
                  onPress={() => removeItemField(index)}
                  style={{ backgroundColor: Colors.surface }} // Add background for contrast
                  color={Colors.text} // Ensure icon color is visible
                />
              </View>
            ))}
            <Button title={t('budget.addItem')} onPress={addItemField} disabled={!areAllFieldsFilled} />
          </View>
        )}
        <View style={{ marginTop: 12 }}>
          <Text style={stylesDyn.label}>{t('budget.amountTotal')}</Text>
          <Input
            placeholder={t('budget.amount')}
            value={amount}
            editable={false}
            pointerEvents="none"
            keyboardType="numeric"
            style={{ marginBottom: 12 }}
          />
        </View>
      </View>
      <View style={{ marginBottom: 12 }}>
        <Text style={stylesDyn.label}>{t('budget.recurring')}</Text>
        <Button
          title={`${t('budget.recurring')}: ${recurring === 'none' ? t('common.none') : (recurring === 'weekly' ? t('period.weekly') : recurring === 'monthly' ? t('period.monthly') : recurring === 'quarterly' ? t('period.quarterly') : t('period.annual'))}`}
          onPress={() => navigation.navigate('RecurringPicker', { value: recurring, onSelect: (v: any) => { setRecurring(v); navigation.goBack(); } })}
          variant="neutral"
        />
      </View>
      {recurring !== 'none' && (
        <View style={{ marginBottom: 12 }}>
          <Text style={stylesDyn.label}>{t('budget.recurringEnd')}</Text>
          <TouchableOpacity style={stylesDyn.pickerLike} onPress={() => setShowStopPicker(s => !s)} activeOpacity={0.7}>
            <Text style={{ color: recurringStopISO ? Colors.text : Colors.mutedText }}>{recurringStopISO || t('budget.selectRecurringEnd')}</Text>
          </TouchableOpacity>
          {showStopPicker && (
            <DateTimePicker
              value={recurringStopISO ? new Date(recurringStopISO) : new Date(dateISO)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              minimumDate={new Date(dateISO)}
              locale={locale}
              themeVariant={isDarkBg ? 'dark' : 'light'}
              {...(Platform.OS === 'ios' ? { textColor: Colors.text as any } : {})}
              onChange={(event: any, selected?: Date) => {
                if (Platform.OS !== 'ios') setShowStopPicker(false);
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
      <Input
        placeholder={t('common.notes')}
        value={notes}
        onChangeText={(v) => { if (v.length <= 500) setNotes(v); }}
        multiline
        numberOfLines={5}
        maxLength={500}
        style={{ marginBottom: 6, height: 120, textAlignVertical: 'top' as any }}
      />
      <Text style={{ color: Colors.mutedText, marginBottom: 16, textAlign: 'right' }}>{`${notes.length}/500`}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
        <Button title={t('common.saveAndExit')} onPress={handleSave} variant="primary" style={{ flex: 1, marginRight: 8 }} disabled={isSaveDisabled} />
        <Button title={t('common.saveAndAddNew')} onPress={handleSaveAndAddNew} variant="secondary" style={{ flex: 1 }} disabled={isSaveDisabled} />
      </View>

      <CalculatorModal
        visible={showCalc}
        initialValue={amount}
        onClose={() => setShowCalc(false)}
        onSubmit={(val) => { setAmount(String(val)); setShowCalc(false); }}
      />

      <PromptModal visible={scopeModalVisible} title={t('budget.applyChangesTo')} onCancel={() => setScopeModalVisible(false)} showConfirm={false} cancelText={t('common.close')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Button title={t('budget.thisOccurrence')} variant="primary" onPress={applySingle} style={{ marginRight: 8, marginBottom: 8 }} />
          <Button title={t('budget.allRecurring')} variant="secondary" onPress={applySeries} style={{ marginRight: 8, marginBottom: 8 }} />
          <Button title={t('budget.futureRecurring')} variant="neutral" onPress={applyFuture} />
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
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 10, marginBottom: 12 },
});


