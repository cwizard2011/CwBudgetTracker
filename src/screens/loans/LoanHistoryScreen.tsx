import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { PromptModal } from '../../components/ui/PromptModal';
import { SimpleBarChart } from '../../components/ui/SimpleBarChart';
import { useLoans } from '../../context/LoanContext';
import { useSettings } from '../../context/SettingsContext';
import { Colors } from '../../theme/colors';
import { formatCurrency } from '../../utils/format';
import { useI18n } from '../../utils/i18n';

type Period = 'weekly' | 'monthly' | 'quarterly' | 'annual';

export function LoanHistoryScreen() {
  const { loans, counterparties } = useLoans() as any;
  const { locale, currency } = useSettings();
  const t = useI18n();

  const [period, setPeriod] = useState<Period>('monthly');
  const [startISO, setStartISO] = useState<string | undefined>(undefined);
  const [endISO, setEndISO] = useState<string | undefined>(undefined);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all'|'owedToMe'|'owedByMe'>('all');
  const [nameFilter, setNameFilter] = useState<string | undefined>(undefined);
  const [useCustomRange, setUseCustomRange] = useState(false);

  const itemsInRange = useMemo(() => {
    let list = loans.slice();
    if (useCustomRange && startISO && endISO) {
      const start = new Date(startISO).getTime();
      const end = new Date(endISO).getTime();
      list = list.filter((l: any) => {
        const dt = new Date(l.loanDate || l.createdAt).getTime();
        return dt >= start && dt <= end;
      });
    }
    if (categoryFilter !== 'all') list = list.filter((l: any) => l.type === categoryFilter);
    if (nameFilter) list = list.filter((l: any) => l.counterpartName === nameFilter);
    return list;
  }, [loans, useCustomRange, startISO, endISO, categoryFilter, nameFilter]);

  function bucketKey(date: Date): string {
    if (period === 'weekly') {
      const first = new Date(date.getFullYear(),0,1);
      const diff = Math.floor((date.getTime() - first.getTime()) / (7*24*3600*1000));
      return `W${diff+1} ${date.getFullYear()}`;
    }
    if (period === 'quarterly') {
      return `Q${Math.floor(date.getMonth()/3)+1} ${date.getFullYear()}`;
    }
    if (period === 'annual') {
      return `${date.getFullYear()}`;
    }
    return date.toLocaleString(locale, { month: 'short', year: 'numeric' });
  }

  const { categories, owedToMeSeries, iOweSeries, paidToMeSeries, paidByMeSeries, totals } = useMemo(() => {
    const bucketSet = new Set<string>();
    const owedMap = new Map<string, number>();
    const oweMap = new Map<string, number>();
    const paidToMeMap = new Map<string, number>();
    const paidByMeMap = new Map<string, number>();

    if (useCustomRange && startISO && endISO) {
      const label = `${new Date(startISO).toLocaleDateString(locale)} - ${new Date(endISO).toLocaleDateString(locale)}`;
      const owed = itemsInRange.filter((l:any)=>l.type==='owedToMe').reduce((s:number,l:any)=>s+(l.principal||0),0);
      const owe = itemsInRange.filter((l:any)=>l.type==='owedByMe').reduce((s:number,l:any)=>s+(l.principal||0),0);
      const paidToMe = itemsInRange.filter((l:any)=>l.type==='owedToMe').reduce((s:number,l:any)=>s + (l.payments||[]).reduce((p:number,x:any)=>p+(x.amount||0),0), 0);
      const paidByMe = itemsInRange.filter((l:any)=>l.type==='owedByMe').reduce((s:number,l:any)=>s + (l.payments||[]).reduce((p:number,x:any)=>p+(x.amount||0),0), 0);
      return { categories: [label], owedToMeSeries: [owed], iOweSeries: [owe], paidToMeSeries: [paidToMe], paidByMeSeries: [paidByMe], totals: { owedToMe: owed, iOwe: owe } };
    }

    itemsInRange.forEach((l: any) => {
      const issueKey = bucketKey(new Date(l.loanDate || l.createdAt));
      bucketSet.add(issueKey);
      if (l.type === 'owedToMe') owedMap.set(issueKey, (owedMap.get(issueKey) || 0) + (l.principal || 0));
      else oweMap.set(issueKey, (oweMap.get(issueKey) || 0) + (l.principal || 0));
      (l.payments || []).forEach((p: any) => {
        const pKey = bucketKey(new Date(p.date));
        bucketSet.add(pKey);
        if (l.type === 'owedToMe') {
          paidToMeMap.set(pKey, (paidToMeMap.get(pKey) || 0) + (p.amount || 0));
        } else {
          paidByMeMap.set(pKey, (paidByMeMap.get(pKey) || 0) + (p.amount || 0));
        }
      });
    });
    const buckets = Array.from(bucketSet).sort((a,b) => a.localeCompare(b));
    const owedData = buckets.map(k => owedMap.get(k) || 0);
    const oweData = buckets.map(k => oweMap.get(k) || 0);
    const paidToMeData = buckets.map(k => paidToMeMap.get(k) || 0);
    const paidByMeData = buckets.map(k => paidByMeMap.get(k) || 0);
    const totals = { owedToMe: owedData.reduce((s,n)=>s+n,0), iOwe: oweData.reduce((s,n)=>s+n,0) };
    return { categories: buckets, owedToMeSeries: owedData, iOweSeries: oweData, paidToMeSeries: paidToMeData, paidByMeSeries: paidByMeData, totals };
  }, [itemsInRange, period, useCustomRange, startISO, endISO, locale]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    heading: { fontSize: 20, fontWeight: '800', color: Colors.heading, marginBottom: 12 },
    card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 16 },
    row: { flexDirection: 'row', alignItems: 'center' },
    pickerLike: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
    label: { color: Colors.mutedText },
    value: { color: Colors.text, fontWeight: '600' },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.heading}>{t('loans.historyTitle')}</Text>
      <View style={[styles.card, { marginBottom: 12 }]}> 
        <View style={[styles.row, { alignItems: 'flex-start', flex: 1, flexWrap: 'wrap', gap: 16 }] }>
            <Button title={t('period.weekly')} small variant={period==='weekly' && !useCustomRange?'primary':'neutral'} onPress={() => { setUseCustomRange(false); setStartISO(undefined); setEndISO(undefined); setPeriod('weekly'); }} style={{ marginRight: 6 }} />
            <Button title={t('period.monthly')} small variant={period==='monthly' && !useCustomRange?'primary':'neutral'} onPress={() => { setUseCustomRange(false); setStartISO(undefined); setEndISO(undefined); setPeriod('monthly'); }} style={{ marginRight: 6 }} />
            <Button title={t('period.quarterly')} small variant={period==='quarterly' && !useCustomRange?'primary':'neutral'} onPress={() => { setUseCustomRange(false); setStartISO(undefined); setEndISO(undefined); setPeriod('quarterly'); }} style={{ marginRight: 6 }} />
            <Button title={t('period.annual')} small variant={period==='annual' && !useCustomRange?'primary':'neutral'} onPress={() => { setUseCustomRange(false); setStartISO(undefined); setEndISO(undefined); setPeriod('annual'); }} />
            <Button title={t('loans.customDate')} small variant="neutral" onPress={() => setDateModalVisible(true)} style={{ marginRight: 6 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
            <Button title={t('loans.filter')} small variant="neutral" onPress={() => setFilterModalVisible(true)} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[styles.label, { marginBottom: 8 }]}>{t('loans.owedToMe')} vs {t('loans.iOwe')}</Text>
        <SimpleBarChart
          categories={categories}
          series={[
            { label: 'Owed To Me', data: owedToMeSeries, color: Colors.secondary },
            { label: 'I Owe', data: iOweSeries, color: Colors.primary },
            { label: 'Paid To Me', data: paidToMeSeries, color: Colors.success },
            { label: 'Paid By Me', data: paidByMeSeries, color: Colors.warning },
          ]}
          yStep={50000}
          yMinTop={200000}
          yFormatter={(n) => `${Math.round(n/1000)}k`}
          height={280}
        />
        <View style={{ marginTop: 12 }}>
          <Text style={styles.value}>Owed To Me: {formatCurrency(totals.owedToMe, locale, currency)}</Text>
          <Text style={styles.value}>I Owe: {formatCurrency(totals.iOwe, locale, currency)}</Text>
        </View>
      </View>

      <PromptModal visible={filterModalVisible} title={t('loans.filter')} onCancel={() => setFilterModalVisible(false)} showConfirm={false} cancelText={t('common.close')}>
        <View>
          <Text style={{ color: Colors.mutedText, marginBottom: 8 }}>{t('common.category')}</Text>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <Button title={t('common.all')} small variant={categoryFilter==='all'?'primary':'neutral'} onPress={() => setCategoryFilter('all')} style={{ marginRight: 8 }} />
            <Button title={t('loans.owedToMe')} small variant={categoryFilter==='owedToMe'?'primary':'neutral'} onPress={() => setCategoryFilter('owedToMe')} style={{ marginRight: 8 }} />
            <Button title={t('loans.iOwe')} small variant={categoryFilter==='owedByMe'?'primary':'neutral'} onPress={() => setCategoryFilter('owedByMe')} />
          </View>
          <Text style={{ color: Colors.mutedText, marginBottom: 8 }}>{t('common.name')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <View style={{ margin: 4 }}>
              <Button title={t('common.all')} small variant={!nameFilter?'primary':'neutral'} onPress={() => setNameFilter(undefined)} />
            </View>
            {(() => {
              const namesSet = new Set<string>();
              itemsInRange.forEach((l: any) => namesSet.add(l.counterpartName));
              (counterparties || []).forEach((cp: any) => namesSet.add(cp.name));
              const names = Array.from(namesSet).sort((a,b)=>a.localeCompare(b));
              return names.map(n => (
                <View key={n} style={{ margin: 4 }}>
                  <Button title={n} small variant={nameFilter===n?'primary':'neutral'} onPress={() => setNameFilter(n)} />
                </View>
              ));
            })()}
          </View>
        </View>
      </PromptModal>

      <PromptModal
        visible={dateModalVisible}
        title={t('loans.customDate')}
        onCancel={() => setDateModalVisible(false)}
        onConfirm={() => { setUseCustomRange(Boolean(startISO && endISO)); setDateModalVisible(false); }}
        confirmText={t('common.apply')}
      >
        <View style={[styles.row, { marginTop: 4 }] }>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>{t('date.start')}</Text>
            <TouchableOpacity style={styles.pickerLike} onPress={() => setShowStart(true)}>
              <Text style={{ color: Colors.text }}>{startISO ?? 'Select'}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t('date.end')}</Text>
            <TouchableOpacity style={styles.pickerLike} onPress={() => setShowEnd(true)}>
              <Text style={{ color: Colors.text }}>{endISO ?? 'Select'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        {showStart && (
          <DateTimePicker value={startISO ? new Date(startISO) : new Date()} mode="date" display={Platform.OS==='ios'?'spinner':'calendar'} locale={locale} onChange={(e, d) => { setShowStart(false); if (d) { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); setStartISO(`${y}-${m}-${dd}`);} }} />
        )}
        {showEnd && (
          <DateTimePicker value={endISO ? new Date(endISO) : new Date()} mode="date" display={Platform.OS==='ios'?'spinner':'calendar'} locale={locale} onChange={(e, d) => { setShowEnd(false); if (d) { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); setEndISO(`${y}-${m}-${dd}`);} }} />
        )}
      </PromptModal>
    </ScrollView>
  );
}


