import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { IconButton } from '../../../components/ui/IconButton';
import { Colors } from '../../../theme/colors';
import { useI18n } from '../../../utils/i18n';

interface TopActionsProps {
  onFilter: () => void;
  onSort: () => void;
  onGroup: () => void;
  onAddBudget: () => void;
  onReset?: () => void;
  showReset?: boolean;
}

export function TopActions({ onFilter, onSort, onGroup, onAddBudget, onReset, showReset }: TopActionsProps) {
  const t = useI18n();
  const isDarkBg = (() => {
    const hex = Colors.background || '#000000';
    const h = hex.replace('#','');
    const r = parseInt(h.substring(0,2),16) || 0;
    const g = parseInt(h.substring(2,4),16) || 0;
    const b = parseInt(h.substring(4,6),16) || 0;
    const luminance = 0.2126*r + 0.7152*g + 0.0722*b; // 0-255
    return luminance < 128;
  })();
  const iconBg = isDarkBg ? Colors.surface : Colors.white;
  const iconBorderColor = Colors.border;
  return (
    <View style={styles.row}>
      <IconButton family="MaterialIcons" name="filter-list" onPress={onFilter} style={{ ...styles.icon, borderColor: iconBorderColor, borderWidth: StyleSheet.hairlineWidth }} backgroundColor={iconBg} color={Colors.primaryDark} />
      <IconButton family="MaterialIcons" name="sort" onPress={onSort} style={{ ...styles.icon, borderColor: iconBorderColor, borderWidth: StyleSheet.hairlineWidth }} backgroundColor={iconBg} color={Colors.secondaryDark} />
      <IconButton family="MaterialIcons" name="category" onPress={onGroup} style={{ ...styles.icon, borderColor: iconBorderColor, borderWidth: StyleSheet.hairlineWidth }} backgroundColor={iconBg} color={Colors.warningDark} />
      {showReset && onReset && (
        <IconButton family="MaterialIcons" name="refresh" onPress={onReset} style={{ ...styles.icon, borderColor: iconBorderColor, borderWidth: StyleSheet.hairlineWidth }} backgroundColor={iconBg} color={Colors.successDark} />
      )}
      <View style={styles.separator} />
      <Button title={t('budget.addBudget')} onPress={onAddBudget} variant="primary" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 12, alignItems: 'center', justifyContent: 'space-between' },
  icon: { marginLeft: 8, borderRadius: 8 },
  addButton: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  separator: { width: 1, height: 24, backgroundColor: Colors.border, marginRight: 8 },
});


