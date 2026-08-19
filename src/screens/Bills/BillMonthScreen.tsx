import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { BillMonthlyRate, BillReading, BillReadingSource, BillType, billTypeDetails } from '../../models/BillReading';
import { billService, monthSummary } from '../../services/BillService';
import { Colors } from '../../theme/colors';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency } from '../../utils/format';

function dateToISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateFromISO(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function boundsForMonth(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number);
  return {
    min: new Date(year, month - 1, 1),
    max: new Date(year, month, 0),
  };
}

function defaultDateForMonth(yearMonth: string) {
  const { min, max } = boundsForMonth(yearMonth);
  const now = new Date();
  return dateToISO(now >= min && now <= max ? now : max);
}

function detectMeterType(text: string): BillType | undefined {
  const normalized = text.toLowerCase().replace(/³/g, '3');
  if (/\bk\s*w\s*h\b|kilowatt|electric(?:ity)?|\bvolts?\b/.test(normalized)) return 'electricity';
  if (/aquadis|\bwater\b|\b[aá]gua\b|\bq3\b|m3\s*\/\s*h|litres?|liters?/.test(normalized)) return 'water';
  if (/\bgas\b|\bmbar\b|gas meter|\bg(?:4|6|10|16)\b/.test(normalized)) return 'gas';
  return undefined;
}

function readingCandidates(text: string, billType: BillType, previousValue?: number): number[] {
  const matches = text.match(/\d[\d\s.,]{2,}\d|\d{3,}/g) || [];
  const scored = matches.flatMap(raw => {
    let cleaned = raw.replace(/\s/g, '');
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    else cleaned = cleaned.replace(/,/g, '');
    const value = Number(cleaned);
    const digits = cleaned.replace(/\D/g, '');
    let score = 0;
    if (/^0\d{3,}/.test(digits)) score += 8; // Mechanical registers commonly include leading zeroes.
    if (/[.,]/.test(raw)) score += 3;
    if (digits.length >= 4 && digits.length <= 8) score += 3;
    if (value >= 1) score += 3;
    if (value > 99999999 || value < 0.01) score -= 5;
    const candidates = [{ value, score }];
    // Gas/water mechanical meters show decimal wheels in red. OCR sees the
    // complete register as one integer, so infer the usual decimal position.
    if (billType !== 'electricity' && !/[.,]/.test(raw) && /^0\d{4,7}$/.test(digits)) {
      const preferredDivisor = digits.length >= 7 ? 1000 : 10;
      candidates.push({ value: value / preferredDivisor, score: score + 5 });
      [10, 100, 1000].filter(divisor => divisor !== preferredDivisor).forEach(divisor => {
        candidates.push({ value: value / divisor, score: score + 1 });
      });
    }
    return candidates;
  }).filter(item => Number.isFinite(item.value) && item.value >= 0);

  if (previousValue !== undefined) {
    scored.forEach(item => {
      if (item.value < previousValue) {
        item.score -= 12;
        return;
      }
      const increase = item.value - previousValue;
      // A valid cumulative meter normally moves forward by the smallest
      // plausible amount; this helps reject serial/model numbers.
      item.score += Math.max(0, 10 - Math.log10(increase + 1) * 3);
    });
  }
  const unique = new Map<number, number>();
  scored.forEach(item => unique.set(item.value, Math.max(item.score, unique.get(item.value) ?? -Infinity)));
  return Array.from(unique.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([number]) => number);
}

