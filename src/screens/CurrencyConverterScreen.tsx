import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useCurrency } from '../context/CurrencyContext';
import { useSettings } from '../context/SettingsContext';
import { Colors } from '../theme/colors';
import { formatCurrency } from '../utils/format';
import { useI18n } from '../utils/i18n';

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'KES', 'ZAR', 'GHS', 'EGP', 'SAR', 'AED', 'SGD', 'HKD'];

export function CurrencyConverterScreen() {
  const t = useI18n();
  const { locale, currency: mainCurrency } = useSettings();
  const { rates, ratesFetchedAt, hasRates, convert } = useCurrency();

  const [fromCurrency, setFromCurrency] = useState(mainCurrency);
  const [toCurrency, setToCurrency] = useState('USD');
  const [inputValue, setInputValue] = useState('');

  const convertedAmount = useMemo(() => {
    const num = parseFloat(inputValue);
    if (isNaN(num) || !hasRates || !rates) return null;
    if (fromCurrency === toCurrency) return num;
    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];
    if (!fromRate || !toRate) return null;
    return (num / fromRate) * toRate;
  }, [inputValue, fromCurrency, toCurrency, rates, hasRates]);

  const swap = useCallback(() => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  }, [fromCurrency, toCurrency]);

  const fetchedAtLabel = useMemo(() => {
    if (!ratesFetchedAt) return null;
    return new Date(ratesFetchedAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
  }, [ratesFetchedAt, locale]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: Colors.background }]} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
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

      <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        <Text style={[styles.label, { color: Colors.mutedText }]}>{t('currency.from')}</Text>
        <CurrencySelector
          selected={fromCurrency}
          onSelect={setFromCurrency}
          exclude={toCurrency}
        />
        <TextInput
          style={[styles.amountInput, { color: Colors.text, borderColor: Colors.border }]}
          value={inputValue}
          onChangeText={setInputValue}
          keyboardType="numeric"
          placeholder="0.00"
          placeholderTextColor={Colors.mutedText}
        />
      </View>

      <TouchableOpacity style={[styles.swapButton, { backgroundColor: Colors.primary }]} onPress={swap} activeOpacity={0.8}>
        <Text style={{ color: Colors.onPrimary, fontSize: 20 }}>⇅</Text>
      </TouchableOpacity>

      <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        <Text style={[styles.label, { color: Colors.mutedText }]}>{t('currency.to')}</Text>
        <CurrencySelector
          selected={toCurrency}
          onSelect={setToCurrency}
          exclude={fromCurrency}
        />
        <View style={[styles.resultBox, { borderColor: Colors.border }]}>
          <Text style={[styles.resultText, { color: convertedAmount !== null ? Colors.text : Colors.mutedText }]}>
            {convertedAmount !== null
              ? formatCurrency(convertedAmount, locale, toCurrency)
              : '—'}
          </Text>
        </View>
      </View>

      {hasRates && rates && convertedAmount !== null && (
        <View style={[styles.rateInfo, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Text style={{ color: Colors.mutedText, fontSize: 13 }}>
            {(() => {
              const fromRate = rates[fromCurrency];
              const toRate = rates[toCurrency];
              if (!fromRate || !toRate) return null;
              const rate = toRate / fromRate;
              // If rate rounds to zero in the target currency's format, flip to inverse
              // so we never show "1 NGN = $0.00" — instead show "1 USD = ₦1,600"
              const inverseRate = fromRate / toRate;
              const showInverse = rate < 0.005;
              if (showInverse) {
                return `1 ${toCurrency} = ${formatCurrency(inverseRate, locale, fromCurrency)}`;
              }
              return `1 ${fromCurrency} = ${formatCurrency(rate, locale, toCurrency)}`;
            })()}
          </Text>
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
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  amountInput: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, fontSize: 24, fontWeight: '600' },
  resultBox: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, minHeight: 50, justifyContent: 'center' },
  resultText: { fontSize: 24, fontWeight: '600' },
  swapButton: { alignSelf: 'center', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6 },
  rateInfo: { borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
});
