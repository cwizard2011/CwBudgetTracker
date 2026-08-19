import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useCurrency } from '../../context/CurrencyContext';
import { useSettings } from '../../context/SettingsContext';
import { Colors } from '../../theme/colors';
import { useI18n } from '../../utils/i18n';

const MAJOR_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'CHF'];

const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  JPY: '🇯🇵',
  CAD: '🇨🇦',
  CHF: '🇨🇭',
  AUD: '🇦🇺',
  CNY: '🇨🇳',
  INR: '🇮🇳',
  NGN: '🇳🇬',
};

function getCurrencySymbol(code: string): string {
  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    const symbolPart = parts.find(p => p.type === 'currency');
    return symbolPart?.value || code;
  } catch {
    const fallback: Record<string, string> = {
      USD: '$', EUR: '€', GBP: '£', NGN: '₦', JPY: '¥',
      CAD: 'C$', CHF: 'CHF', AUD: 'A$', CNY: '¥', INR: '₹',
    };
    return fallback[code] || code;
  }
}

function formatRate(value: number): string {
  if (value >= 1000) return Math.round(value).toLocaleString();
  if (value >= 100) return value.toFixed(1);
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(4);
}

interface RateCard {
  fromCurrency: string;
  toCurrency: string;
  fromSymbol: string;
  toSymbol: string;
  rateLabel: string;
  flag: string;
  key: string;
}

export function CurrencyCarousel() {
  const navigation = useNavigation<any>();
  const { rates, hasRates, ratesFetchedAt } = useCurrency();
  const { currency: defaultCurrency, locale } = useSettings();
  const t = useI18n();
  const scrollViewRef = useRef<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const insetSurface = Colors.background === '#FFFFFF' ? '#F8FAFC' : Colors.background;

  const pairs: RateCard[] = React.useMemo(() => {
    if (!rates || !hasRates) return [];

    const targets = MAJOR_CURRENCIES.filter(c => c !== defaultCurrency);
    const selected = targets.slice(0, 6);
    const toSymbol = getCurrencySymbol(defaultCurrency);

    return selected.map(target => {
      const fromRate = rates[target];
      const toRate = rates[defaultCurrency];
      if (!fromRate || !toRate) {
        return { fromCurrency: target, toCurrency: defaultCurrency, fromSymbol: getCurrencySymbol(target), toSymbol, rateLabel: '—', flag: CURRENCY_FLAGS[target] || '💱', key: target };
      }
      const rateValue = toRate / fromRate;
      return {
        fromCurrency: target,
        toCurrency: defaultCurrency,
        fromSymbol: getCurrencySymbol(target),
        toSymbol,
        rateLabel: formatRate(rateValue),
        flag: CURRENCY_FLAGS[target] || '💱',
        key: target,
      };
    });
  }, [rates, hasRates, defaultCurrency]);

  const headerTitle = React.useMemo(
    () => t('currency.exchangeRates', { date: '' }).replace(/\s*\u2022\s*$/, ''),
    [t],
  );

  const updatedLine = React.useMemo(() => {
    if (!ratesFetchedAt) return '';
    const d = new Date(ratesFetchedAt);
    const date = d.toLocaleDateString(locale || 'en', { day: 'numeric', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString(locale || 'en', { hour: '2-digit', minute: '2-digit' });
    return `${date}, ${time}`;
  }, [ratesFetchedAt, locale]);

  const CARD_WIDTH = 132;
  const CARD_MARGIN = 4;
  const FULL_CARD_WIDTH = CARD_WIDTH + CARD_MARGIN * 2;

  useEffect(() => {
    if (pairs.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const next = (prev + 1) % pairs.length;
        scrollViewRef.current?.scrollTo({
          x: next * FULL_CARD_WIDTH,
          animated: true,
        });
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [pairs.length, FULL_CARD_WIDTH]);

  if (!hasRates || pairs.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerText, { color: Colors.heading }]}>{headerTitle}</Text>
        </View>
        <View style={[styles.loadingCard, { backgroundColor: insetSurface }]}>
          <Text style={[styles.loadingText, { color: Colors.mutedText }]}>{t('currency.loadingRates')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerText, { color: Colors.heading }]} numberOfLines={1}>{headerTitle}</Text>
        {!!updatedLine && <Text style={[styles.updatedText, { color: Colors.mutedText }]} numberOfLines={1}>{updatedLine}</Text>}
      </View>
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={FULL_CARD_WIDTH}
        onMomentumScrollEnd={(event) => {
          setCurrentIndex(Math.round(event.nativeEvent.contentOffset.x / FULL_CARD_WIDTH));
        }}
      >
        {pairs.map((item) => (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Convert ${item.fromCurrency} to ${item.toCurrency}`}
            onPress={() => navigation.navigate('CurrencyConverter', {
              fromCurrency: item.fromCurrency,
              toCurrency: item.toCurrency,
            })}
            style={[
              styles.rateCard,
              {
                width: CARD_WIDTH,
                marginHorizontal: CARD_MARGIN,
                backgroundColor: insetSurface,
                borderColor: Colors.border,
              },
            ]}
          >
            <View style={styles.rateTopRow}>
              <Text style={styles.flag}>{item.flag}</Text>
              <MaterialCommunityIcons name="arrow-top-right" size={15} color={Colors.mutedText} />
            </View>
            <Text style={[styles.rateText, { color: Colors.text }]}>
              {item.fromSymbol}1 = {item.toSymbol}{item.rateLabel}
            </Text>
            <Text style={[styles.pairText, { color: Colors.mutedText }]}>{item.fromCurrency} → {item.toCurrency}</Text>
          </TouchableOpacity>
        ))}
      </Animated.ScrollView>
      <View style={styles.dotContainer}>
        {pairs.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: index === currentIndex ? Colors.primary : Colors.mutedText,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    borderRadius: 18,
    borderWidth: 1,
    paddingTop: 14,
    paddingBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  headerText: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '800',
  },
  updatedText: {
    fontSize: 10,
    marginLeft: 8,
  },
  scrollContent: {
    paddingHorizontal: 10,
  },
  rateCard: {
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 78,
    paddingVertical: 9,
    paddingHorizontal: 10,
    alignItems: 'stretch',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  flag: {
    fontSize: 19,
  },
  rateTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  rateText: {
    fontSize: 13,
    fontWeight: '800',
  },
  pairText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginHorizontal: 2.5,
  },
  loadingCard: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 10,
  },
  loadingText: {
    fontSize: 13,
  },
});
