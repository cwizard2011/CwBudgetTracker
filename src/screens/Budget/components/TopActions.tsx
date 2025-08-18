import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { IconButton } from '../../../components/ui/IconButton';
import { Colors } from '../../../theme/colors';

interface TopActionsProps {
  onFilter: () => void;
  onSort: () => void;
  onGroup: () => void;
  onAddBudget: () => void;
  onReset?: () => void;
  showReset?: boolean;
}

export function TopActions({ onFilter, onSort, onGroup, onAddBudget, onReset, showReset }: TopActionsProps) {
  return (
    <View style={styles.row}>
      <IconButton family="MaterialIcons" name="filter-list" onPress={onFilter} style={styles.icon} backgroundColor={Colors.white} color={Colors.primaryDark} />
      <IconButton family="MaterialIcons" name="sort" onPress={onSort} style={styles.icon} backgroundColor={Colors.white} color={Colors.secondaryDark} />
      <IconButton family="MaterialIcons" name="category" onPress={onGroup} style={styles.icon} backgroundColor={Colors.white} color={Colors.warningDark} />
      {showReset && onReset && (
        <IconButton family="MaterialIcons" name="refresh" onPress={onReset} style={styles.icon} backgroundColor={Colors.white} color={Colors.successDark} />
      )}
      <View style={styles.separator} />
      <Button title="Add Budget" onPress={onAddBudget} variant="primary" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 12, alignItems: 'center', justifyContent: 'space-between' },
  icon: { marginLeft: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: 8 },
  addButton: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  separator: { width: 1, height: 24, backgroundColor: Colors.border, marginRight: 8 },
});


