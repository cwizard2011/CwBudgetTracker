import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors } from '../../theme/colors';

export interface NavigationCardProps {
  title: string;
  color?: string;
  icon?: string; // e.g. emoji or glyph
  onPress: () => void;
  style?: ViewStyle;
}

export function NavigationCard({ title, color = Colors.primary, icon = '📄', onPress, style }: NavigationCardProps) {
  const textColor = '#FFFFFF';
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { backgroundColor: color }, style]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Text style={[styles.icon, { color: textColor }]}>{icon}</Text>
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  icon: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
});


