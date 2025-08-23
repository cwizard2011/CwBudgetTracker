import React from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { PromptModal } from '../../../components/ui/PromptModal';
import { Colors } from '../../../theme/colors';
import { useI18n } from '../../../utils/i18n';

export function SpendModal({ visible, amount, onChange, onCancel, onSave }: { visible: boolean; amount: string; onChange: (v: string) => void; onCancel: () => void; onSave: () => void; }) {
  const t = useI18n();
  return (
    <PromptModal visible={visible} title={t('budget.addExpense')} onCancel={onCancel} onConfirm={onSave}>
      <Input placeholder={t('budget.amount')} value={amount} onChangeText={onChange} keyboardType="numeric" style={{ width: '100%' }} />
    </PromptModal>
  );
}

export function FilterModal({ visible, categories, selected, onSelect, onClose }: { visible: boolean; categories: string[]; selected?: string; onSelect: (v?: string) => void; onClose: () => void; }) {
  const t = useI18n();
  return (
    <PromptModal showConfirm={false} visible={visible} title={t('budget.filterByCategory')} onCancel={onClose} cancelText={t('common.close')}>
      <View style={{ maxHeight: 240 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {[...new Set([t('common.all'), ...categories])].map(cat => (
            <View key={cat} style={{ margin: 4 }}>
              <Button title={cat} variant={(!selected && cat === t('common.all')) || (selected === cat) ? 'primary' : 'neutral'} onPress={() => onSelect(cat === t('common.all') ? undefined : cat)} small />
            </View>
          ))}
        </View>
      </View>
    </PromptModal>
  );
}

export function SortModal({ visible, sortKey, sortDir, setSortKey, setSortDir, onClose }: { visible: boolean; sortKey: 'date' | 'amount'; sortDir: 'asc' | 'desc'; setSortKey: (k: 'date' | 'amount') => void; setSortDir: (d: 'asc' | 'desc') => void; onClose: () => void; }) {
  const t = useI18n();
  return (
    <PromptModal showConfirm={false} visible={visible} title={t('budget.sortBudgets')} onCancel={onClose} cancelText={t('common.close')}>
      <View>
        <Text style={{ color: Colors.mutedText, marginBottom: 8 }}>{t('loans.by')}</Text>
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <Button title={t('invoice.date')} variant={sortKey === 'date' ? 'primary' : 'neutral'} onPress={() => setSortKey('date')} small style={{ marginRight: 8 }} />
          <Button title={t('loans.amount')} variant={sortKey === 'amount' ? 'primary' : 'neutral'} onPress={() => setSortKey('amount')} small />
        </View>
        <Text style={{ color: Colors.mutedText, marginBottom: 8 }}>{t('loans.direction')}</Text>
        <View style={{ flexDirection: 'row' }}>
          <Button title={t('loans.asc')} variant={sortDir === 'asc' ? 'primary' : 'neutral'} onPress={() => setSortDir('asc')} small style={{ marginRight: 8 }} />
          <Button title={t('loans.desc')} variant={sortDir === 'desc' ? 'primary' : 'neutral'} onPress={() => setSortDir('desc')} small />
        </View>
      </View>
    </PromptModal>
  );
}

export function GroupModal({ visible, groupBy, setGroupBy, onClose }: { visible: boolean; groupBy: 'date' | 'category'; setGroupBy: (g: 'date' | 'category') => void; onClose: () => void; }) {
  const t = useI18n();
  return (
    <PromptModal showConfirm={false} visible={visible} title={t('budget.groupBudgets')} onCancel={onClose} cancelText={t('common.close')}>
      <View>
        <Text style={{ color: Colors.mutedText, marginBottom: 8 }}>{t('loans.groupBy')}</Text>
        <View style={{ flexDirection: 'row' }}>
          <Button title={t('invoice.date')} variant={groupBy === 'date' ? 'primary' : 'neutral'} onPress={() => setGroupBy('date')} small style={{ marginRight: 8 }} />
          <Button title={t('common.category')} variant={groupBy === 'category' ? 'primary' : 'neutral'} onPress={() => setGroupBy('category')} small />
        </View>
      </View>
    </PromptModal>
  );
}

export function DeleteModal({ visible, onCancel, onDeleteOne, onDeleteAll }: { visible: boolean; onCancel: () => void; onDeleteOne: () => void; onDeleteAll: () => void; }) {
  const t = useI18n();
  return (
    <PromptModal showConfirm={false} visible={visible} title={t('budget.deleteBudget')} onCancel={onCancel}>
      <View>
        <Text style={{ color: Colors.text, marginBottom: 12 }}>{t('common.areYouSureDelete')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Button title={t('budget.deleteThisOnly')} variant="danger" onPress={onDeleteOne} style={{ marginRight: 8, marginBottom: 8 }} />
          <Button title={t('budget.deleteAllRecurring')} variant="danger" onPress={onDeleteAll} style={{ marginBottom: 8 }} />
        </View>
      </View>
    </PromptModal>
  );
}

export function ConfirmDeleteModal({ visible, onCancel, onConfirm }: { visible: boolean; onCancel: () => void; onConfirm: () => void; }) {
  const t = useI18n();
  return (
    <PromptModal visible={visible} title={t('budget.deleteBudget')} onCancel={onCancel} onConfirm={onConfirm} confirmText={t('common.delete')} cancelVariant="primary" confirmVariant="danger">
      <View>
        <Text style={{ color: Colors.text, marginBottom: 12 }}>{t('common.areYouSureDelete')}</Text>
      </View>
    </PromptModal>
  );
}

export function EditScopeModal({ visible, onCancel, onSingle, onSeries }: { visible: boolean; onCancel: () => void; onSingle: () => void; onSeries: () => void; }) {
  const t = useI18n();
  return (
    <PromptModal visible={visible} title={t('budget.editRecurringBudget')} onCancel={onCancel} onConfirm={onCancel}>
      <View>
        <Text style={{ color: Colors.text, marginBottom: 12 }}>{t('budget.applyYourChangesTo')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Button title={t('budget.thisOccurrence')} variant="primary" onPress={onSingle} style={{ marginRight: 8, marginBottom: 8 }} />
          <Button title={t('budget.entireSeries')} variant="secondary" onPress={onSeries} style={{ marginBottom: 8 }} />
        </View>
      </View>
    </PromptModal>
  );
}


