import { default as React } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { CurrencyCarousel } from '../components/ui/CurrencyCarousel';
import { NavigationCard } from '../components/ui/NavigationCard';
import { useSettings } from '../context/SettingsContext';
import { Colors } from '../theme/colors';
import { useI18n } from '../utils/i18n';

const GAP = 12;
const H_PADDING = 16;
const CARD_HEIGHT = 140;

export function HomeScreen({ navigation }: any) {
  const t = useI18n();
  const { locale } = useSettings();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const year = new Date().getFullYear();
  const isLandscape = windowWidth > windowHeight;
  const numCols = 2;
  const leftPadding = H_PADDING + insets.left;
  const rightPadding = H_PADDING + insets.right;
  const cardWidth = (windowWidth - leftPadding - rightPadding - GAP) / numCols;
  const today = new Date().toLocaleDateString(locale || undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const cards = [
    { title: t('home.budget'),            color: Colors.primary,     iconName: 'wallet-outline', onPress: () => navigation.navigate('Sections', { initial: 'Budget' }) },
    { title: t('home.loans'),             color: Colors.secondary,   iconName: 'handshake-outline', onPress: () => navigation.navigate('Sections', { initial: 'Loans' }) },
    { title: t('home.bills'),             color: Colors.warningDark, iconName: 'receipt', onPress: () => navigation.navigate('Bills') },
    { title: t('home.loanHistory'),       color: Colors.secondary,   iconName: 'cash-refund', onPress: () => navigation.navigate('LoanHistory') },
    { title: t('home.budgetHistory'),     color: Colors.primary,     iconName: 'chart-line', onPress: () => navigation.navigate('BudgetHistory') },
    { title: t('home.currencyConverter'), color: Colors.successDark, iconName: 'swap-horizontal', onPress: () => navigation.navigate('CurrencyConverter') },
  ];

  const isDark = Colors.background !== '#FFFFFF';
  const bgColor = isDark ? Colors.background : '#F0F2F5';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 12,
            paddingBottom: Math.max(insets.bottom, 12),
            paddingLeft: leftPadding,
            paddingRight: rightPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.pageHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: Colors.heading }]}>{t('home.overview')}</Text>
            <Text style={[styles.pageDate, { color: Colors.mutedText }]}>{today}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('home.settings')}
            onPress={() => navigation.navigate('Sections', { initial: 'Settings' })}
            style={[styles.settingsButton, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
          >
            <MaterialCommunityIcons name="cog-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {!isLandscape && <CurrencyCarousel />}

        <Text style={[styles.sectionTitle, { color: Colors.heading }]}>{t('home.quickAccess')}</Text>
        <View style={styles.grid}>
          {cards.map((card, index) => {
            const isLastCard = index === cards.length - 1;
            const isLastInRow = index % numCols === numCols - 1 || isLastCard;
            const lastRowStart = Math.floor((cards.length - 1) / numCols) * numCols;
            const isLastRow = index >= lastRowStart;
            return (
              <NavigationCard
                key={card.title}
                title={card.title}
                color={card.color}
                iconName={card.iconName}
                appearance="surface"
                iconSize={36}
                titleSize={16}
                onPress={card.onPress}
                style={{
                  width: cardWidth,
                  height: CARD_HEIGHT,
                  marginRight: isLastInRow ? 0 : GAP,
                  marginBottom: isLastRow ? 0 : GAP,
                }}
              />
            );
          })}
        </View>
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: Colors.mutedText }]}>© {year} BudgetTracker</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  pageHeader: { marginBottom: 18, flexDirection: 'row', alignItems: 'center' },
  pageTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.4 },
  pageDate: { fontSize: 13, marginTop: 3, textTransform: 'capitalize' },
  settingsButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  footer: { alignItems: 'center', justifyContent: 'center', paddingTop: 24, paddingBottom: 4 },
  footerText: { fontSize: 12, textAlign: 'center' },
});
