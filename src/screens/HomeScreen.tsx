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
  const GAP = 8;
  const V_PADDING = 12;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [containerHeight, setContainerHeight] = React.useState<number | null>(null);
  const [footerHeight, setFooterHeight] = React.useState<number>(0);
  const FOOTER_BOTTOM_MARGIN = 6;
  const year = new Date().getFullYear();

  // Determine if we're in landscape mode
  const isLandscape = windowWidth > windowHeight;

  const availableHeight = Math.max(
    0,
    (containerHeight ?? windowHeight) - V_PADDING * 2 - footerHeight - GAP - FOOTER_BOTTOM_MARGIN,
  );

  // Calculate card dimensions based on orientation
  const numRows = isLandscape ? 3 : 5; // 3 rows in landscape (2 cards per row), 5 in portrait
  const cardHeight = Math.max(0, (availableHeight - GAP * (numRows - 1)) / numRows);
  
  // Calculate card width for landscape mode
  const cardWidth = isLandscape ? (windowWidth - V_PADDING * 2 - GAP) / 2 : '100%';

  const styles = StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: Colors.background, 
      padding: V_PADDING 
    },
    heading: { display: 'none' as any },
    grid: { 
      flex: 1,
      flexDirection: isLandscape ? 'row' : 'column',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      alignContent: 'space-between',
    },
    gridItem: { 
      width: cardWidth,
      marginRight: isLandscape ? GAP : 0,
    } as any,
    footer: { 
      alignItems: 'center', 
      justifyContent: 'center', 
      marginTop: GAP, 
      marginBottom: FOOTER_BOTTOM_MARGIN 
    },
    footerText: { 
      color: Colors.mutedText, 
      fontSize: 12, 
      textAlign: 'center' 
    },
  });

  const cardStyle = (index: number) => RNStyleSheet.flatten([
    styles.gridItem,
    {
      height: cardHeight,
      minHeight: cardHeight,
      overflow: 'hidden',
      // Remove margin right from every second card in landscape
      marginRight: isLandscape && index % 2 === 1 ? 0 : styles.gridItem.marginRight,
      // Remove margin bottom from last row
      marginBottom: isLandscape ? 
        (index >= 4 ? 0 : GAP) : // Last row in landscape (indices 4 and 5)
        (index === 4 ? 0 : GAP), // Last card in portrait
    },
  ]);

  return (
    <View 
      style={styles.container}
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
    >
      <Text style={styles.heading}>{t('home.welcome')}</Text>
      <View style={styles.grid}>
        <NavigationCard
          title={t('home.budget')}
          color={Colors.primary}
          icon="💰"
          onPress={() => navigation.navigate('Sections', { initial: 'Budget' })}
          style={cardStyle(0)}
        />
        <NavigationCard
          title={t('home.loans')}
          color={Colors.secondary}
          icon="🤝"
          onPress={() => navigation.navigate('Sections', { initial: 'Loans' })}
          style={cardStyle(1)}
        />
        <NavigationCard
          title={t('home.loanHistory')}
          color={Colors.success}
          icon="📑"
          onPress={() => navigation.navigate('LoanHistory')}
          style={cardStyle(2)}
        />
        <NavigationCard
          title={t('home.budgetHistory')}
          color={Colors.warning}
          icon="📈"
          onPress={() => navigation.navigate('BudgetHistory')}
          style={cardStyle(3)}
        />
        <NavigationCard
          title={t('home.settings')}
          color={Colors.error}
          icon="⚙️"
          onPress={() => navigation.navigate('Sections', { initial: 'Settings' })}
          style={cardStyle(4)}
        />
      </View>
      <View 
        style={styles.footer}
        onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
      >
        <Text style={styles.footerText}>© {year} BudgetTracker</Text>
      </View>
    </View>
  );
}