import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export interface IconButtonProps {
  name: string; // Material icon name
  onPress: () => void;
  size?: number;
  color?: string;
  style?: ViewStyle;
  disabled?: boolean;
  backgroundColor?: string;
  round?: boolean;
  family?: 'MaterialIcons' | 'MaterialCommunityIcons';
}

export function IconButton({ name, onPress, size = 18, color = '#FFFFFF', style, disabled, backgroundColor = 'transparent', round = true, family = 'MaterialIcons' }: IconButtonProps) {
  const IconComponent = family === 'MaterialCommunityIcons' ? MaterialCommunityIcons : MaterialIcons;
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.base, { backgroundColor, borderRadius: round ? 6 : 0 }, style]}>
      <IconComponent name={name} size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


