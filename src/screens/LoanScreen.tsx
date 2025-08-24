import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import { Platform, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Input } from '../components/ui/Input';
import { ProgressBar } from '../components/ui/ProgressBar';
import { PromptModal } from '../components/ui/PromptModal';
import { useLoans } from '../context/LoanContext';
import { useSettings } from '../context/SettingsContext';
import { Colors } from '../theme/colors';
import { formatCurrency } from '../utils/format';
import { useI18n } from '../utils/i18n';
import { navigate as rootNavigate } from '../utils/navigationRef';

export function LoanScreen({ navigation }: any) {
  const { loans, recordPayment, deleteLoan, counterparties } = useLoans();
  const { locale, currency } = useSettings();
  const t = useI18n();

  // Inline quick-add removed in favor of Lodge Loan screen

  const [payModalVisible, setPayModalVisible] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [payDateISO, setPayDateISO] = useState(new Date().toISOString().slice(0,10));
  const [showPayDatePicker, setShowPayDatePicker] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [loanIdToDelete, setLoanIdToDelete] = useState<string | null>(null);

  type FilterMode = 'none' | 'borrower' | 'lender';
  const [filterMode, setFilterMode] = useState<FilterMode>('none');
  const [filterName, setFilterName] = useState<string | undefined>();
  const [sortKey, setSortKey] = useState<'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [groupByType, setGroupByType] = useState<boolean>(false);

  const openLodgeLoan = () => rootNavigate('LodgeLoan');

  const openPayModal = (loanId: string) => {
    setSelectedLoanId(loanId);
    setPayAmount('');
    setPayDateISO(new Date().toISOString().slice(0,10));
    setPayModalVisible(true);
  };

  // Detect dark vs light background from current theme
  const isDarkBg = (() => {
    const hex = (Colors.background || '#000000').replace('#','');
    const r = parseInt(hex.substring(0,2),16) || 0;
    const g = parseInt(hex.substring(2,4),16) || 0;
    const b = parseInt(hex.substring(4,6),16) || 0;
    const luminance = 0.2126*r + 0.7152*g + 0.0722*b; // 0-255
    return luminance < 128;
  })();
  const btnNeutralStyle = { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border } as const;
  const btnNeutralText = { color: Colors.text } as const;
  const summaryLabelColor = Colors.text;

  const handleSavePayment = async () => {
    const amt = parseFloat(payAmount);
    if (!isNaN(amt) && amt > 0 && selectedLoanId) {
      const [y,m,d] = payDateISO.split('-').map(n => parseInt(n,10));
      const dt = new Date(y, (m||1)-1, d||1).getTime();
      await recordPayment(selectedLoanId, amt, undefined, dt);
      setPayModalVisible(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }] }>
      <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconButton family="MaterialIcons" name="filter-list" onPress={() => setFilterModalVisible(true)} style={styles.icon} backgroundColor={Colors.white} color={Colors.primaryDark} />
          <IconButton family="MaterialIcons" name="sort" onPress={() => setSortModalVisible(true)} style={styles.icon} backgroundColor={Colors.white} color={Colors.secondaryDark} />
          <IconButton family="MaterialIcons" name="category" onPress={() => setGroupModalVisible(true)} style={styles.icon} backgroundColor={Colors.white} color={Colors.warningDark} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {(filterMode !== 'none' || filterName || sortKey !== 'date' || sortDir !== 'desc' || groupByType) && (
            <Button title={t('loans.reset')} onPress={() => { setFilterMode('none'); setFilterName(undefined); setSortKey('date'); setSortDir('desc'); setGroupByType(false); }} variant="neutral" small style={{ marginRight: 8 }} />
          )}
          <Button title={t('loans.lodgeLoan')} onPress={openLodgeLoan} variant="primary" />
        </View>
      </View>

      {useMemo(() => {
        let list = loans.slice();
        if (filterMode === 'borrower') list = list.filter(l => l.type === 'owedToMe');
        if (filterMode === 'lender') list = list.filter(l => l.type === 'owedByMe');
        if (filterName) list = list.filter(l => l.counterpartName === filterName);
        list.sort((a, b) => {
          const cmp = sortKey === 'date' ? (a.loanDate - b.loanDate) : ((a.principal || 0) - (b.principal || 0));
          return sortDir === 'asc' ? cmp : -cmp;
        });
        const totals = list.reduce((acc, l) => { acc.principal += (l.principal || 0); acc.balance += (l.balance || 0); return acc; }, { principal: 0, balance: 0 });
        const owedToMeOutstanding = list.filter(l => l.type === 'owedToMe').reduce((s, l) => s + (l.balance || 0), 0);
        const iOweOutstanding = list.filter(l => l.type === 'owedByMe').reduce((s, l) => s + (l.balance || 0), 0);
        const repaidByMe = list.filter(l => l.type === 'owedByMe').reduce((s, l) => s + (l.payments || []).reduce((p, x) => p + (x.amount || 0), 0), 0);
        const recoveredFromBorrowers = list.filter(l => l.type === 'owedToMe').reduce((s, l) => s + (l.payments || []).reduce((p, x) => p + (x.amount || 0), 0), 0);
        const sections = groupByType
          ? [
              { title: t('loans.iOwe'), data: list.filter(l => l.type === 'owedByMe') },
              { title: t('loans.owedToMe'), data: list.filter(l => l.type === 'owedToMe') },
            ]
          : [{ title: t('common.all'), data: list }];
        return (
          <>
            <View style={[styles.summaryCard, !isDarkBg && { backgroundColor: Colors.white }]}>
              <View style={styles.summaryRow}><Text style={{ color: summaryLabelColor }}>{t('loans.owedToMe')}</Text><Text style={styles.summaryValue}>{formatCurrency(owedToMeOutstanding, locale, currency)}</Text></View>
              <View style={styles.summaryRow}><Text style={{ color: summaryLabelColor }}>{t('loans.iOwe')}</Text><Text style={styles.summaryValue}>{formatCurrency(iOweOutstanding, locale, currency)}</Text></View>
              <View style={styles.summaryRow}><Text style={{ color: summaryLabelColor }}>{t('loans.repaid')}</Text><Text style={styles.summaryValue}>{formatCurrency(repaidByMe, locale, currency)}</Text></View>
              <View style={styles.summaryRow}><Text style={{ color: summaryLabelColor }}>{t('loans.recovered')}</Text><Text style={styles.summaryValue}>{formatCurrency(recoveredFromBorrowers, locale, currency)}</Text></View>
              <View style={[styles.summaryRow, { marginTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, paddingTop: 6 }]}>
                <Text style={[{ color: summaryLabelColor }, { fontWeight: '700' }]}>{t('loans.totalPrincipal')}</Text><Text style={[styles.summaryValue, { fontWeight: '700' }]}>{formatCurrency(totals.principal, locale, currency)}</Text>
              </View>
              <View style={styles.summaryRow}><Text style={[{ color: summaryLabelColor }, { fontWeight: '700' }]}>{t('loans.totalBalance')}</Text><Text style={[styles.summaryValue, { fontWeight: '700' }]}>{formatCurrency(totals.balance, locale, currency)}</Text></View>
            </View>
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              renderSectionHeader={({ section: { title } }) => (
                groupByType ? <Text style={styles.sectionHeading}>{title}</Text> : <></>
              )}
              renderItem={({ item }) => (
                <View style={styles.item}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontWeight: '600', color: Colors.text, flex: 1 }} numberOfLines={1} ellipsizeMode="tail">
                      {item.counterpartName}
                    </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0, marginLeft: 8 }}>
                        <IconButton family="MaterialIcons" name="attach-money" onPress={() => openPayModal(item.id)} style={{ marginLeft: 4 }} backgroundColor={Colors.successLight} color={Colors.white} />
                        <IconButton family="MaterialIcons" name="receipt" onPress={() => rootNavigate('LoanInvoice', { loan: item })} style={{ marginLeft: 4 }} backgroundColor={Colors.secondaryLight} color={Colors.white} />
                        <IconButton family="MaterialIcons" name="edit" onPress={() => rootNavigate('LodgeLoan', { loan: item })} style={{ marginLeft: 4 }} backgroundColor={Colors.secondaryDark} color={Colors.white} />
                        <IconButton family="MaterialIcons" name="delete" onPress={() => { setLoanIdToDelete(item.id); setDeleteModalVisible(true); }} style={{ marginLeft: 4 }} backgroundColor={Colors.errorLight} color={Colors.white} />
                      </View>
                    </View>
                    <Text style={{ color: Colors.mutedText, marginBottom: 6 }}>
                      {t('loans.balance')}: {formatCurrency(item.balance || 0, locale, currency)} / {t('loans.principal')}: {formatCurrency(item.principal || 0, locale, currency)}
                    </Text>
                    <ProgressBar
                      progress={item.principal ? (item.principal - item.balance) / item.principal : 0}
                      fillColor={Colors.primary}
                    />
                  </View>
                  <View />
                </View>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40 }}>{t('loans.noLoansYet')}</Text>}
              contentContainerStyle={{ paddingBottom: 16 }}
            />
          </>
        );
      }, [loans, filterMode, filterName, sortKey, sortDir, groupByType, t])}
      <PromptModal
        visible={payModalVisible}
        title={t('loans.recordPayment')}
        onCancel={() => setPayModalVisible(false)}
        onConfirm={handleSavePayment}
        cancelText={t('common.cancel')}
        confirmText={t('common.save')}
      >
        <Input
          placeholder={t('loans.amount')}
          value={payAmount}
          onChangeText={setPayAmount}
          keyboardType="numeric"
          style={styles.modalInput}
        />
        <View style={{ height: 12 }} />
        <Text style={{ color: Colors.mutedText, marginBottom: 6 }}>{t('loans.date')}</Text>
        <TouchableOpacity style={styles.pickerLike} onPress={() => setShowPayDatePicker(true)} activeOpacity={0.7}>
          <Text style={{ color: Colors.text }}>{payDateISO}</Text>
        </TouchableOpacity>
        {showPayDatePicker && (
          <DateTimePicker
            value={(() => { const [y,m,d]=payDateISO.split('-').map(n=>parseInt(n,10)); return new Date(y,(m||1)-1,d||1); })()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
            locale={locale}
            maximumDate={new Date()}
            onChange={(event: any, selected?: Date) => {
              setShowPayDatePicker(false);
              if (selected) {
                const y = selected.getFullYear();
                const m = String(selected.getMonth() + 1).padStart(2,'0');
                const d = String(selected.getDate()).padStart(2,'0');
                setPayDateISO(`${y}-${m}-${d}`);
              }
            }}
          />
        )}
      </PromptModal>

      {/* Filter Modal */}
      <PromptModal visible={filterModalVisible} title="Filter Loans" onCancel={() => setFilterModalVisible(false)} showConfirm={false} cancelText="Close">
        <View>
          <Text style={{ color: Colors.mutedText, marginBottom: 8 }}>Filter By</Text>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <Button title="None" variant={filterMode === 'none' ? 'primary' : 'neutral'} onPress={() => { setFilterMode('none'); setFilterName(undefined); }} small style={filterMode === 'none' ? { marginRight: 8 } : { marginRight: 8, ...btnNeutralStyle }} textStyle={filterMode === 'none' ? undefined : (btnNeutralText as any)} />
            <Button title="Borrower" variant={filterMode === 'borrower' ? 'primary' : 'neutral'} onPress={() => { setFilterMode('borrower'); setFilterName(undefined); }} small style={filterMode === 'borrower' ? { marginRight: 8 } : { marginRight: 8, ...btnNeutralStyle }} textStyle={filterMode === 'borrower' ? undefined : (btnNeutralText as any)} />
            <Button title="Lender" variant={filterMode === 'lender' ? 'primary' : 'neutral'} onPress={() => { setFilterMode('lender'); setFilterName(undefined); }} small style={filterMode === 'lender' ? undefined : ({ ...btnNeutralStyle } as any)} textStyle={filterMode === 'lender' ? undefined : (btnNeutralText as any)} />
          </View>
          {filterMode !== 'none' && (
            <View style={{ maxHeight: 240 }}>
              <Text style={{ color: Colors.mutedText, marginBottom: 8 }}>Select {filterMode === 'borrower' ? 'Borrower' : 'Lender'}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ margin: 4 }}>
                  <Button title="All" variant={!filterName ? 'primary' : 'neutral'} onPress={() => setFilterName(undefined)} small style={!filterName ? undefined : ({ ...btnNeutralStyle } as any)} textStyle={!filterName ? undefined : (btnNeutralText as any)} />
                </View>
                {(() => {
                  const useBorrowers = filterMode === 'borrower';
                  const namesSet = new Set<string>();
                  loans.forEach(l => { if (useBorrowers ? l.type === 'owedToMe' : l.type === 'owedByMe') namesSet.add(l.counterpartName); });
                  counterparties.forEach(cp => namesSet.add(cp.name));
                  const names = Array.from(namesSet);
                  const ordered = names.sort((a,b) => {
                    const ca = counterparties.find(c => c.name === a)?.lastUsedAt || 0;
                    const cb = counterparties.find(c => c.name === b)?.lastUsedAt || 0;
                    if (cb !== ca) return cb - ca;
                    return a.localeCompare(b);
                  });
                  return ordered.map(n => (
                    <View key={n} style={{ margin: 4 }}>
                      <Button title={n} variant={filterName === n ? 'primary' : 'neutral'} onPress={() => setFilterName(n)} small style={filterName === n ? undefined : ({ ...btnNeutralStyle } as any)} textStyle={filterName === n ? undefined : (btnNeutralText as any)} />
                    </View>
                  ));
                })()}
              </View>
            </View>
          )}
        </View>
      </PromptModal>

      {/* Sort Modal */}
      <PromptModal visible={sortModalVisible} title="Sort Loans" onCancel={() => setSortModalVisible(false)} showConfirm={false} cancelText="Close">
        <View>
          <Text style={{ color: Colors.mutedText, marginBottom: 8 }}>By</Text>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <Button title="Date" variant={sortKey === 'date' ? 'primary' : 'neutral'} onPress={() => setSortKey('date')} small style={{ marginRight: 8 }} />
            <Button title="Amount" variant={sortKey === 'amount' ? 'primary' : 'neutral'} onPress={() => setSortKey('amount')} small />
          </View>
          <Text style={{ color: Colors.mutedText, marginBottom: 8 }}>Direction</Text>
          <View style={{ flexDirection: 'row' }}>
            <Button title="Asc" variant={sortDir === 'asc' ? 'primary' : 'neutral'} onPress={() => setSortDir('asc')} small style={{ marginRight: 8 }} />
            <Button title="Desc" variant={sortDir === 'desc' ? 'primary' : 'neutral'} onPress={() => setSortDir('desc')} small />
          </View>
        </View>
      </PromptModal>

      {/* Group Modal */}
      <PromptModal visible={groupModalVisible} title="Group Loans" onCancel={() => setGroupModalVisible(false)} showConfirm={false} cancelText="Close">
        <View>
          <Text style={{ color: Colors.mutedText, marginBottom: 8 }}>Group By</Text>
          <View style={{ flexDirection: 'row' }}>
            <Button title="None" variant={!groupByType ? 'primary' : 'neutral'} onPress={() => setGroupByType(false)} small style={{ marginRight: 8 }} />
            <Button title="Type" variant={groupByType ? 'primary' : 'neutral'} onPress={() => setGroupByType(true)} small />
          </View>
        </View>
      </PromptModal>

      {/* Delete Confirm Modal */}
      <PromptModal
        visible={deleteModalVisible}
        title="Delete Loan"
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={async () => { if (loanIdToDelete) await deleteLoan(loanIdToDelete); setDeleteModalVisible(false); }}
        confirmText="Delete"
        cancelText="Cancel"
      >
        <Text style={{ color: Colors.text }}>Are you sure you want to delete this loan?</Text>
      </PromptModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background },
  row: { flexDirection: 'row', marginBottom: 12, alignItems: 'center' },
  icon: { marginRight: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: 8 },
  input: { marginRight: 8, flex: 1 },
  item: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalInput: {
    width: '100%',
  },
  pickerLike: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
  title: { fontWeight: '600', color: Colors.text },
  sectionHeading: { fontWeight: '700', color: Colors.text, marginTop: 8, fontSize: 16 },
  summaryCard: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 10, marginBottom: 8, backgroundColor: Colors.surface },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  summaryLabel: { color: Colors.mutedText },
  summaryValue: { color: Colors.text },
});
