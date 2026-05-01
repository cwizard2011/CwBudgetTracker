import { default as React } from 'react';
import { Platform, ScrollView, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { CurrencyCarousel } from '../components/ui/CurrencyCarousel';
import { NavigationCard } from '../components/ui/NavigationCard';
import { useSettings } from '../context/SettingsContext';
import { Colors } from '../theme/colors';
import { useI18n } from '../utils/i18n';

const GAP = 6;
const H_PADDING = 12;

export function HomeScreen({ navigation }: any) {
  const { theme } = useSettings();
  const t = useI18n();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const year = new Date().getFullYear();
  const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 50;

  const isLandscape = windowWidth > windowHeight;

  const numCols = isLandscape ? 2 : 1;
  const cardWidth = isLandscape ? (windowWidth - H_PADDING * 2 - GAP) / 2 : '100%';
  const carouselHeight = isLandscape ? 0 : 115;
  const usableHeight = windowHeight - statusBarH - 24;
  const cardHeight = isLandscape
    ? Math.max(80, (usableHeight - GAP * 2) / 3)
    : Math.max(80, (usableHeight - carouselHeight - GAP * 5) / 6);

  const cards = [
    { title: t('home.budget'),           color: Colors.primary,     icon: '💰', onPress: () => navigation.navigate('Sections', { initial: 'Budget' }) },
    { title: t('home.loans'),            color: Colors.secondary,   icon: '🤝', onPress: () => navigation.navigate('Sections', { initial: 'Loans' }) },
    { title: t('home.loanHistory'),      color: Colors.success,     icon: '📑', onPress: () => navigation.navigate('LoanHistory') },
    { title: t('home.budgetHistory'),    color: Colors.warning,     icon: '📈', onPress: () => navigation.navigate('BudgetHistory') },
    { title: t('home.currencyConverter'),color: Colors.successDark, icon: '💱', onPress: () => navigation.navigate('CurrencyConverter') },
    { title: t('home.settings'),         color: Colors.error,       icon: '⚙️', onPress: () => navigation.navigate('Sections', { initial: 'Settings' }) },
  ];

  const isDark = Colors.background !== '#FFFFFF';
  const bgColor = isDark ? Colors.background : '#F0F2F5';

  return (
    <View style={[styles.container, { backgroundColor: bgColor, paddingTop: statusBarH }]}>
      {!isLandscape && <CurrencyCarousel />}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled
      >
        <View
          style={[
            styles.grid,
            { flexDirection: isLandscape ? 'row' : 'column', flexWrap: isLandscape ? 'wrap' : 'nowrap' },
          ]}
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
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: Colors.mutedText }]}>© {year} BudgetTracker</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: H_PADDING },
  scrollContent: { flexGrow: 1 },
  grid: { flexGrow: 1 },
  footer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  footerText: { fontSize: 12, textAlign: 'center' },
});