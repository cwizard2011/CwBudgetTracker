import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/colors';
import { BudgetScreen } from './Budget/BudgetScreen';
import { LoanScreen } from './LoanScreen';

type SectionKey = 'Budget' | 'Loans' | 'LoanHistory' | 'BudgetHistory' | 'Settings';

function normalizeSection(input?: string): SectionKey {
  switch (input) {
    case 'Budget':
      return 'Budget';
    case 'Loans':
      return 'Loans';
    case 'LoanHistory':
    case 'Loan History':
      return 'LoanHistory';
    case 'BudgetHistory':
    case 'Budget History':
      return 'BudgetHistory';
    case 'Settings':
      return 'Settings';
    default:
      return 'Budget';
  }
}

function titleFor(section: SectionKey): string {
  switch (section) {
    case 'LoanHistory':
      return 'Loan History';
    case 'BudgetHistory':
      return 'Budget History';
    default:
      return section;
  }
}

export function SectionsScreen({ route, navigation }: any) {
  const param = route?.params?.initial ?? route?.params?.screen;
  const [active, setActive] = useState<SectionKey>(normalizeSection(param));

  useEffect(() => {
    navigation?.setOptions?.({ title: titleFor(active) });
  }, [active, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {active === 'Budget' && <BudgetScreen />}
        {active === 'Loans' && <LoanScreen />}
        {active === 'LoanHistory' && (
          <Placeholder title="Loan payment history" />
        )}
        {active === 'BudgetHistory' && (
          <Placeholder title="Budget history" />
        )}
        {active === 'Settings' && <Placeholder title="Settings" />}
      </View>
    </View>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <View style={styles.placeholder}> 
      <Text style={styles.placeholderText}>{title} (to be defined)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  content: { flex: 1, paddingHorizontal: 12 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: Colors.mutedText },
});


