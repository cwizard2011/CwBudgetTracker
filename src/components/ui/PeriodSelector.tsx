import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../theme/colors';
import { Button } from './Button';
import { useI18n } from '../../utils/i18n';

export type PeriodOption = 'weekly' | 'monthly' | 'quarterly' | 'annual';

interface PeriodSelectorProps {
  value: PeriodOption;
  onChange: (p: PeriodOption) => void;
  onOpenCustomDate?: () => void;
  disabled?: boolean;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({ value, onChange, onOpenCustomDate, disabled }) => {
  const t = useI18n();
  return (
    <View style={styles.container}>
      <Button title={t('period.weekly')} small variant={value==='weekly' && !disabled ? 'primary' : 'neutral'} onPress={() => onChange('weekly')} style={styles.mr} />
      <Button title={t('period.monthly')} small variant={value==='monthly' && !disabled ? 'primary' : 'neutral'} onPress={() => onChange('monthly')} style={styles.mr} />
      <Button title={t('period.quarterly')} small variant={value==='quarterly' && !disabled ? 'primary' : 'neutral'} onPress={() => onChange('quarterly')} style={styles.mr} />
      <Button title={t('period.annual')} small variant={value==='annual' && !disabled ? 'primary' : 'neutral'} onPress={() => onChange('annual')} style={styles.mr} />
      {onOpenCustomDate && (
        <Button title={t('loans.customDate')} small variant="neutral" onPress={onOpenCustomDate} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 },
  mr: { marginRight: 6 },
});


