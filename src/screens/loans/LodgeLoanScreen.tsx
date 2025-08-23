import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { Input } from '../../components/ui/Input';
import { PromptModal } from '../../components/ui/PromptModal';
import { useLoans } from '../../context/LoanContext';
import { Colors } from '../../theme/colors';
import { useI18n } from '../../utils/i18n';

export function LodgeLoanScreen({ navigation, route }: any) {
  const { addLoan, updateLoanBasic, counterparties, loans } = useLoans() as any;
  const editingLoan = route?.params?.loan as (undefined | { id: string; counterpartName: string; type: 'owedByMe'|'owedToMe'; principal: number; loanDate: number });
  const t = useI18n();
  const [type, setType] = useState<'owedByMe' | 'owedToMe'>(editingLoan?.type || 'owedByMe');
  const [name, setName] = useState(editingLoan?.counterpartName || '');
  const [selectedCpId, setSelectedCpId] = useState<string | undefined>();
  const [principal, setPrincipal] = useState(editingLoan ? String(editingLoan.principal || 0) : '');
  const [notes, setNotes] = useState('');
  const [saveCounterparty, setSaveCounterparty] = useState(true);
  const [dateISO, setDateISO] = useState(editingLoan ? new Date(editingLoan.loanDate).toISOString().slice(0,10) : new Date().toISOString().slice(0,10));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [matchedNames, setMatchedNames] = useState<string[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<'new' | string>('new');

  const dateObj = useMemo(() => {
    const [y,m,d] = dateISO.split('-').map(n => parseInt(n,10));
    return new Date(y, (m||1)-1, d||1);
  }, [dateISO]);

  const canSave = useMemo(() => {
    const nm = (selectedCpId || name.trim());
    const amt = parseFloat(principal);
    return !!nm && !isNaN(amt) && amt > 0;
  }, [selectedCpId, name, principal]);

  const onPickExisting = (id: string) => {
    setSelectedCpId(id);
    const cp = counterparties.find((c: { id: string; name: string }) => c.id === id);
    setName(cp ? cp.name : '');
  };

  function normalizeName(n: string): string { return n.toLowerCase().trim().replace(/\s+/g, ' '); }
  function tokensOf(n: string): string[] { return normalizeName(n).split(' ').filter(Boolean); }
  function isFuzzyMatch(a: string, b: string): boolean {
    const ta = tokensOf(a); const tb = tokensOf(b);
    if (!ta.length || !tb.length) return false;
    const setA = new Set(ta); const setB = new Set(tb);
    // exact token set match or one contains the other
    const allInA = tb.every(t => setA.has(t));
    const allInB = ta.every(t => setB.has(t));
    if (allInA || allInB) return true;
    // intersection of at least 2 tokens
    let inter = 0; ta.forEach(t => { if (setB.has(t)) inter++; });
    return inter >= 2;
  }

  function formatDateDDMMYYYY(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function defaultNote(counterpart: string, loanType: 'owedByMe' | 'owedToMe', amount: number, isoDate: string): string {
    const amt = amount.toLocaleString();
    const d = formatDateDDMMYYYY(isoDate);
    if (loanType === 'owedToMe') {
      // You lent to counterpart
      return `You loaned ${counterpart} ${amt} on ${d}`;
    }
    // owedByMe: you borrowed from counterpart
    return `You borrowed ${amt} from ${counterpart} on ${d}`;
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    heading: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 12 },
    label: { color: Colors.mutedText, marginBottom: 6 },
    pickerLike: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: Colors.surface },
    chip: { paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, marginRight: 6, backgroundColor: Colors.surface },
    chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    toggle: { width: 28, height: 18, borderRadius: 9, borderWidth: 1, borderColor: Colors.border },
    toggleOn: { backgroundColor: Colors.success, borderColor: Colors.success },
    toggleOff: { backgroundColor: Colors.background },
  });

  const onSave = async () => {
    if (!canSave) return;
    const loanDate = new Date(dateISO).getTime();
    if (editingLoan) {
      // Edit basic fields (name, principal)
      const finalName = name.trim();
      const amt = parseFloat(principal);
      await updateLoanBasic(editingLoan.id, { counterpartName: finalName, principal: amt });
      navigation.goBack();
      return;
    }
    const typedName = name || (counterparties.find(c => c.id === selectedCpId)?.name || '');
    // Build candidate names from counterparties and existing loans
    const existingNamesSet = new Set<string>();
    counterparties.forEach((c: { id: string; name: string; lastUsedAt?: number }) => existingNamesSet.add(c.name));
    (loans || []).forEach((l: { counterpartName: string }) => existingNamesSet.add(l.counterpartName));
    const candidates = Array.from(existingNamesSet).filter(n => isFuzzyMatch(typedName, n));
    if (typedName.trim() && candidates.length > 0) {
      setMatchedNames(candidates);
      setSelectedMatch('new');
      setConfirmVisible(true);
      return;
    }
    const finalName = typedName;
    const finalNotes = notes && notes.trim() ? notes : defaultNote(finalName, type, parseFloat(principal), dateISO);
    await addLoan({ id: selectedCpId, name: finalName }, type, parseFloat(principal), loanDate, { saveCounterparty, notes: finalNotes });
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.heading}>{editingLoan ? t('loans.editLoan') : t('loans.lodgeLoan')}</Text>
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.label}>{t('loans.type')}</Text>
        <View style={{ flexDirection: 'row' }}>
          <Button title={t('loans.iOwe')} variant={type === 'owedByMe' ? 'primary' : 'neutral'} onPress={() => setType('owedByMe')} style={{ marginRight: 8 }} />
          <Button title={t('loans.owedToMe')} variant={type === 'owedToMe' ? 'primary' : 'neutral'} onPress={() => setType('owedToMe')} />
        </View>
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={styles.label}>{type === 'owedToMe' ? t('loans.borrower') : t('loans.lender')}</Text>
        {!editingLoan && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {counterparties.map((cp: { id: string; name: string }) => (
            <TouchableOpacity key={cp.id} onPress={() => onPickExisting(cp.id)} style={[styles.chip, selectedCpId === cp.id && styles.chipSelected]}>
              <Text style={{ color: selectedCpId === cp.id ? Colors.white : Colors.text }}>{cp.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        )}
        <Input placeholder={t('common.name')} value={name} onChangeText={(t) => { setName(t); setSelectedCpId(undefined); }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          {!editingLoan && (
            <>
              <IconButton
                family="MaterialIcons"
                name={saveCounterparty ? 'check-box' : 'check-box-outline-blank'}
                onPress={() => setSaveCounterparty(prev => !prev)}
                color={Colors.primary}
                style={{ paddingHorizontal: 0, paddingVertical: 0 }}
                backgroundColor="transparent"
              />
              <Text style={{ marginLeft: 8, color: Colors.mutedText }}>{t('common.save')}</Text>
            </>
          )}
        </View>
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={styles.label}>{t('loans.principal')}</Text>
        <Input placeholder={t('loans.amount')} value={principal} onChangeText={setPrincipal} keyboardType="numeric" />
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={styles.label}>{t('loans.date')}</Text>
        <TouchableOpacity style={styles.pickerLike} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
          <Text style={{ color: Colors.text }}>{dateISO}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dateObj}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
            maximumDate={new Date()}
            onChange={(event: any, selected?: Date) => {
              setShowDatePicker(false);
              if (selected) {
                const y = selected.getFullYear();
                const m = String(selected.getMonth() + 1).padStart(2,'0');
                const d = String(selected.getDate()).padStart(2,'0');
                setDateISO(`${y}-${m}-${d}`);
              }
            }}
          />
        )}
      </View>

      <Input placeholder={t('common.notes')} value={notes} onChangeText={setNotes} style={{ marginBottom: 16 }} />
      <Button title={t('common.save')} onPress={onSave} variant={canSave ? 'primary' : 'neutral'} disabled={!canSave} />

      {/* Confirm Merge or New */}
      <PromptModal visible={confirmVisible} title={t('loans.editLoan')} onCancel={() => setConfirmVisible(false)} onConfirm={async () => {
        const loanDate = new Date(dateISO).getTime();
        const amount = parseFloat(principal);
        if (selectedMatch !== 'new') {
          // Merge into existing by name
          const mergeNotes = notes && notes.trim() ? notes : defaultNote(selectedMatch, type, amount, dateISO);
          await addLoan({ name: selectedMatch }, type, amount, loanDate, { saveCounterparty: false, notes: mergeNotes });
        } else {
          const typedName = name || '';
          const newNotes = notes && notes.trim() ? notes : defaultNote(typedName, type, amount, dateISO);
          await addLoan({ name: typedName }, type, amount, loanDate, { saveCounterparty: true, notes: newNotes });
        }
        setConfirmVisible(false);
        navigation.goBack();
      }} confirmText="Continue">
        <View>
          <Text style={{ color: Colors.mutedText, marginBottom: 8 }}>{t('loans.filterBy')}</Text>
          <View style={{ marginBottom: 8 }}>
            <TouchableOpacity onPress={() => setSelectedMatch('new')} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <IconButton family="MaterialIcons" name={selectedMatch === 'new' ? 'radio-button-checked' : 'radio-button-unchecked'} onPress={() => setSelectedMatch('new')} color={Colors.primary} backgroundColor="transparent" style={{ paddingHorizontal: 0, paddingVertical: 0, marginRight: 6 }} />
              <Text style={{ color: Colors.text }}>Add as new record</Text>
            </TouchableOpacity>
            {matchedNames.map(n => (
              <TouchableOpacity key={n} onPress={() => setSelectedMatch(n)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <IconButton family="MaterialIcons" name={selectedMatch === n ? 'radio-button-checked' : 'radio-button-unchecked'} onPress={() => setSelectedMatch(n)} color={Colors.primary} backgroundColor="transparent" style={{ paddingHorizontal: 0, paddingVertical: 0, marginRight: 6 }} />
                <Text style={{ color: Colors.text }}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, marginRight: 6 },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  
});


