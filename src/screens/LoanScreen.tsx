import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ProgressBar } from '../components/ui/ProgressBar';
import { PromptModal } from '../components/ui/PromptModal';
import { useLoans } from '../context/LoanContext';
import { invoiceService } from '../services/InvoiceService';
import { Colors } from '../theme/colors';

export function LoanScreen() {
  const { loans, addLoan, recordPayment, deleteLoan } = useLoans();

  const [name, setName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [type, setType] = useState<'owedByMe' | 'owedToMe'>('owedByMe');

  const [payModalVisible, setPayModalVisible] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!name || !principal) return;
    await addLoan(name, type, parseFloat(principal));
    setName('');
    setPrincipal('');
  };

  const openPayModal = (loanId: string) => {
    setSelectedLoanId(loanId);
    setPayAmount('');
    setPayModalVisible(true);
  };

  const handleSavePayment = async () => {
    const amt = parseFloat(payAmount);
    if (!isNaN(amt) && amt > 0 && selectedLoanId) {
      await recordPayment(selectedLoanId, amt);
      setPayModalVisible(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Input
          placeholder="Counterpart Name"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />
        <Input
          placeholder="Principal"
          style={[styles.input, { width: 100 }]}
          keyboardType="numeric"
          value={principal}
          onChangeText={setPrincipal}
        />
        <Button
          title={type === 'owedByMe' ? 'I Owe' : 'Owed To Me'}
          onPress={() => setType(prev => (prev === 'owedByMe' ? 'owedToMe' : 'owedByMe'))}
          variant="secondary"
          small
          style={{ marginRight: 8 }}
        />
        <Button title="Add" onPress={handleAdd} variant="primary" />
      </View>
      <FlatList
        data={loans}
        keyExtractor={l => l.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.title}>{item.counterpartName}</Text>
              <Text style={{ marginBottom: 4, color: Colors.mutedText }}>
                Balance: {item.balance} / Principal: {item.principal}
              </Text>
              <ProgressBar
                progress={item.principal ? (item.principal - item.balance) / item.principal : 0}
                fillColor={Colors.primary}
              />
            </View>
            <View style={{ flexDirection: 'column' }}>
              <Button title="Pay" onPress={() => openPayModal(item.id)} variant="success" small />
              <View style={{ height: 6 }} />
              <Button title="Inv" onPress={() => invoiceService.printAndUploadLoanInvoice(item)} variant="secondary" small />
              <View style={{ height: 6 }} />
              <Button title="Del" onPress={() => deleteLoan(item.id)} variant="danger" small />
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40 }}>No loans yet</Text>}
      />
      <PromptModal
        visible={payModalVisible}
        title="Record Payment"
        onCancel={() => setPayModalVisible(false)}
        onConfirm={handleSavePayment}
      >
        <Input
          placeholder="Amount"
          value={payAmount}
          onChangeText={setPayAmount}
          keyboardType="numeric"
          style={styles.modalInput}
        />
      </PromptModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background },
  row: { flexDirection: 'row', marginBottom: 12, alignItems: 'center' },
  input: { marginRight: 8, flex: 1 },
  item: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalInput: {
    width: '100%',
  },
  title: { fontWeight: '600', color: Colors.text },
});
