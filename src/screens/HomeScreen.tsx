import { default as React } from 'react';
import { StyleSheet as RNStyleSheet, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { NavigationCard } from '../components/ui/NavigationCard';
import { useSettings } from '../context/SettingsContext';
import { Colors } from '../theme/colors';
import { useI18n } from '../utils/i18n';

export function HomeScreen({ navigation }: any) {
  // Subscribe to settings so theme changes trigger a re-render
  const { theme } = useSettings();
  const t = useI18n();
  const GAP = 6;
  const V_PADDING = 12;
  const { height: windowHeight } = useWindowDimensions();
  const [containerHeight, setContainerHeight] = React.useState<number | null>(null);
  const [footerHeight, setFooterHeight] = React.useState<number>(0);
  const FOOTER_BOTTOM_MARGIN = 6;
  const year = new Date().getFullYear();

  const availableHeight = Math.max(
    0,
    (containerHeight ?? windowHeight) - V_PADDING * 2 - footerHeight - GAP - FOOTER_BOTTOM_MARGIN,
  );
  const cardHeight = Math.max(0, (availableHeight - GAP * 4) / 5);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background, padding: 12 },
    heading: { display: 'none' as any },
    grid: { flex: 1 },
    gridItem: { width: '100%' } as any,
    footer: { alignItems: 'center', justifyContent: 'center', marginTop: GAP, marginBottom: FOOTER_BOTTOM_MARGIN },
    footerText: { color: Colors.mutedText, fontSize: 12, textAlign: 'center' },
  });

  return (
    <View style={styles.container} onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
      <Text style={styles.heading}>{t('home.welcome')}</Text>
      <View style={styles.grid}>
        <NavigationCard
          title={t('home.budget')}
          color={Colors.primary}
          icon="💰"
          onPress={() => navigation.navigate('Sections', { initial: 'Budget' })}
          style={RNStyleSheet.flatten([styles.gridItem, { height: cardHeight, minHeight: cardHeight, marginBottom: GAP, overflow: 'hidden' }])}
        />
        <NavigationCard
          title={t('home.loans')}
          color={Colors.secondary}
          icon="🤝"
          onPress={() => navigation.navigate('Sections', { initial: 'Loans' })}
          style={RNStyleSheet.flatten([styles.gridItem, { height: cardHeight, minHeight: cardHeight, marginBottom: GAP, overflow: 'hidden' }])}
        />
        <NavigationCard
          title={t('home.loanHistory')}
          color={Colors.success}
          icon="📑"
          onPress={() => navigation.navigate('LoanHistory')}
          style={RNStyleSheet.flatten([styles.gridItem, { height: cardHeight, minHeight: cardHeight, marginBottom: GAP, overflow: 'hidden' }])}
        />
        <NavigationCard
          title={t('home.budgetHistory')}
          color={Colors.warning}
          icon="📈"
          onPress={() => navigation.navigate('BudgetHistory')}
          style={RNStyleSheet.flatten([styles.gridItem, { height: cardHeight, minHeight: cardHeight, marginBottom: GAP, overflow: 'hidden' }])}
        />
        <NavigationCard
          title={t('home.settings')}
          color={Colors.error}
          icon="⚙️"
          onPress={() => navigation.navigate('Sections', { initial: 'Settings' })}
          style={RNStyleSheet.flatten([styles.gridItem, { height: cardHeight, minHeight: cardHeight, marginBottom: 0, overflow: 'hidden' }])}
        />
      </View>
      <View style={styles.footer} onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}>
        <Text style={styles.footerText}>
          {t('home.footerDevelopedBy')} Peter Adeoye (cwizard) © {year}
        </Text>
      </View>
    </View>
  );
}


