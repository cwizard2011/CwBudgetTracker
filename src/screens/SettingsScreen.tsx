import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { PromptModal } from '../components/ui/PromptModal';
import { useSettings } from '../context/SettingsContext';
import { backupService } from '../services/BackupService';
import { Colors } from '../theme/colors';
import { useI18n } from '../utils/i18n';

export function SettingsScreen() {
  const { theme, setTheme, locale, setLocale, currency, setCurrency } = useSettings();
  const t = useI18n();
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState<'backup' | 'restore' | null>(null);
  const [confirmRestoreVisible, setConfirmRestoreVisible] = useState(false);

  const handleCreateBackup = async () => {
    setBusy('backup');
    try {
      const result = await backupService.createBackup();
      setStatus(t('settings.backup.success', { path: result.path, count: result.keysCount }));
    } catch (error: any) {
      const message = error?.message || t('settings.backup.unknownError');
      setStatus(t('settings.backup.failed', { message }));
    } finally {
      setBusy(null);
    }
  };

  const handleRestoreLatest = async () => {
    setBusy('restore');
    try {
      const result = await backupService.restoreLatestBackup();
      setStatus(
        `${t('settings.backup.restoreSuccess', { path: result.path, count: result.keysCount })}\n${t('settings.backup.restartRequired')}`,
      );
    } catch (error: any) {
      const message = error?.message || t('settings.backup.unknownError');
      setStatus(t('settings.backup.restoreFailed', { message }));
    } finally {
      setBusy(null);
      setConfirmRestoreVisible(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    heading: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 12 },
    section: { marginTop: 16, marginBottom: 8, color: Colors.mutedText, fontWeight: '700' },
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
    mr: { marginRight: 8, marginBottom: 8 },
    help: { color: Colors.mutedText, marginBottom: 10, lineHeight: 20 },
    status: { color: Colors.text, marginTop: 10 },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.heading}>{t('settings.title')}</Text>

      <Text style={styles.section}>{t('settings.appearance')}</Text>
      <View style={styles.row}>
        <Button title={t('settings.theme.light')} variant={theme === 'light' ? 'primary' : 'neutral'} onPress={() => setTheme('light')} style={styles.mr} />
        <Button title={t('settings.theme.dark')} variant={theme === 'dark' ? 'primary' : 'neutral'} onPress={() => setTheme('dark')} style={styles.mr} />
        <Button title={t('settings.theme.darkDim')} variant={theme === 'darkDim' ? 'primary' : 'neutral'} onPress={() => setTheme('darkDim' as any)} style={styles.mr} />
        <Button title={t('settings.theme.darkGray')} variant={theme === 'darkGray' ? 'primary' : 'neutral'} onPress={() => setTheme('darkGray' as any)} style={styles.mr} />
        <Button title={t('settings.theme.system')} variant={theme === 'system' ? 'primary' : 'neutral'} onPress={() => setTheme('system')} />
      </View>

      <Text style={styles.section}>{t('settings.language')}</Text>
      <View style={styles.row}>
        {['en', 'fr', 'es', 'de', 'pt'].map(l => (
          <Button key={l} title={l.toUpperCase()} variant={locale === l ? 'primary' : 'neutral'} onPress={() => setLocale(l)} style={styles.mr} />
        ))}
      </View>

      <Text style={styles.section}>{t('settings.currency')}</Text>
      <View style={styles.row}>
        {['USD','EUR','GBP','NGN','JPY'].map(c => (
          <Button key={c} title={c} variant={currency === c ? 'primary' : 'neutral'} onPress={() => setCurrency(c)} style={styles.mr} />
        ))}
      </View>

      <Text style={styles.section}>{t('settings.backup.title')}</Text>
      <Text style={styles.help}>{t('settings.backup.description')}</Text>
      <View style={styles.row}>
        <Button
          title={busy === 'backup' ? t('settings.backup.creating') : t('settings.backup.create')}
          onPress={handleCreateBackup}
          variant="primary"
          style={styles.mr}
          disabled={busy !== null}
        />
        <Button
          title={busy === 'restore' ? t('settings.backup.restoring') : t('settings.backup.restore')}
          onPress={() => setConfirmRestoreVisible(true)}
          variant="warning"
          disabled={busy !== null}
        />
      </View>
      {!!status && (
        <Text selectable style={styles.status}>
          {status}
        </Text>
      )}

      <PromptModal
        visible={confirmRestoreVisible}
        title={t('settings.backup.restore')}
        onCancel={() => setConfirmRestoreVisible(false)}
        onConfirm={handleRestoreLatest}
        confirmText={t('common.apply')}
        cancelText={t('common.cancel')}
      >
        <Text style={{ color: Colors.text }}>{t('settings.backup.restoreWarning')}</Text>
      </PromptModal>
    </ScrollView>
  );
}


