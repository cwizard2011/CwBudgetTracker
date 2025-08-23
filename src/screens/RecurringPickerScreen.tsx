import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../theme/colors';
import { useI18n } from '../utils/i18n';

const KEYS = ['none','weekly','monthly','quarterly','annually'] as const;

export function RecurringPickerScreen({ route, navigation }: any) {
  const t = useI18n();
  const value = route?.params?.value || 'none';
  const onSelect = route?.params?.onSelect;

  const options = KEYS.map((k) => ({
    key: k,
    label:
      k === 'none' ? t('common.none') :
      k === 'weekly' ? t('period.weekly') :
      k === 'monthly' ? t('period.monthly') :
      k === 'quarterly' ? t('period.quarterly') :
      t('period.annual'),
  }));

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    row: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Colors.border, backgroundColor: Colors.surface },
    text: { color: Colors.text },
    active: { fontWeight: '800', color: Colors.primary },
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={options}
        keyExtractor={(i) => i.key}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => { onSelect?.(item.key); navigation.goBack?.(); }} style={styles.row}>
            <Text style={[styles.text, item.key === value && styles.active]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// styles moved inside component for dynamic theme support


