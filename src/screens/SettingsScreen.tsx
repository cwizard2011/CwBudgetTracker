import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { useSettings } from '../context/SettingsContext';
import { Colors } from '../theme/colors';
import { useI18n } from '../utils/i18n';

export function SettingsScreen() {
  const { theme, setTheme, locale, setLocale, currency, setCurrency } = useSettings();
  const t = useI18n();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    heading: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 12 },
    section: { marginTop: 16, marginBottom: 8, color: Colors.mutedText, fontWeight: '700' },
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
    mr: { marginRight: 8, marginBottom: 8 },
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
    </ScrollView>
  );
}


