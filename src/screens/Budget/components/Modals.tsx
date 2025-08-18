import React from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { PromptModal } from '../../../components/ui/PromptModal';
import { Colors } from '../../../theme/colors';

export function SpendModal({ visible, amount, onChange, onCancel, onSave }: { visible: boolean; amount: string; onChange: (v: string) => void; onCancel: () => void; onSave: () => void; }) {
  return (
    <PromptModal visible={visible} title="Add Expense" onCancel={onCancel} onConfirm={onSave}>
      <Input placeholder="Amount" value={amount} onChangeText={onChange} keyboardType="numeric" style={{ width: '100%' }} />
    </PromptModal>
  );
}

export function FilterModal({ visible, categories, selected, onSelect, onClose }: { visible: boolean; categories: string[]; selected?: string; onSelect: (v?: string) => void; onClose: () => void; }) {
  return (
    <PromptModal showConfirm={false} visible={visible} title="Filter by Category" onCancel={onClose} cancelText="Close">
      <View style={{ maxHeight: 240 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {[...new Set(['All', ...categories])].map(cat => (
            <View key={cat} style={{ margin: 4 }}>
              <Button title={cat} variant={(!selected && cat === 'All') || (selected === cat) ? 'primary' : 'neutral'} onPress={() => onSelect(cat === 'All' ? undefined : cat)} small />
            </View>
          ))}
        </View>
      </View>
    </PromptModal>
  );
}

export function SortModal({ visible, sortKey, sortDir, setSortKey, setSortDir, onClose }: { visible: boolean; sortKey: 'date' | 'amount'; sortDir: 'asc' | 'desc'; setSortKey: (k: 'date' | 'amount') => void; setSortDir: (d: 'asc' | 'desc') => void; onClose: () => void; }) {
  return (
    <PromptModal showConfirm={false} visible={visible} title="Sort Budgets" onCancel={onClose} cancelText="Close">
      <View>
        <Text style={{ color: Colors.mutedText, marginBottom: 8 }}>By</Text>
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <Button title="Date" variant={sortKey === 'date' ? 'primary' : 'neutral'} onPress={() => setSortKey('date')} small style={{ marginRight: 8 }} />
          <Button title="Amount" variant={sortKey === 'amount' ? 'primary' : 'neutral'} onPress={() => setSortKey('amount')} small />
        </View>
        <Text style={{ color: Colors.mutedText, marginBottom: 8 }}>Direction</Text>
        <View style={{ flexDirection: 'row' }}>
          <Button title="Asc" variant={sortDir === 'asc' ? 'primary' : 'neutral'} onPress={() => setSortDir('asc')} small style={{ marginRight: 8 }} />
          <Button title="Desc" variant={sortDir === 'desc' ? 'primary' : 'neutral'} onPress={() => setSortDir('desc')} small />
        </View>
      </View>
    </PromptModal>
  );
}

export function GroupModal({ visible, groupBy, setGroupBy, onClose }: { visible: boolean; groupBy: 'date' | 'category'; setGroupBy: (g: 'date' | 'category') => void; onClose: () => void; }) {
  return (
    <PromptModal showConfirm={false} visible={visible} title="Group Budgets" onCancel={onClose} cancelText="Close">
      <View>
        <Text style={{ color: Colors.mutedText, marginBottom: 8 }}>Group By</Text>
        <View style={{ flexDirection: 'row' }}>
          <Button title="Date" variant={groupBy === 'date' ? 'primary' : 'neutral'} onPress={() => setGroupBy('date')} small style={{ marginRight: 8 }} />
          <Button title="Category" variant={groupBy === 'category' ? 'primary' : 'neutral'} onPress={() => setGroupBy('category')} small />
        </View>
      </View>
    </PromptModal>
  );
}

export function DeleteModal({ visible, onCancel, onDeleteOne, onDeleteAll }: { visible: boolean; onCancel: () => void; onDeleteOne: () => void; onDeleteAll: () => void; }) {
  return (
    <PromptModal showConfirm={false} visible={visible} title="Delete Budget" onCancel={onCancel}>
      <View>
        <Text style={{ color: Colors.text, marginBottom: 12 }}>Are you sure you want to delete?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Button title="Delete This Only" variant="danger" onPress={onDeleteOne} style={{ marginRight: 8, marginBottom: 8 }} />
          <Button title="Delete all Recurring" variant="danger" onPress={onDeleteAll} style={{ marginBottom: 8 }} />
        </View>
      </View>
    </PromptModal>
  );
}

export function EditScopeModal({ visible, onCancel, onSingle, onSeries }: { visible: boolean; onCancel: () => void; onSingle: () => void; onSeries: () => void; }) {
  return (
    <PromptModal visible={visible} title="Edit Recurring Budget" onCancel={onCancel} onConfirm={onCancel}>
      <View>
        <Text style={{ color: Colors.text, marginBottom: 12 }}>Apply your changes to:</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Button title="This Occurrence" variant="primary" onPress={onSingle} style={{ marginRight: 8, marginBottom: 8 }} />
          <Button title="Entire Series" variant="secondary" onPress={onSeries} style={{ marginBottom: 8 }} />
        </View>
      </View>
    </PromptModal>
  );
}


