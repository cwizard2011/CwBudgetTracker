import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../theme/colors';
import { useSettings } from '../../context/SettingsContext';
import { useI18n } from '../../utils/i18n';
import { PromptModal } from './PromptModal';

interface DateRangeModalProps {
  visible: boolean;
  startISO?: string;
  endISO?: string;
  onCancel: () => void;
  onApply: (startISO?: string, endISO?: string) => void;
}

export const DateRangeModal: React.FC<DateRangeModalProps> = ({ visible, startISO, endISO, onCancel, onApply }) => {
  const [localStart, setLocalStart] = useState<string | undefined>(startISO);
  const [localEnd, setLocalEnd] = useState<string | undefined>(endISO);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const { locale } = useSettings();
  const t = useI18n();

  return (
    <PromptModal visible={visible} title={t('loans.customDate')} onCancel={onCancel} onConfirm={() => onApply(localStart, localEnd)} confirmText={t('common.apply')}>
      <View style={[styles.row, { marginTop: 4 }] }>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.label}>{t('date.start')}</Text>
          <TouchableOpacity style={styles.pickerLike} onPress={() => setShowStart(true)}>
            <Text style={{ color: Colors.text }}>{localStart ?? 'Select'}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{t('date.end')}</Text>
          <TouchableOpacity style={styles.pickerLike} onPress={() => setShowEnd(true)}>
            <Text style={{ color: Colors.text }}>{localEnd ?? 'Select'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      {showStart && (
        <DateTimePicker value={localStart ? new Date(localStart) : new Date()} mode="date" display={Platform.OS==='ios'?'spinner':'calendar'} locale={locale} onChange={(e, d) => { setShowStart(false); if (d) { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); setLocalStart(`${y}-${m}-${dd}`);} }} />
      )}
      {showEnd && (
        <DateTimePicker value={localEnd ? new Date(localEnd) : new Date()} mode="date" display={Platform.OS==='ios'?'spinner':'calendar'} locale={locale} onChange={(e, d) => { setShowEnd(false); if (d) { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); setLocalEnd(`${y}-${m}-${dd}`);} }} />
      )}
    </PromptModal>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  pickerLike: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: Colors.surface },
  label: { color: Colors.mutedText },
});


