import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useCategories } from '../context/CategoryContext';
import { Colors } from '../theme/colors';

const ICONS = [
  '🏠','💡','💧','🍎','🚌','💊','🎬','💾','🛍️','🧾','🧰','📚','🎁','🍽️','🌐','📱','🚗','🍼','🐾'
];

export function CategoryPickerScreen({ route, navigation }: any) {
  const { categories, addCategory } = useCategories();
  const [text, setText] = useState<string>(route?.params?.value || '');
  const [icon, setIcon] = useState<string>(route?.params?.icon || ICONS[0]);

  const data = useMemo(() => categories, [categories]);

  const onSave = async () => {
    if (text && !categories.includes(text)) {
      await addCategory(text);
    }
    if (route?.params?.onSelect) route.params.onSelect(text, icon);
  };

  return (
    <View style={styles.container}>
      <View style={{ padding: 16 }}>
        <Input placeholder="Category name" value={text} onChangeText={setText} />
        <Text style={{ marginTop: 12, color: Colors.mutedText }}>Choose an icon</Text>
        <View style={styles.iconGrid}>
          {ICONS.map(i => (
            <TouchableOpacity key={i} onPress={() => setIcon(i)} style={[styles.iconBox, icon === i && styles.iconActive]}>
              <Text style={{ fontSize: 22 }}>{i}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Button title="Save" onPress={onSave} variant="primary" style={{ marginTop: 12 }} />
      </View>
      <Text style={[styles.heading]}>Existing categories</Text>
      <FlatList
        data={data}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => { setText(item); }} style={styles.catRow}>
            <Text style={{ color: Colors.text }}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  heading: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, color: Colors.mutedText },
  catRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Colors.border },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  iconBox: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: Colors.border, marginRight: 8, marginBottom: 8 },
  iconActive: { backgroundColor: Colors.surface, borderColor: Colors.primary },
});


