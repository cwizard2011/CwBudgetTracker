import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Colors } from '../../theme/colors';

export interface ProgressBarProps {
  progress: number; // 0..1
  trackColor?: string;
  fillColor?: string;
  style?: ViewStyle;
  height?: number;
  rounded?: boolean;
}

export function ProgressBar({ progress, trackColor = Colors.progressBackground, fillColor = Colors.primary, style, height = 6, rounded = true }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress || 0));
  return (
    <View style={[styles.track, { backgroundColor: trackColor, height, borderRadius: rounded ? height / 2 : 0 }, style]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: fillColor, height }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {},
});


