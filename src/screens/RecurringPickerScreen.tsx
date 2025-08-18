import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../theme/colors';

const OPTIONS = [
  { key: 'none', label: 'None' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'annually', label: 'Annually' },
];

export function RecurringPickerScreen({ route, navigation }: any) {
  const value = route?.params?.value || 'none';
  const onSelect = route?.params?.onSelect;
  return (
    <View style={styles.container}>
      <FlatList
        data={OPTIONS}
        keyExtractor={(i) => i.key}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => { onSelect?.(item.key); }} style={styles.row}>
            <Text style={[styles.text, item.key === value && styles.active]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  row: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Colors.border },
  text: { color: Colors.text },
  active: { fontWeight: '800', color: Colors.primary },
});


