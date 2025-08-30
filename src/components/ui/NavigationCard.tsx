import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle, useWindowDimensions } from 'react-native';
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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;

  // Adjust icon size calculation for landscape mode
  const computedIconSize = iconSize || Math.max(
    32, // Minimum size
    Math.min(
      120, // Maximum size
      Math.floor((measuredHeight || 0) * (isLandscape ? 0.45 : 0.4)) || 72
    )
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { backgroundColor: color }, style]}
      onLayout={(e) => setMeasuredHeight(e.nativeEvent.layout.height)}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Text style={[styles.icon, { color: textColor, fontSize: computedIconSize }]}>{icon}</Text>
      <Text style={[styles.title, { 
        color: textColor,
        fontSize: isLandscape ? 24 : 22, // Slightly larger text in landscape
      }]}>{title}</Text>
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
    elevation: 2, // Add subtle elevation for Android
    shadowColor: '#000', // Add subtle shadow for iOS
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  icon: {
    marginBottom: 12,
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
  },
});