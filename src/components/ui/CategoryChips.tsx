import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../theme/colors';

export interface CategoryChipsProps {
  categories: string[];
  value?: string;
  onChange: (next?: string) => void;
}

export function CategoryChips({ categories, value, onChange }: CategoryChipsProps) {
  return (
    <View style={styles.wrap}>
      {categories.map(cat => {
        const active = value === cat;
        return (
          <TouchableOpacity key={cat} onPress={() => onChange(active ? undefined : cat)} style={[styles.chip, active && styles.active]}>
            <Text style={[styles.text, active && styles.activeText]}>{cat}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  text: { color: Colors.text },
  active: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  activeText: { color: '#fff', fontWeight: '700' },
});


