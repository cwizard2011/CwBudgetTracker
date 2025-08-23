import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { useSettings } from '../../context/SettingsContext';
import { invoiceService } from '../../services/InvoiceService';
import { Colors } from '../../theme/colors';
import { formatCurrency } from '../../utils/format';
import { useI18n } from '../../utils/i18n';

export function LoanInvoiceScreen({ navigation, route }: any) {
  const loan = route?.params?.loan as any;
  const { locale, currency } = useSettings();
  const t = useI18n();
  if (!loan) {
    return (
      <View style={[StyleSheet.create({container:{flex:1,backgroundColor:Colors.background}}).container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontWeight: '600', color: Colors.text }}>{t('loans.noLoansYet')}</Text>
        <View style={{ height: 12 }} />
        <Button title={t('common.close')} onPress={() => navigation.goBack()} variant="neutral" />
      </View>
    );
  }

  const loanDate = new Date(loan.loanDate || loan.createdAt);
  const typeLabel = loan.type === 'owedByMe' ? t('loans.iOwe') : t('loans.owedToMe');

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    heading: { fontSize: 20, fontWeight: '800', color: Colors.heading, marginBottom: 12 },
    title: { fontWeight: '600', color: Colors.text },
    card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 16 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    label: { color: Colors.mutedText },
    value: { color: Colors.text, fontWeight: '600' },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.heading}>{t('invoice.title')}</Text>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>{t('invoice.type')}</Text>
          <Text style={styles.value}>{typeLabel}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>{t('invoice.counterparty')}</Text>
          <Text style={styles.value}>{loan.counterpartName}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>{t('invoice.principal')}</Text>
          <Text style={styles.value}>{formatCurrency(loan.principal || 0, locale, currency)}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>{t('invoice.balance')}</Text>
          <Text style={styles.value}>{formatCurrency(loan.balance || 0, locale, currency)}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>{t('invoice.date')}</Text>
          <Text style={styles.value}>{loanDate.toLocaleDateString(locale)}</Text>
        </View>
        {loan.notes ? (
          <View style={[styles.rowBetween, { alignItems: 'flex-start' }]}>
            <Text style={styles.label}>{t('invoice.notes')}</Text>
            <Text style={[styles.value, { maxWidth: '70%', textAlign: 'right' }]}>{loan.notes}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={[styles.title, { marginBottom: 8 }]}>{t('invoice.records')}</Text>
        {(() => {
          const issuances = (loan.issuances && loan.issuances.length) ? loan.issuances : [{ id: 'initial', amount: loan.principal || 0, date: loan.loanDate || loan.createdAt, notes: loan.notes }];
          const records = [
            ...issuances.map((i: any) => ({ id: i.id, date: i.date, type: t('records.loan'), amount: i.amount, notes: i.notes })),
            ...((loan.payments || []).map((p: any) => ({ id: p.id, date: p.date, type: t('records.payment'), amount: p.amount, notes: p.notes })) as any[]),
          ].sort((a: any, b: any) => a.date - b.date);
          return records.map((r: any) => (
            <View key={r.id} style={styles.rowBetween}>
              <Text style={styles.label}>{new Date(r.date).toLocaleDateString(locale)}</Text>
              <Text style={styles.label}>{r.type}</Text>
              <Text style={styles.value}>{formatCurrency(r.amount || 0, locale, currency)}</Text>
            </View>
          ));
        })()}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
        <Button title={t('common.close')} onPress={() => navigation.goBack()} variant="neutral" style={{ marginRight: 8 }} />
        <Button title={t('invoice.print')} onPress={() => invoiceService.printAndUploadLoanInvoice(loan, locale, currency)} variant="primary" />
      </View>
    </ScrollView>
  );
}

