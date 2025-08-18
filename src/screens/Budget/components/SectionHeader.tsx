import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { IconButton } from '../../../components/ui/IconButton';
import { Colors } from '../../../theme/colors';

interface SectionHeaderProps {
  title: string;
  displayTitle: string;
  collapsed: boolean;
  onToggle: () => void;
}

export function SectionHeader({ title, displayTitle, collapsed, onToggle }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onToggle} accessibilityRole="button" accessibilityLabel={`Toggle ${displayTitle}`} style={styles.row}>
        <Text style={styles.title}>{displayTitle}</Text>
        <IconButton
          family="MaterialIcons"
          name={collapsed ? 'keyboard-arrow-down' : 'keyboard-arrow-up'}
          onPress={onToggle}
          size={28}
          color={Colors.white}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: Colors.primaryDark,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontWeight: '800', color: Colors.white, fontSize: 16 },
});


