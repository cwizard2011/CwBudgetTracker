import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { PromptModal } from '../../components/ui/PromptModal';
import { SimpleBarChart } from '../../components/ui/SimpleBarChart';
import { useBudgets } from '../../context/BudgetContext';
import { useSettings } from '../../context/SettingsContext';
import { Colors } from '../../theme/colors';
import { formatCurrency } from '../../utils/format';
import { useI18n } from '../../utils/i18n';


type Period = 'weekly' | 'monthly' | 'quarterly' | 'annual';

export function BudgetHistoryScreen() {
  const { budgets } = useBudgets() as any;
  const { locale, currency } = useSettings();
  const t = useI18n();

  const [period, setPeriod] = useState<Period>('monthly');
  const [startISO, setStartISO] = useState<string | undefined>(undefined);
  const [endISO, setEndISO] = useState<string | undefined>(undefined);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [useCustomRange, setUseCustomRange] = useState(false);

  const itemsInRange = useMemo(() => {
    if (useCustomRange && startISO && endISO) {
      const start = new Date(startISO).getTime();
      const end = new Date(endISO).getTime();
      return budgets.filter((b: any) => {
        const dt = new Date(b.dateISO || `${b.period}-01`).getTime();
        return dt >= start && dt <= end;
      });
    }
    return budgets;
  }, [budgets, useCustomRange, startISO, endISO]);

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

  const { categories, plannedSeries, spentSeries, totals } = useMemo(() => {
    const map = new Map<string, { planned: number; spent: number }>();
    const buckets: string[] = [];

    if (useCustomRange && startISO && endISO) {
      const label = `${new Date(startISO).toLocaleDateString(locale)} - ${new Date(endISO).toLocaleDateString(locale)}`;
      const p = itemsInRange.reduce((s: number, b: any) => s + (b.amountPlanned||0), 0);
      const sp = itemsInRange.reduce((s: number, b: any) => s + (b.amountSpent||0), 0);
      return { categories: [label], plannedSeries: [p], spentSeries: [sp], totals: { planned: p, spent: sp } };
    }

    itemsInRange.forEach((b: any) => {
      const key = bucketKey(new Date(b.dateISO || `${b.period}-01`));
      if (!buckets.includes(key)) buckets.push(key);
      const agg = map.get(key) || { planned: 0, spent: 0 };
      agg.planned += b.amountPlanned || 0;
      agg.spent += b.amountSpent || 0;
      map.set(key, agg);
    });
    buckets.sort((a,b) => a.localeCompare(b));
    const planned = buckets.map(k => map.get(k)?.planned || 0);
    const spent = buckets.map(k => map.get(k)?.spent || 0);
    const totals = {
      planned: planned.reduce((s,n)=>s+n,0),
      spent: spent.reduce((s,n)=>s+n,0),
    };
    return { categories: buckets, plannedSeries: planned, spentSeries: spent, totals };
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
      <Text style={styles.heading}>{t('budget.historyTitle')}</Text>

      <View style={[styles.card, { marginBottom: 12 }]}> 
        <View style={[styles.row, { alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }]} >
            <Button title={t('period.weekly')} small variant={period==='weekly' && !useCustomRange?'primary':'neutral'} onPress={() => { setUseCustomRange(false); setStartISO(undefined); setEndISO(undefined); setPeriod('weekly'); }} style={{ marginRight: 6 }} />
            <Button title={t('period.monthly')} small variant={period==='monthly' && !useCustomRange?'primary':'neutral'} onPress={() => { setUseCustomRange(false); setStartISO(undefined); setEndISO(undefined); setPeriod('monthly'); }} style={{ marginRight: 6 }} />
            <Button title={t('period.quarterly')} small variant={period==='quarterly' && !useCustomRange?'primary':'neutral'} onPress={() => { setUseCustomRange(false); setStartISO(undefined); setEndISO(undefined); setPeriod('quarterly'); }} style={{ marginRight: 6 }} />
            <Button title={t('period.annual')} small variant={period==='annual' && !useCustomRange?'primary':'neutral'} onPress={() => { setUseCustomRange(false); setStartISO(undefined); setEndISO(undefined); setPeriod('annual'); }} />
            <Button title={t('loans.customDate')} small variant="neutral" onPress={() => setDateModalVisible(true)} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[styles.label, { marginBottom: 8 }]}>{t('budget.plannedVsSpent')}</Text>
        <SimpleBarChart
          categories={categories}
          series={[
            { label: t('budget.plannedTotal'), data: plannedSeries, color: Colors.secondary },
            { label: t('budget.spentTotal'), data: spentSeries, color: Colors.primary },
          ]}
          height={280}
        />
        <View style={{ marginTop: 12 }}>
          <Text style={styles.value}>{t('budget.plannedTotal')}: {formatCurrency(totals.planned, locale, currency)}</Text>
          <Text style={styles.value}>{t('budget.spentTotal')}: {formatCurrency(totals.spent, locale, currency)}</Text>
        </View>
      </View>

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
          <DateTimePicker value={startISO ? new Date(startISO) : new Date()} mode="date" display={Platform.OS==='ios'?'spinner':'calendar'} onChange={(e, d) => { setShowStart(false); if (d) { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); setStartISO(`${y}-${m}-${dd}`);} }} />
        )}
        {showEnd && (
          <DateTimePicker value={endISO ? new Date(endISO) : new Date()} mode="date" display={Platform.OS==='ios'?'spinner':'calendar'} onChange={(e, d) => { setShowEnd(false); if (d) { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); setEndISO(`${y}-${m}-${dd}`);} }} />
        )}
      </PromptModal>
    </ScrollView>
  );
}


