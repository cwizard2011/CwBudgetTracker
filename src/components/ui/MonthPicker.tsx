import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../theme/colors';
import { Button } from './Button';

export interface MonthPickerProps {
  yearMonth: string; // YYYY-MM
  onChange: (next: string) => void;
  minYearMonth?: string; // inclusive
}

function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(n => parseInt(n, 10));
  const date = new Date(y, m - 1 + delta, 1);
  const y2 = date.getFullYear();
  const m2 = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${y2}-${m2}`;
}

function compareYM(a: string, b: string): number {
  return a.localeCompare(b);
}

function toLongMonth(ym: string): string {
  const [y, m] = ym.split('-').map(n => parseInt(n, 10));
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

function shortMonth(ym: string): string {
  const [y, m] = ym.split('-').map(n => parseInt(n, 10));
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'short' });
}

function centerLabel(ym: string): string {
  const [y, m] = ym.split('-').map(n => parseInt(n, 10));
  const mon = new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'short' });
  return `${mon},${y}`;
}

export function MonthPicker({ yearMonth, onChange, minYearMonth }: MonthPickerProps) {
  const prev = addMonths(yearMonth, -1);
  const next = addMonths(yearMonth, 1);
  const minBlocked = !!minYearMonth && compareYM(prev, minYearMonth) < 0;
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        <Button
          textStyle={styles.buttonText}
          title={shortMonth(prev)}
          onPress={() => !minBlocked && onChange(prev)}
          variant="neutral"
          small
          disabled={minBlocked}
          style={styles.button}
          iconName="chevron-left"
          iconFamily="MaterialIcons"
          iconPosition="left"
          iconColor={styles.buttonText.color as string}
        />
      </View>
      <View style={styles.center}><Text style={styles.label} numberOfLines={1} ellipsizeMode="tail">{centerLabel(yearMonth)}</Text></View>
      <View style={styles.side}>
        <Button
          textStyle={styles.buttonText}
          title={shortMonth(next)}
          onPress={() => onChange(next)}
          variant="neutral"
          small
          style={styles.button}
          iconName="chevron-right"
          iconFamily="MaterialIcons"
          iconPosition="right"
          iconColor={styles.buttonText.color as string}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  side: { flexBasis: '30%', maxWidth: '30%'},
  center: { flexBasis: '40%', maxWidth: '40%', alignItems: 'center' },
  label: { fontWeight: '700', color: Colors.text },
  button: { width: '100%', backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  buttonText: { color: Colors.mutedText }
});


