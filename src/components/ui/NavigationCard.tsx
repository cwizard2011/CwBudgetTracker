import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors } from '../../theme/colors';

export interface NavigationCardProps {
  title: string;
  color?: string;
  icon?: string; // e.g. emoji or glyph
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
}

export function NavigationCard({ title, color = Colors.primary, icon = '📄', onPress, style, iconSize }: NavigationCardProps) {
  const textColor = '#FFFFFF';
  const [measuredHeight, setMeasuredHeight] = React.useState<number>(0);
  const computedIconSize = iconSize || Math.max(28, Math.min(96, Math.floor((measuredHeight || 0) * 0.4) || 72));
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { backgroundColor: color }, style]}
      onLayout={(e) => setMeasuredHeight(e.nativeEvent.layout.height)}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Text style={[styles.icon, { color: textColor, fontSize: computedIconSize }]}>{icon}</Text>
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
});