export function BillMonthScreen({ route }: any) {
  const billType = route.params.billType as BillType;
  const yearMonth = route.params.yearMonth as string;
  const details = billTypeDetails(billType);
  const { currency, locale } = useSettings();
  const [editing, setEditing] = useState(route.params.mode === 'update');
  const [allReadings, setAllReadings] = useState<BillReading[]>([]);
  const [monthlyRate, setMonthlyRate] = useState<BillMonthlyRate>();
  const [unitPrice, setUnitPrice] = useState('');
  const [date, setDate] = useState(defaultDateForMonth(yearMonth));
  const [value, setValue] = useState('');
  const [source, setSource] = useState<BillReadingSource>('manual');
  const [previewUri, setPreviewUri] = useState<string>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scanning, setScanning] = useState(false);

  const load = useCallback(async () => {
    const [readings, rates] = await Promise.all([
      billService.getReadings(billType),
      billService.getRates(billType),
    ]);
    const rate = rates.find(item => item.yearMonth === yearMonth);
    setAllReadings(readings);
    setMonthlyRate(rate);
    setUnitPrice(rate ? String(rate.pricePerUnit) : '');
  }, [billType, yearMonth]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const summary = useMemo(() => monthSummary(allReadings, yearMonth), [allReadings, yearMonth]);
  const bounds = useMemo(() => boundsForMonth(yearMonth), [yearMonth]);
  const estimatedCost = monthlyRate ? summary.usage * monthlyRate.pricePerUnit : undefined;

  const scan = async (nextSource: 'camera' | 'library') => {
    try {
      const response = nextSource === 'camera'
        ? await launchCamera({ mediaType: 'photo', cameraType: 'back', maxWidth: 2000, maxHeight: 2000, quality: 0.9 })
        : await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, maxWidth: 2000, maxHeight: 2000, quality: 0.9 });
      if (response.didCancel) return;
      if (response.errorCode) throw new Error(response.errorMessage || response.errorCode);
      const uri = response.assets?.[0]?.uri;
      if (!uri) throw new Error('The selected image could not be opened.');
      setPreviewUri(uri);
      setScanning(true);
      const result = await TextRecognition.recognize(uri);
      const detectedType = detectMeterType(result.text);
      if (detectedType && detectedType !== billType) {
        const detectedName = billTypeDetails(detectedType).title;
        Alert.alert(
          `${detectedName} meter detected`,
          `This photo does not appear to be a ${details.title.toLowerCase()} meter. Go back and open ${detectedName} before saving this reading.`,
        );
        return;
      }
      const prior = [...allReadings].filter(item => item.date <= date).pop();
      const candidates = readingCandidates(result.text, detectedType || billType, prior?.value);
      if (!candidates.length) {
        Alert.alert('No reading found', 'Try a closer, straight-on photo with the meter display clearly visible, or enter the reading manually.');
        return;
      }
      setValue(String(candidates[0]));
      setSource(nextSource);
      const detection = detectedType ? `${billTypeDetails(detectedType).title} meter detected.\n\n` : '';
      Alert.alert('Reading detected', `${detection}${candidates[0]} ${details.unit}\n\nPlease check the number against the photo before saving.`);
    } catch (error: any) {
      Alert.alert('Could not read photo', error?.message || 'Please enter the meter reading manually.');
    } finally {
      setScanning(false);
    }
  };

  const save = async () => {
    const number = Number(value.trim().replace(',', '.'));
    if (!Number.isFinite(number) || number < 0) {
      Alert.alert('Enter a valid reading', 'The meter reading must be zero or greater.');
      return;
    }
    await billService.saveReading({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      billType,
      date,
      value: number,
      source,
      createdAt: Date.now(),
    });
    setValue('');
    setSource('manual');
    setPreviewUri(undefined);
    await load();
  };

  const saveUnitPrice = async () => {
    const number = Number(unitPrice.trim().replace(',', '.'));
    if (!Number.isFinite(number) || number < 0) {
      Alert.alert('Enter a valid unit price', 'The price per unit must be zero or greater.');
      return;
    }
    const rate: BillMonthlyRate = {
      billType,
      yearMonth,
      pricePerUnit: number,
      currency,
      updatedAt: Date.now(),
    };
    await billService.saveRate(rate);
    setMonthlyRate(rate);
    setUnitPrice(String(number));
  };

  const remove = (reading: BillReading) => {
    Alert.alert('Delete reading?', `${formatDate(reading.date)} • ${formatNumber(reading.value)} ${details.unit}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await billService.deleteReading(reading.id); await load(); } },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: Colors.background }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.heading, { color: Colors.heading }]}>{details.icon} {details.title}</Text>
      <Text style={[styles.month, { color: Colors.mutedText }]}>{formatMonth(yearMonth)}</Text>

      <View style={styles.summaryRow}>
        <SummaryBox label="Units used" value={`${formatNumber(summary.usage)} ${details.unit}`} color={Colors[details.colorKey]} />
        <SummaryBox label="Latest reading" value={summary.latest ? `${formatNumber(summary.latest.value)} ${details.unit}` : '—'} color={Colors.success} />
      </View>
      <View style={[styles.costCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.mutedText, fontSize: 12 }}>Estimated usage cost</Text>
          <Text style={[styles.costValue, { color: Colors.heading }]}>{estimatedCost === undefined ? '—' : formatCurrency(estimatedCost, locale, monthlyRate!.currency)}</Text>
        </View>
        <Text style={{ color: Colors.mutedText }}>{monthlyRate ? `${formatCurrency(monthlyRate.pricePerUnit, locale, monthlyRate.currency)} / ${details.unit}` : 'No unit price'}</Text>
      </View>
      {summary.latest && summary.baseline && (
        <Text style={[styles.explanation, { color: Colors.mutedText }]}>Usage is the latest reading minus {summary.baseline.date.startsWith(yearMonth) ? 'the first reading this month' : `the previous reading (${formatNumber(summary.baseline.value)})`}.</Text>
      )}

      {!editing && (
        <Button title="Update this month" onPress={() => setEditing(true)} iconName="edit" style={{ marginTop: 16 }} />
      )}

      {editing && (
        <View style={[styles.rateForm, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Text style={[styles.formTitle, { color: Colors.heading }]}>Price for {formatMonth(yearMonth)}</Text>
          <Text style={[styles.label, { color: Colors.mutedText }]}>Price per {details.unit} ({currency})</Text>
          <View style={styles.priceRow}>
            <Input value={unitPrice} onChangeText={setUnitPrice} keyboardType="decimal-pad" placeholder="e.g. 0.02" style={{ flex: 1 }} />
            <Button title="Save price" onPress={saveUnitPrice} disabled={!unitPrice.trim()} style={{ marginLeft: 8 }} />
          </View>
          <Text style={[styles.priceHelp, { color: Colors.mutedText }]}>Used to estimate this month's consumption cost. Fixed fees and taxes are not included.</Text>
        </View>
      )}

      {editing && (
        <View style={[styles.form, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Text style={[styles.formTitle, { color: Colors.heading }]}>Add meter reading</Text>
          <Text style={[styles.label, { color: Colors.mutedText }]}>Reading date</Text>
          <TouchableOpacity style={[styles.dateButton, { borderColor: Colors.border }]} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: Colors.text, fontWeight: '600' }}>{formatDate(date)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dateFromISO(date)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              minimumDate={bounds.min}
              maximumDate={bounds.max}
              onChange={(_, selected) => { setShowDatePicker(false); if (selected) setDate(dateToISO(selected)); }}
            />
          )}

          <Text style={[styles.label, { color: Colors.mutedText, marginTop: 14 }]}>Meter reading ({details.unit})</Text>
          <Input value={value} onChangeText={text => { setValue(text); setSource('manual'); }} keyboardType="decimal-pad" placeholder="Enter the number shown on the meter" />

          <Text style={[styles.or, { color: Colors.mutedText }]}>or read it from a photo</Text>
          <View style={styles.photoActions}>
            <Button title="Take photo" variant="secondary" iconName="camera-alt" onPress={() => scan('camera')} disabled={scanning} style={styles.photoButton} />
            <Button title="Choose photo" variant="neutral" iconName="photo-library" onPress={() => scan('library')} disabled={scanning} style={styles.photoButton} />
          </View>
          {scanning && <View style={styles.scanning}><ActivityIndicator color={Colors.primary} /><Text style={{ color: Colors.mutedText, marginLeft: 8 }}>Reading meter…</Text></View>}
          {previewUri && <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />}
          {source !== 'manual' && value ? <Text style={[styles.verify, { color: Colors.warningDark }]}>Photo result: verify {value} before saving.</Text> : null}
          <Button title="Save reading" variant="success" onPress={save} disabled={!value.trim() || scanning} style={{ marginTop: 14 }} />
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: Colors.heading }]}>Readings</Text>
      {summary.readings.length === 0 ? (
        <View style={[styles.empty, { borderColor: Colors.border, backgroundColor: Colors.surface }]}>
          <Text style={{ color: Colors.mutedText }}>No meter readings saved for this month.</Text>
        </View>
      ) : summary.readings.map((reading, index) => {
        const prior = index > 0 ? summary.readings[index - 1] : (summary.baseline?.id !== reading.id ? summary.baseline : undefined);
        const change = prior ? reading.value - prior.value : undefined;
        return (
          <View key={reading.id} style={[styles.readingRow, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.text, fontWeight: '800', fontSize: 17 }}>{formatNumber(reading.value)} {details.unit}</Text>
              <Text style={{ color: Colors.mutedText, marginTop: 3 }}>{formatDate(reading.date)} • {reading.source === 'manual' ? 'Manual entry' : 'Read from photo'}</Text>
              {change !== undefined && <Text style={{ color: change < 0 ? Colors.error : Colors.successDark, marginTop: 3 }}>Change: {change >= 0 ? '+' : ''}{formatNumber(change)} {details.unit}</Text>}
            </View>
            {editing && <Button title="Delete" variant="danger" small onPress={() => remove(reading)} />}
          </View>
        );
      })}
    </ScrollView>
  );
}

function SummaryBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.summaryBox, { backgroundColor: color }]}>
      <Text style={{ color: '#FFFFFF', opacity: 0.9, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '800', marginTop: 4 }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function formatDate(iso: string) {
  return dateFromISO(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMonth(yearMonth: string) {
  return dateFromISO(`${yearMonth}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 44 },
  heading: { fontSize: 25, fontWeight: '800' },
  month: { fontSize: 15, marginTop: 3 },
  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  summaryBox: { flex: 1, borderRadius: 10, padding: 13, minWidth: 0 },
  costCard: { borderWidth: 1, borderRadius: 10, padding: 13, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  costValue: { fontSize: 21, fontWeight: '800', marginTop: 3 },
  explanation: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  form: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 16 },
  rateForm: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  priceHelp: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  formTitle: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
  label: { fontSize: 13, marginBottom: 6 },
  dateButton: { borderWidth: 1, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 12 },
  or: { fontSize: 12, textAlign: 'center', marginVertical: 12 },
  photoActions: { flexDirection: 'row', gap: 8 },
  photoButton: { flex: 1 },
  scanning: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  preview: { width: '100%', height: 160, borderRadius: 8, marginTop: 12 },
  verify: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: 24, marginBottom: 10 },
  empty: { borderWidth: 1, borderRadius: 10, padding: 16 },
  readingRow: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
});
