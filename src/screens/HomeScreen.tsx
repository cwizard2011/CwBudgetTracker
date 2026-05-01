import { default as React } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { NavigationCard } from '../components/ui/NavigationCard';
import { useSettings } from '../context/SettingsContext';
import { Colors } from '../theme/colors';
import { useI18n } from '../utils/i18n';

const GAP = 8;
const V_PADDING = 12;

export function HomeScreen({ navigation }: any) {
  const { theme } = useSettings();
  const t = useI18n();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const year = new Date().getFullYear();

  const isLandscape = windowWidth > windowHeight;

  const numCols = isLandscape ? 2 : 1;
  const cardWidth = isLandscape ? (windowWidth - V_PADDING * 2 - GAP) / 2 : '100%';
  const cardHeight = isLandscape
    ? Math.max(80, (windowHeight - V_PADDING * 2 - GAP * 2) / 3)
    : Math.max(90, (windowHeight - V_PADDING * 2 - 24 - GAP * 5) / 6);

  const cards = [
    { title: t('home.budget'),           color: Colors.primary,     icon: '💰', onPress: () => navigation.navigate('Sections', { initial: 'Budget' }) },
    { title: t('home.loans'),            color: Colors.secondary,   icon: '🤝', onPress: () => navigation.navigate('Sections', { initial: 'Loans' }) },
    { title: t('home.loanHistory'),      color: Colors.success,     icon: '📑', onPress: () => navigation.navigate('LoanHistory') },
    { title: t('home.budgetHistory'),    color: Colors.warning,     icon: '📈', onPress: () => navigation.navigate('BudgetHistory') },
    { title: t('home.currencyConverter'),color: Colors.successDark, icon: '💱', onPress: () => navigation.navigate('CurrencyConverter') },
    { title: t('home.settings'),         color: Colors.error,       icon: '⚙️', onPress: () => navigation.navigate('Sections', { initial: 'Settings' }) },
  ];

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.grid,
          { flexDirection: isLandscape ? 'row' : 'column', flexWrap: isLandscape ? 'wrap' : 'nowrap' },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled
      >
        {cards.map((card, index) => {
          const isLastInRow = isLandscape ? index % numCols === numCols - 1 : true;
          const isLastRow = isLandscape ? index >= cards.length - numCols : index === cards.length - 1;
          return (
            <NavigationCard
              key={card.title}
              title={card.title}
              color={card.color}
              icon={card.icon}
              onPress={card.onPress}
              style={{
                width: cardWidth as any,
                height: cardHeight,
                marginRight: isLastInRow ? 0 : GAP,
                marginBottom: isLastRow ? 0 : GAP,
                overflow: 'hidden',
              }}
            />
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: Colors.mutedText }]}>© {year} BudgetTracker</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: V_PADDING },
  grid: { flexGrow: 1 },
  footer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  footerText: { fontSize: 12, textAlign: 'center' },
});