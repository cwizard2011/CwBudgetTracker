import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NavigationCard } from '../../components/ui/NavigationCard';
import { BILL_TYPES } from '../../models/BillReading';
import { Colors } from '../../theme/colors';

export function BillsScreen({ navigation }: any) {
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.heading, { color: Colors.heading }]}>What would you like to track?</Text>
      <Text style={[styles.subheading, { color: Colors.mutedText }]}>Choose a utility to view its monthly readings and usage.</Text>
      <View style={styles.list}>
        {BILL_TYPES.map(item => (
          <NavigationCard
            key={item.type}
            title={item.title}
            icon={item.icon}
            iconSize={48}
            color={Colors[item.colorKey]}
            onPress={() => navigation.navigate('BillOverview', { billType: item.type })}
            style={styles.card}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  heading: { fontSize: 24, fontWeight: '800', marginTop: 4 },
  subheading: { fontSize: 14, lineHeight: 20, marginTop: 6, marginBottom: 18 },
  list: { gap: 10 },
  card: { minHeight: 126 },
});
