import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getDeviceCurrency, SUPPORTED_CURRENCIES } from '../../config/currencies';
import {
  BillMonthlyRate,
  BillReading,
  BillReadingSource,
  BillType,
  ELECTRICITY_REGISTERS,
  ElectricityRegister,
  ElectricityRegisterValues,
  billTypeDetails,
} from '../../models/BillReading';
import { billService, estimatedBillCost, monthSummary } from '../../services/BillService';
import { Colors } from '../../theme/colors';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrencyWithCode } from '../../utils/format';
import { detectMeterType, readingCandidates } from '../../utils/meterOcr';
import { NormalizedCropRect, PixelDimensions, restrictOcrResultToCrop } from '../../utils/ocrCrop';
import { MeterCropModal } from './components/MeterCropModal';

type ElectricityReadingMode = 'single' | 'timeOfUse';
type ScanTarget = 'single' | ElectricityRegister;

interface PendingMeterImage {
  uri: string;
  width?: number;
  height?: number;
  source: 'camera' | 'library';
  target: ScanTarget;
}

const emptyRegisterInputs = (): Record<ElectricityRegister, string> => ({
  offPeak: '',
  peak: '',
  midPeak: '',
});

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

export function BillMonthScreen({ route }: any) {
  const billType = route.params.billType as BillType;
  const yearMonth = route.params.yearMonth as string;
  const details = billTypeDetails(billType);
  const { currency: appCurrency, billCurrency, setBillCurrency, locale } = useSettings();
  const [editing, setEditing] = useState(route.params.mode === 'update');
  const [allReadings, setAllReadings] = useState<BillReading[]>([]);
  const [monthlyRate, setMonthlyRate] = useState<BillMonthlyRate>();
  const [unitPrice, setUnitPrice] = useState('');
  const [priceCurrency, setPriceCurrency] = useState(billCurrency);
  const [separateElectricityPrices, setSeparateElectricityPrices] = useState(false);
  const [electricityPrices, setElectricityPrices] = useState(emptyRegisterInputs);
  const [date, setDate] = useState(defaultDateForMonth(yearMonth));
  const [value, setValue] = useState('');
  const [electricityMode, setElectricityMode] = useState<ElectricityReadingMode>('timeOfUse');
  const [electricityValues, setElectricityValues] = useState(emptyRegisterInputs);
  const [source, setSource] = useState<BillReadingSource>('manual');
  const [previewUri, setPreviewUri] = useState<string>();
  const [pendingImage, setPendingImage] = useState<PendingMeterImage>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scanning, setScanning] = useState(false);
  const deviceCurrency = useMemo(() => getDeviceCurrency(appCurrency), [appCurrency]);
  const currencyChoices = useMemo(
    () => Array.from(new Set([priceCurrency, ...SUPPORTED_CURRENCIES])).filter(Boolean),
    [priceCurrency],
  );

  const load = useCallback(async () => {
    const [readings, rates] = await Promise.all([
      billService.getReadings(billType),
      billService.getRates(billType),
    ]);
    const rate = rates.find(item => item.yearMonth === yearMonth);
    setAllReadings(readings);
    setMonthlyRate(rate);
    setUnitPrice(rate ? String(rate.pricePerUnit) : '');
    setPriceCurrency(rate?.currency || billCurrency || deviceCurrency || appCurrency);
    setSeparateElectricityPrices(Boolean(rate?.electricityRegisterPrices));
    setElectricityPrices(Object.fromEntries(ELECTRICITY_REGISTERS.map(({ key }) => [
      key,
      rate?.electricityRegisterPrices?.[key] === undefined
        ? (rate ? String(rate.pricePerUnit) : '')
        : String(rate.electricityRegisterPrices[key]),
    ])) as Record<ElectricityRegister, string>);
    if (billType === 'electricity') {
      const monthlyReadings = readings.filter(item => item.date.startsWith(yearMonth));
      const latestMonthlyReading = monthlyReadings[monthlyReadings.length - 1];
      if (latestMonthlyReading?.electricityRegisters) setElectricityMode('timeOfUse');
      else if (latestMonthlyReading) setElectricityMode('single');
    }
  }, [appCurrency, billCurrency, billType, deviceCurrency, yearMonth]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const summary = useMemo(() => monthSummary(allReadings, yearMonth), [allReadings, yearMonth]);
  const bounds = useMemo(() => boundsForMonth(yearMonth), [yearMonth]);
  const estimatedCost = estimatedBillCost(summary, monthlyRate);
  const readingCanSave = billType === 'electricity' && electricityMode === 'timeOfUse'
    ? ELECTRICITY_REGISTERS.every(({ key }) => electricityValues[key].trim())
    : Boolean(value.trim());
  const priceCanSave = billType === 'electricity' && separateElectricityPrices
    ? ELECTRICITY_REGISTERS.every(({ key }) => electricityPrices[key].trim())
    : Boolean(unitPrice.trim());

  const scan = async (nextSource: 'camera' | 'library', target: ScanTarget = 'single') => {
    try {
      const response = nextSource === 'camera'
        ? await launchCamera({ mediaType: 'photo', cameraType: 'back', maxWidth: 2000, maxHeight: 2000, quality: 0.9 })
        : await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, maxWidth: 2000, maxHeight: 2000, quality: 0.9 });
      if (response.didCancel) return;
      if (response.errorCode) throw new Error(response.errorMessage || response.errorCode);
      const asset = response.assets?.[0];
      const uri = asset?.uri;
      if (!uri) throw new Error('The selected image could not be opened.');
      setPreviewUri(uri);
      setPendingImage({ uri, width: asset?.width, height: asset?.height, source: nextSource, target });
    } catch (error: any) {
      Alert.alert('Could not open photo', error?.message || 'Please enter the meter reading manually.');
    }
  };

  const readSelectedArea = async (crop: NormalizedCropRect, dimensions: PixelDimensions) => {
    const image = pendingImage;
    if (!image) return;
    setPendingImage(undefined);
    setScanning(true);
    try {
      const result = await TextRecognition.recognize(image.uri);
      const detectedType = detectMeterType(result.text);
      if (detectedType && detectedType !== billType) {
        const detectedName = billTypeDetails(detectedType).title;
        Alert.alert(
          `${detectedName} meter detected`,
          `This photo does not appear to be a ${details.title.toLowerCase()} meter. Go back and open ${detectedName} before saving this reading.`,
        );
        return;
      }
      const selectedResult = restrictOcrResultToCrop(result, crop, dimensions);
      const prior = [...allReadings].filter(item => (
        item.date <= date
        && (image.target === 'single' || item.electricityRegisters?.[image.target] !== undefined)
      )).pop();
      const previousValue = image.target === 'single' ? prior?.value : prior?.electricityRegisters?.[image.target];
      const candidates = readingCandidates(selectedResult, detectedType || billType, previousValue, dimensions);
      if (!candidates.length) {
        Alert.alert('No reading found', 'Adjust the crop around only the number display, try a closer straight-on photo, or enter the reading manually.');
        return;
      }
      if (image.target === 'single') setValue(String(candidates[0]));
      else setElectricityValues(current => ({ ...current, [image.target]: String(candidates[0]) }));
      setSource(image.source);
      const detection = detectedType ? `${billTypeDetails(detectedType).title} meter detected.\n\n` : '';
      const targetLabel = image.target === 'single'
        ? ''
        : `${ELECTRICITY_REGISTERS.find(item => item.key === image.target)?.title}: `;
      Alert.alert('Reading detected', `${detection}${targetLabel}${candidates[0]} ${details.unit}\n\nPlease check the number against the cropped photo before saving.`);
    } catch (error: any) {
      Alert.alert('Could not read photo', error?.message || 'Please enter the meter reading manually.');
    } finally {
      setScanning(false);
    }
  };

  const chooseScanSource = (target: ElectricityRegister) => {
    const title = ELECTRICITY_REGISTERS.find(item => item.key === target)?.title || 'Electricity reading';
    Alert.alert(`Scan ${title.toLowerCase()}`, 'Choose an image source. You can crop the number display before it is read.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Choose photo', onPress: () => scan('library', target) },
      { text: 'Take photo', onPress: () => scan('camera', target) },
    ]);
  };

  const save = async () => {
    let number: number;
    let electricityRegisters: ElectricityRegisterValues | undefined;
    if (billType === 'electricity' && electricityMode === 'timeOfUse') {
      electricityRegisters = {};
      for (const register of ELECTRICITY_REGISTERS) {
        const registerValue = Number(electricityValues[register.key].trim().replace(',', '.'));
        if (!Number.isFinite(registerValue) || registerValue < 0) {
          Alert.alert('Enter all three readings', `${register.title} must be a number that is zero or greater.`);
          return;
        }
        electricityRegisters[register.key] = registerValue;
      }
      number = ELECTRICITY_REGISTERS.reduce((total, register) => total + (electricityRegisters?.[register.key] || 0), 0);
    } else {
      number = Number(value.trim().replace(',', '.'));
      if (!Number.isFinite(number) || number < 0) {
        Alert.alert('Enter a valid reading', 'The meter reading must be zero or greater.');
        return;
      }
    }
    await billService.saveReading({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      billType,
      date,
      value: number,
      electricityRegisters,
      source,
      createdAt: Date.now(),
    });
    setValue('');
    setElectricityValues(emptyRegisterInputs());
    setSource('manual');
    setPreviewUri(undefined);
    await load();
  };

  const saveUnitPrice = async () => {
    let number: number;
    let electricityRegisterPrices: ElectricityRegisterValues | undefined;
    if (billType === 'electricity' && separateElectricityPrices) {
      electricityRegisterPrices = {};
      for (const register of ELECTRICITY_REGISTERS) {
        const price = Number(electricityPrices[register.key].trim().replace(',', '.'));
        if (!Number.isFinite(price) || price < 0) {
          Alert.alert('Enter all three prices', `${register.title} price must be zero or greater.`);
          return;
        }
        electricityRegisterPrices[register.key] = price;
      }
      number = electricityRegisterPrices.offPeak!;
    } else {
      number = Number(unitPrice.trim().replace(',', '.'));
      if (!Number.isFinite(number) || number < 0) {
        Alert.alert('Enter a valid unit price', 'The price per unit must be zero or greater.');
        return;
      }
    }
    const rate: BillMonthlyRate = {
      billType,
      yearMonth,
      pricePerUnit: number,
      electricityRegisterPrices,
      currency: priceCurrency,
      updatedAt: Date.now(),
    };
    await billService.saveRate(rate);
    setBillCurrency(priceCurrency);
    setMonthlyRate(rate);
    setUnitPrice(String(number));
  };

  const remove = (reading: BillReading) => {
    Alert.alert('Delete reading?', `${formatDate(reading.date)} • ${formatNumber(reading.value)} ${details.unit}${reading.electricityRegisters ? ' total' : ''}`, [
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
        <SummaryBox label={summary.electricityRegisters ? 'Latest total' : 'Latest reading'} value={summary.latest ? `${formatNumber(summary.latest.value)} ${details.unit}` : '—'} color={Colors.success} />
      </View>
      {summary.electricityRegisters && (
        <View style={[styles.bandSummary, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Text style={[styles.bandSummaryTitle, { color: Colors.heading }]}>Electricity by time band</Text>
          {ELECTRICITY_REGISTERS.map(register => {
            const registerSummary = summary.electricityRegisters![register.key];
            return (
              <View key={register.key} style={[styles.bandSummaryRow, { borderTopColor: Colors.border }]}>
                <Text style={{ color: Colors.text, fontWeight: '700', flex: 1 }}>{register.title}</Text>
                <View style={styles.bandNumbers}>
                  <Text style={{ color: Colors.mutedText, fontSize: 12 }}>Latest {registerSummary.latestValue === undefined ? '—' : formatNumber(registerSummary.latestValue)}</Text>
                  <Text style={{ color: Colors.successDark, fontWeight: '800' }}>{formatNumber(registerSummary.usage)} kWh used</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
      <View style={[styles.costCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.mutedText, fontSize: 12 }}>Estimated usage cost</Text>
          <Text style={[styles.costValue, { color: Colors.heading }]}>{estimatedCost === undefined ? '—' : formatCurrencyWithCode(estimatedCost, locale, monthlyRate!.currency)}</Text>
        </View>
        <Text style={{ color: Colors.mutedText }}>
          {monthlyRate?.electricityRegisterPrices
            ? 'Time-band prices'
            : monthlyRate ? `${formatCurrencyWithCode(monthlyRate.pricePerUnit, locale, monthlyRate.currency)} / ${details.unit}` : 'No unit price'}
        </Text>
      </View>
      {summary.electricityRegisters ? (
        <Text style={[styles.explanation, { color: Colors.mutedText }]}>Each time band is compared with its own previous reading, then the three usage amounts are added together.</Text>
      ) : summary.latest && summary.baseline && (
        <Text style={[styles.explanation, { color: Colors.mutedText }]}>Usage is the latest reading minus {summary.baseline.date.startsWith(yearMonth) ? 'the first reading this month' : `the previous reading (${formatNumber(summary.baseline.value)})`}.</Text>
      )}

      {!editing && (
        <Button title="Update this month" onPress={() => setEditing(true)} iconName="edit" style={{ marginTop: 16 }} />
      )}

      {editing && (
        <View style={[styles.rateForm, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Text style={[styles.formTitle, { color: Colors.heading }]}>Price for {formatMonth(yearMonth)}</Text>
          <View style={styles.currencyTitleRow}>
            <Text style={[styles.label, { color: Colors.mutedText, marginBottom: 0 }]}>Currency for this month</Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setPriceCurrency(deviceCurrency)}
              style={[styles.detectButton, { borderColor: Colors.border }]}
            >
              <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '700' }}>Use device region · {deviceCurrency}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyScroll} contentContainerStyle={styles.currencyOptions}>
            {currencyChoices.map(item => {
              const selected = item === priceCurrency;
              return (
                <TouchableOpacity
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setPriceCurrency(item)}
                  style={[
                    styles.currencyChip,
                    {
                      borderColor: selected ? Colors.primary : Colors.border,
                      backgroundColor: selected ? Colors.primary : Colors.surface,
                    },
                  ]}
                >
                  <Text style={{ color: selected ? Colors.onPrimary : Colors.text, fontSize: 12, fontWeight: '700' }}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {billType === 'electricity' && (
            <>
              <Text style={[styles.label, { color: Colors.mutedText }]}>Electricity pricing</Text>
              <View style={styles.modeRow}>
                <ModeButton title="Same price" selected={!separateElectricityPrices} onPress={() => setSeparateElectricityPrices(false)} />
                <ModeButton
                  title="By time band"
                  selected={separateElectricityPrices}
                  onPress={() => {
                    setSeparateElectricityPrices(true);
                    setElectricityPrices(current => Object.fromEntries(ELECTRICITY_REGISTERS.map(register => [
                      register.key,
                      current[register.key] || unitPrice,
                    ])) as Record<ElectricityRegister, string>);
                  }}
                />
              </View>
            </>
          )}
          {billType === 'electricity' && separateElectricityPrices ? (
            <View style={styles.tariffPriceList}>
              {ELECTRICITY_REGISTERS.map(register => (
                <View key={register.key} style={styles.tariffPriceRow}>
                  <Text style={[styles.tariffPriceLabel, { color: Colors.text }]}>{register.title}</Text>
                  <Input
                    value={electricityPrices[register.key]}
                    onChangeText={text => setElectricityPrices(current => ({ ...current, [register.key]: text }))}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    accessibilityLabel={`${register.title} price per kWh in ${priceCurrency}`}
                    style={styles.tariffPriceInput}
                  />
                  <Text style={{ color: Colors.mutedText, fontSize: 12 }}>{priceCurrency}/kWh</Text>
                </View>
              ))}
            </View>
          ) : (
            <>
              <Text style={[styles.label, { color: Colors.mutedText }]}>Price per {details.unit} ({priceCurrency})</Text>
              <Input value={unitPrice} onChangeText={setUnitPrice} keyboardType="decimal-pad" placeholder="e.g. 0.02" />
            </>
          )}
          <Button title="Save price" onPress={saveUnitPrice} disabled={!priceCanSave} style={{ marginTop: 10 }} />
          <Text style={[styles.priceHelp, { color: Colors.mutedText }]}>Used to estimate this month's consumption cost. The suggested currency comes from your device region; no location permission is needed. Fixed fees and taxes are not included.</Text>
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

          {billType === 'electricity' && (
            <>
              <Text style={[styles.label, { color: Colors.mutedText, marginTop: 14 }]}>Reading setup</Text>
              <View style={styles.modeRow}>
                <ModeButton title="Single total" selected={electricityMode === 'single'} onPress={() => setElectricityMode('single')} />
                <ModeButton title="3 time bands" selected={electricityMode === 'timeOfUse'} onPress={() => setElectricityMode('timeOfUse')} />
              </View>
            </>
          )}

          {billType === 'electricity' && electricityMode === 'timeOfUse' ? (
            <View style={styles.registerList}>
              <Text style={[styles.registerHelp, { color: Colors.mutedText }]}>Enter each cumulative register shown by your meter or energy company. Scan and crop each number separately if they appear in one screenshot.</Text>
              {ELECTRICITY_REGISTERS.map(register => (
                <View key={register.key} style={[styles.registerCard, { borderColor: Colors.border }]}>
                  <View style={styles.registerTitleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.registerTitle, { color: Colors.text }]}>{register.title}</Text>
                      <Text style={{ color: Colors.mutedText, fontSize: 12 }}>Cumulative kWh</Text>
                    </View>
                    <Button
                      title="Scan & crop"
                      small
                      variant="neutral"
                      iconName="crop"
                      onPress={() => chooseScanSource(register.key)}
                      disabled={scanning}
                    />
                  </View>
                  <Input
                    value={electricityValues[register.key]}
                    onChangeText={text => {
                      setElectricityValues(current => ({ ...current, [register.key]: text }));
                      setSource('manual');
                    }}
                    keyboardType="decimal-pad"
                    placeholder={`Enter ${register.title.toLowerCase()} reading`}
                    accessibilityLabel={`${register.title} meter reading in kWh`}
                    style={{ marginTop: 10 }}
                  />
                </View>
              ))}
            </View>
          ) : (
            <>
              <Text style={[styles.label, { color: Colors.mutedText, marginTop: 14 }]}>Meter reading ({details.unit})</Text>
              <Input value={value} onChangeText={text => { setValue(text); setSource('manual'); }} keyboardType="decimal-pad" placeholder="Enter the number shown on the meter" />

              <Text style={[styles.or, { color: Colors.mutedText }]}>or read and crop it from a photo</Text>
              <View style={styles.photoActions}>
                <Button title="Take photo" variant="secondary" iconName="camera-alt" onPress={() => scan('camera')} disabled={scanning} style={styles.photoButton} />
                <Button title="Choose photo" variant="neutral" iconName="photo-library" onPress={() => scan('library')} disabled={scanning} style={styles.photoButton} />
              </View>
            </>
          )}
          {scanning && <View style={styles.scanning}><ActivityIndicator color={Colors.primary} /><Text style={{ color: Colors.mutedText, marginLeft: 8 }}>Reading meter…</Text></View>}
          {previewUri && <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />}
          {source !== 'manual' && readingCanSave ? <Text style={[styles.verify, { color: Colors.warningDark }]}>Photo result: check every detected value before saving.</Text> : null}
          <Button title="Save reading" variant="success" onPress={save} disabled={!readingCanSave || scanning} style={{ marginTop: 14 }} />
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
              <Text style={{ color: Colors.text, fontWeight: '800', fontSize: 17 }}>{formatNumber(reading.value)} {details.unit}{reading.electricityRegisters ? ' total' : ''}</Text>
              <Text style={{ color: Colors.mutedText, marginTop: 3 }}>{formatDate(reading.date)} • {reading.source === 'manual' ? 'Manual entry' : 'Read from photo'}</Text>
              {reading.electricityRegisters ? (
                <View style={styles.savedRegisters}>
                  {ELECTRICITY_REGISTERS.map(register => (
                    <Text key={register.key} style={{ color: Colors.mutedText, fontSize: 12, marginTop: 2 }}>
                      {register.title}: {reading.electricityRegisters?.[register.key] === undefined ? '—' : formatNumber(reading.electricityRegisters[register.key]!)} kWh
                    </Text>
                  ))}
                </View>
              ) : change !== undefined && <Text style={{ color: change < 0 ? Colors.error : Colors.successDark, marginTop: 3 }}>Change: {change >= 0 ? '+' : ''}{formatNumber(change)} {details.unit}</Text>}
            </View>
            {editing && <Button title="Delete" variant="danger" small onPress={() => remove(reading)} />}
          </View>
        );
      })}
      <MeterCropModal
        visible={Boolean(pendingImage)}
        imageUri={pendingImage?.uri}
        sourceSize={{ width: pendingImage?.width, height: pendingImage?.height }}
        onCancel={() => {
          setPendingImage(undefined);
          setPreviewUri(undefined);
        }}
        onConfirm={(crop, dimensions) => { readSelectedArea(crop, dimensions); }}
      />
    </ScrollView>
  );
}

function ModeButton({ title, selected, onPress }: { title: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.modeButton,
        {
          backgroundColor: selected ? Colors.primary : Colors.surface,
          borderColor: selected ? Colors.primary : Colors.border,
        },
      ]}
    >
      <Text style={{ color: selected ? Colors.onPrimary : Colors.text, fontWeight: '800', textAlign: 'center' }}>{title}</Text>
    </TouchableOpacity>
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
  bandSummary: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingBottom: 4, marginTop: 8 },
  bandSummaryTitle: { fontSize: 15, fontWeight: '800', paddingVertical: 11 },
  bandSummaryRow: { borderTopWidth: 1, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bandNumbers: { alignItems: 'flex-end', gap: 2 },
  costCard: { borderWidth: 1, borderRadius: 10, padding: 13, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  costValue: { fontSize: 21, fontWeight: '800', marginTop: 3 },
  explanation: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  form: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 16 },
  rateForm: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 16 },
  currencyTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  detectButton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 },
  currencyScroll: { marginVertical: 10 },
  currencyOptions: { paddingRight: 4 },
  currencyChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 7 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeButton: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10 },
  tariffPriceList: { gap: 9 },
  tariffPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tariffPriceLabel: { flex: 1, fontSize: 13, fontWeight: '700' },
  tariffPriceInput: { width: 88, textAlign: 'right' },
  priceHelp: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  formTitle: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
  label: { fontSize: 13, marginBottom: 6 },
  dateButton: { borderWidth: 1, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 12 },
  or: { fontSize: 12, textAlign: 'center', marginVertical: 12 },
  photoActions: { flexDirection: 'row', gap: 8 },
  photoButton: { flex: 1 },
  registerList: { gap: 9 },
  registerHelp: { fontSize: 12, lineHeight: 17, marginBottom: 2 },
  registerCard: { borderWidth: 1, borderRadius: 9, padding: 10 },
  registerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  registerTitle: { fontSize: 15, fontWeight: '800' },
  scanning: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  preview: { width: '100%', height: 160, borderRadius: 8, marginTop: 12 },
  verify: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: 24, marginBottom: 10 },
  empty: { borderWidth: 1, borderRadius: 10, padding: 16 },
  readingRow: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  savedRegisters: { marginTop: 5 },
});
