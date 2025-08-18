import React from 'react';
import { StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../../theme/colors';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  small?: boolean;
  iconName?: string;
  iconPosition?: 'left' | 'right';
  iconFamily?: 'MaterialIcons' | 'MaterialCommunityIcons';
  iconSize?: number;
  iconColor?: string;
}

const variantToColor: Record<ButtonVariant, string> = {
  primary: Colors.primary,
  secondary: Colors.secondary,
  success: Colors.success,
  warning: Colors.warning,
  danger: Colors.error,
  neutral: '#9CA3AF',
};

export function Button({ title, onPress, variant = 'primary', style, textStyle, disabled, small, iconName, iconPosition = 'left', iconFamily = 'MaterialIcons', iconSize = 16, iconColor }: ButtonProps) {
  const backgroundColor = variantToColor[variant];
  const IconComponent = iconFamily === 'MaterialCommunityIcons' ? MaterialCommunityIcons : MaterialIcons;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, { backgroundColor, opacity: disabled ? 0.6 : 1, paddingVertical: small ? 6 : 10 }, style]}
    >
      <View style={styles.contentRow}>
        {iconName && iconPosition === 'left' ? (
          <IconComponent name={iconName} size={iconSize} color={iconColor || (textStyle && 'color' in textStyle ? (textStyle as any).color : styles.text.color)} style={styles.iconLeft} />
        ) : null}
        <Text style={[styles.text, textStyle]}>{title}</Text>
        {iconName && iconPosition === 'right' ? (
          <IconComponent name={iconName} size={iconSize} color={iconColor || (textStyle && 'color' in textStyle ? (textStyle as any).color : styles.text.color)} style={styles.iconRight} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  iconLeft: { marginRight: 6 },
  iconRight: { marginLeft: 6 },
});


