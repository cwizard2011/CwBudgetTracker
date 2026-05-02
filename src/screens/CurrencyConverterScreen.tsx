import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useCurrency } from '../context/CurrencyContext';
import { useSettings } from '../context/SettingsContext';
import { Colors } from '../theme/colors';
import { formatCurrency } from '../utils/format';
import { useI18n } from '../utils/i18n';

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'KES', 'ZAR', 'GHS', 'EGP', 'SAR', 'AED', 'SGD', 'HKD'];

type ActiveSide = 'top' | 'bottom';

export function CurrencyConverterScreen() {
  const t = useI18n();
  const { locale, currency: mainCurrency } = useSettings();
  const { rates, ratesFetchedAt, hasRates } = useCurrency();

  const [topCurrency, setTopCurrency] = useState(mainCurrency);
  const [bottomCurrency, setBottomCurrency] = useState(mainCurrency === 'USD' ? 'EUR' : 'USD');
  const [topValue, setTopValue] = useState('');
  const [bottomValue, setBottomValue] = useState('');
  const [activeSide, setActiveSide] = useState<ActiveSide>('top');

  const topInputRef = useRef<TextInput>(null);
  const bottomInputRef = useRef<TextInput>(null);

  const convertAmount = useCallback((amount: string, from: string, to: string): string => {
    const num = parseFloat(amount);
    if (isNaN(num) || !hasRates || !rates) return '';
    if (from === to) return amount;
    const fromRate = rates[from];
    const toRate = rates[to];
    if (!fromRate || !toRate) return '';
    const result = (num / fromRate) * toRate;
    if (result >= 100) return result.toFixed(2);
    if (result >= 1) return result.toFixed(4);
    return result.toFixed(6);
  }, [rates, hasRates]);

  const handleTopChange = useCallback((text: string) => {
    setTopValue(text);
    setActiveSide('top');
    setBottomValue(text ? convertAmount(text, topCurrency, bottomCurrency) : '');
  }, [topCurrency, bottomCurrency, convertAmount]);

  const handleBottomChange = useCallback((text: string) => {
    setBottomValue(text);
    setActiveSide('bottom');
    setTopValue(text ? convertAmount(text, bottomCurrency, topCurrency) : '');
  }, [topCurrency, bottomCurrency, convertAmount]);

  const handleTopCurrencyChange = useCallback((c: string) => {
    setTopCurrency(c);
    if (activeSide === 'top' && topValue) {
      setBottomValue(convertAmount(topValue, c, bottomCurrency));
    } else if (activeSide === 'bottom' && bottomValue) {
      setTopValue(convertAmount(bottomValue, bottomCurrency, c));
    }
  }, [activeSide, topValue, bottomValue, bottomCurrency, convertAmount]);

  const handleBottomCurrencyChange = useCallback((c: string) => {
    setBottomCurrency(c);
    if (activeSide === 'top' && topValue) {
      setBottomValue(convertAmount(topValue, topCurrency, c));
    } else if (activeSide === 'bottom' && bottomValue) {
      setTopValue(convertAmount(bottomValue, c, topCurrency));
    }
  }, [activeSide, topValue, bottomValue, topCurrency, convertAmount]);

  const swap = useCallback(() => {
    setTopCurrency(bottomCurrency);
    setBottomCurrency(topCurrency);
    setTopValue(bottomValue);
    setBottomValue(topValue);
    setActiveSide(prev => prev === 'top' ? 'bottom' : 'top');
  }, [topCurrency, bottomCurrency, topValue, bottomValue]);

  const fetchedAtLabel = useMemo(() => {
    if (!ratesFetchedAt) return null;
    return new Date(ratesFetchedAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
  }, [ratesFetchedAt, locale]);

  const rateDisplay = useMemo(() => {
    if (!hasRates || !rates) return null;
    const topRate = rates[topCurrency];
    const bottomRate = rates[bottomCurrency];
    if (!topRate || !bottomRate) return null;
    const rate = bottomRate / topRate;
    const inverseRate = topRate / bottomRate;
    if (rate < 0.005) {
      return `1 ${bottomCurrency} = ${formatCurrency(inverseRate, locale, topCurrency)}`;
    }
    return `1 ${topCurrency} = ${formatCurrency(rate, locale, bottomCurrency)}`;
  }, [hasRates, rates, topCurrency, bottomCurrency, locale]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: Colors.background }]} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={[styles.heading, { color: Colors.heading }]}>{t('currency.converterTitle')}</Text>

      {!hasRates && (
        <View style={[styles.noRatesBox, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Text style={{ color: Colors.mutedText }}>{t('currency.noRatesAvailable')}</Text>
        </View>
      )}

      {fetchedAtLabel && (
        <Text style={[styles.rateDate, { color: Colors.mutedText }]}>
          {t('currency.ratesAsOf', { date: fetchedAtLabel })}
        </Text>
      )}

      <View style={[
        styles.card,
        { backgroundColor: Colors.surface, borderColor: activeSide === 'top' ? Colors.primary : Colors.border },
      ]}>
        <CurrencySelector
          selected={topCurrency}
          onSelect={handleTopCurrencyChange}
          exclude={bottomCurrency}
        />
        <TextInput
          ref={topInputRef}
          style={[styles.amountInput, { color: Colors.text, borderColor: activeSide === 'top' ? Colors.primary : Colors.border }]}
          value={topValue}
          onChangeText={handleTopChange}
          onFocus={() => setActiveSide('top')}
          keyboardType="numeric"
          placeholder="0.00"
          placeholderTextColor={Colors.mutedText}
        />
      </View>

      <TouchableOpacity style={[styles.swapButton, { backgroundColor: Colors.primary }]} onPress={swap} activeOpacity={0.8}>
        <Text style={{ color: Colors.onPrimary, fontSize: 20 }}>⇅</Text>
      </TouchableOpacity>

      <View style={[
        styles.card,
        { backgroundColor: Colors.surface, borderColor: activeSide === 'bottom' ? Colors.primary : Colors.border },
      ]}>
        <CurrencySelector
          selected={bottomCurrency}
          onSelect={handleBottomCurrencyChange}
          exclude={topCurrency}
        />
        <TextInput
          ref={bottomInputRef}
          style={[styles.amountInput, { color: Colors.text, borderColor: activeSide === 'bottom' ? Colors.primary : Colors.border }]}
          value={bottomValue}
          onChangeText={handleBottomChange}
          onFocus={() => setActiveSide('bottom')}
          keyboardType="numeric"
          placeholder="0.00"
          placeholderTextColor={Colors.mutedText}
        />
      </View>

      {rateDisplay && (
        <View style={[styles.rateInfo, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Text style={{ color: Colors.mutedText, fontSize: 13 }}>{rateDisplay}</Text>
        </View>
      )}
    </ScrollView>
  );
}

function CurrencySelector({ selected, onSelect, exclude }: { selected: string; onSelect: (c: string) => void; exclude: string }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'nowrap' }}>
        {SUPPORTED_CURRENCIES.filter(c => c !== exclude).map(c => (
          <TouchableOpacity
            key={c}
            onPress={() => onSelect(c)}
            style={[
              styles.chip,
              { borderColor: Colors.border, backgroundColor: selected === c ? Colors.primary : Colors.surface },
            ]}
            activeOpacity={0.7}
          >
            <Text style={{ color: selected === c ? Colors.onPrimary : Colors.text, fontSize: 12, fontWeight: '600' }}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heading: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  noRatesBox: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
  rateDate: { fontSize: 12, marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  amountInput: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, fontSize: 24, fontWeight: '600' },
  swapButton: { alignSelf: 'center', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6 },
  rateInfo: { borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
});
