import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NavigationCard } from '../components/ui/NavigationCard';
import { Colors } from '../theme/colors';

export function HomeScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Welcome</Text>

      <View style={styles.grid}>
        <NavigationCard
          title="Budget"
          color={Colors.primary}
          icon="💰"
          onPress={() => navigation.navigate('Sections', { initial: 'Budget' })}
          style={styles.gridItem}
        />
        <NavigationCard
          title="Loans"
          color={Colors.secondary}
          icon="🤝"
          onPress={() => navigation.navigate('Sections', { initial: 'Loans' })}
          style={styles.gridItem}
        />
        <NavigationCard
          title="Loan payment history"
          color={Colors.success}
          icon="📑"
          onPress={() => navigation.navigate('Sections', { initial: 'LoanHistory' })}
          style={styles.gridItem}
        />
        <NavigationCard
          title="Budget history"
          color={Colors.warning}
          icon="📈"
          onPress={() => navigation.navigate('Sections', { initial: 'BudgetHistory' })}
          style={styles.gridItem}
        />
        <NavigationCard
          title="Settings"
          color={Colors.error}
          icon="⚙️"
          onPress={() => navigation.navigate('Sections', { initial: 'Settings' })}
          style={styles.gridItem}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16 },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginHorizontal: -8,
  },
  gridItem: {
    width: '49%',
    paddingHorizontal: 8,
    marginBottom: 16,
  } as any,
});


