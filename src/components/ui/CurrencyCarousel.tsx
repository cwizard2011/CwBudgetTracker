import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  fromSymbol: string;
  toSymbol: string;
  rateLabel: string;
  flag: string;
  key: string;
}

export function CurrencyCarousel() {
  const { rates, hasRates, ratesFetchedAt } = useCurrency();
  const { currency: defaultCurrency, locale } = useSettings();
  const t = useI18n();
  const scrollViewRef = useRef<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const pairs: RateCard[] = React.useMemo(() => {
    if (!rates || !hasRates) return [];

    const targets = MAJOR_CURRENCIES.filter(c => c !== defaultCurrency);
    const selected = targets.slice(0, 6);
    const toSymbol = getCurrencySymbol(defaultCurrency);

    return selected.map(target => {
      const fromRate = rates[target];
      const toRate = rates[defaultCurrency];
      if (!fromRate || !toRate) {
        return { fromSymbol: getCurrencySymbol(target), toSymbol, rateLabel: '—', flag: CURRENCY_FLAGS[target] || '💱', key: target };
      }
      const rateValue = toRate / fromRate;
      return {
        fromSymbol: getCurrencySymbol(target),
        toSymbol,
        rateLabel: formatRate(rateValue),
        flag: CURRENCY_FLAGS[target] || '💱',
        key: target,
      };
    });
  }, [rates, hasRates, defaultCurrency]);

  const titleLine = React.useMemo(() => {
    if (!ratesFetchedAt) return t('currency.exchangeRates', { date: '' }).replace(/\s*\u2022\s*$/, '');
    const d = new Date(ratesFetchedAt);
    const date = d.toLocaleDateString(locale || 'en', { day: 'numeric', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString(locale || 'en', { hour: '2-digit', minute: '2-digit' });
    return t('currency.exchangeRates', { date: `${date}, ${time}` });
  }, [ratesFetchedAt, locale, t]);

  const CARD_WIDTH = 150;
  const CARD_MARGIN = 5;
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
      <View style={styles.container}>
        <View style={[styles.loadingCard, { backgroundColor: Colors.surface }]}>
          <Text style={[styles.loadingText, { color: Colors.mutedText }]}>{t('currency.loadingRates')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.headerText, { color: Colors.text }]} numberOfLines={1}>
        {titleLine}
      </Text>
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={FULL_CARD_WIDTH}
      >
        {pairs.map((item) => (
          <View
            key={item.key}
            style={[
              styles.rateCard,
              {
                width: CARD_WIDTH,
                marginHorizontal: CARD_MARGIN,
                backgroundColor: Colors.surface,
                borderColor: Colors.border,
              },
            ]}
          >
            <Text style={styles.flag}>{item.flag}</Text>
            <Text style={[styles.rateText, { color: Colors.text }]}>
              {item.fromSymbol}1 = {item.toSymbol}{item.rateLabel}
            </Text>
          </View>
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
    marginBottom: 0,
    marginTop: 0,
    paddingTop: 0,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  scrollContent: {
    paddingRight: 4,
  },
  rateCard: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  flag: {
    fontSize: 20,
    marginBottom: 3,
  },
  rateText: {
    fontSize: 13,
    fontWeight: '800',
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
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
  },
});
