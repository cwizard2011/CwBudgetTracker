import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { MonthPicker } from '../../components/ui/MonthPicker';
import { BillMonthlyRate, BillReading, BillType, ELECTRICITY_REGISTERS, billTypeDetails } from '../../models/BillReading';
import { billService, estimatedBillCost, monthSummary } from '../../services/BillService';
import { Colors } from '../../theme/colors';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrencyWithCode } from '../../utils/format';

const currentYearMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export function BillOverviewScreen({ navigation, route }: any) {
  const billType = route.params.billType as BillType;
  const details = billTypeDetails(billType);
  const { billCurrency, locale } = useSettings();
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [readings, setReadings] = useState<BillReading[]>([]);
  const [rates, setRates] = useState<BillMonthlyRate[]>([]);

  const load = useCallback(async () => {
    const [nextReadings, nextRates] = await Promise.all([
      billService.getReadings(billType),
      billService.getRates(billType),
    ]);
    setReadings(nextReadings);
    setRates(nextRates);
  }, [billType]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const summary = useMemo(() => monthSummary(readings, yearMonth), [readings, yearMonth]);
  const selectedRate = rates.find(item => item.yearMonth === yearMonth);
  const selectedEstimatedCost = estimatedBillCost(summary, selectedRate);
  const recentMonths = useMemo(() => {
    const months = Array.from(new Set(readings.map(item => item.date.slice(0, 7)))).sort().reverse();
    return months.slice(0, 6).map(month => ({
      month,
      rate: rates.find(item => item.yearMonth === month),
      ...monthSummary(readings, month),
    }));
  }, [readings, rates]);

  const openMonth = (mode: 'view' | 'update', month = yearMonth) => {
    navigation.navigate('BillMonth', { billType, yearMonth: month, mode });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: Colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <Text style={styles.icon}>{details.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heading, { color: Colors.heading }]}>{details.title}</Text>
          <Text style={{ color: Colors.mutedText }}>Monthly meter readings</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        <Text style={[styles.cardTitle, { color: Colors.text }]}>Select a month</Text>
        <MonthPicker yearMonth={yearMonth} onChange={setYearMonth} />
        <View style={styles.statsRow}>
          <Stat label="Readings" value={String(summary.readings.length)} />
          <Stat label={summary.electricityRegisters ? 'Latest total' : 'Latest'} value={summary.latest ? `${formatNumber(summary.latest.value)} ${details.unit}` : '—'} />
          <Stat label="Units used" value={summary.readings.length ? `${formatNumber(summary.usage)} ${details.unit}` : '—'} />
        </View>
        {summary.electricityRegisters && (
          <View style={[styles.registerSummary, { borderTopColor: Colors.border }]}>
            {ELECTRICITY_REGISTERS.map(register => (
              <View key={register.key} style={styles.registerStat}>
                <Text style={{ color: Colors.mutedText, fontSize: 11 }} numberOfLines={1}>{register.title}</Text>
                <Text style={{ color: Colors.text, fontWeight: '800', marginTop: 3 }}>{formatNumber(summary.electricityRegisters![register.key].usage)} kWh</Text>
              </View>
            ))}
          </View>
        )}
        <View style={[styles.priceSummary, { borderTopColor: Colors.border }]}>
          <Text style={{ color: Colors.mutedText }}>Unit price</Text>
          <Text style={{ color: Colors.text, fontWeight: '700' }}>
            {selectedRate?.electricityRegisterPrices
              ? `3 time-band prices (${selectedRate.currency})`
              : selectedRate ? `${formatCurrencyWithCode(selectedRate.pricePerUnit, locale, selectedRate.currency)} / ${details.unit}` : `Not set (${billCurrency})`}
          </Text>
        </View>
        <View style={styles.priceSummary}>
          <Text style={{ color: Colors.mutedText }}>Estimated usage cost</Text>
          <Text style={{ color: Colors.heading, fontWeight: '800' }}>
            {selectedRate && summary.readings.length && selectedEstimatedCost !== undefined
              ? formatCurrencyWithCode(selectedEstimatedCost, locale, selectedRate.currency)
              : '—'}
          </Text>
        </View>
        <View style={styles.actions}>
          <Button title="View monthly bill" variant="neutral" onPress={() => openMonth('view')} style={styles.action} />
          <Button title="Update bill" onPress={() => openMonth('update')} style={styles.action} />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: Colors.heading }]}>Recent months</Text>
      {recentMonths.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Text style={{ color: Colors.text, fontWeight: '700' }}>No readings yet</Text>
          <Text style={{ color: Colors.mutedText, marginTop: 4 }}>Select a month above, then tap Update bill to add the first one.</Text>
        </View>
      ) : recentMonths.map(item => (
        <View key={item.month} style={[styles.monthRow, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.text, fontWeight: '700' }}>{formatMonth(item.month)}</Text>
            <Text style={{ color: Colors.mutedText, marginTop: 3 }}>{item.readings.length} reading{item.readings.length === 1 ? '' : 's'} • {formatNumber(item.usage)} {details.unit} used</Text>
            {item.rate && estimatedBillCost(item, item.rate) !== undefined && (
              <Text style={{ color: Colors.successDark, marginTop: 3 }}>{formatCurrencyWithCode(estimatedBillCost(item, item.rate)!, locale, item.rate.currency)} estimated</Text>
            )}
          </View>
          <Button title="View" small onPress={() => openMonth('view', item.month)} />
        </View>
      ))}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={{ color: Colors.mutedText, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: Colors.text, fontWeight: '800', marginTop: 3 }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function formatMonth(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  icon: { fontSize: 42, marginRight: 12 },
  heading: { fontSize: 25, fontWeight: '800' },
  card: { borderWidth: 1, borderRadius: 12, padding: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 7, marginTop: 16 },
  stat: { flex: 1, minWidth: 0 },
  registerSummary: { borderTopWidth: 1, paddingTop: 10, marginTop: 10, flexDirection: 'row', gap: 7 },
  registerStat: { flex: 1, minWidth: 0 },
  priceSummary: { borderTopWidth: 1, paddingTop: 9, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 18 },
  action: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: 24, marginBottom: 10 },
  empty: { borderWidth: 1, borderRadius: 10, padding: 16 },
  monthRow: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
});
