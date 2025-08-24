import React, { useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../theme/colors';
import { Button } from './Button';

export interface CalculatorModalProps {
  visible: boolean;
  initialValue?: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

export function CalculatorModal({ visible, initialValue, onSubmit, onClose }: CalculatorModalProps) {
  const [expr, setExpr] = useState<string>(initialValue && initialValue.trim().length ? initialValue : '');
  const [error, setError] = useState<string | undefined>(undefined);

  const result = useMemo(() => {
    if (!expr) return '';
    const sanitized = expr.replace(/\s+/g, '');
    if (!/^[0-9+\-*/().]+$/.test(sanitized)) return '';
    try {
      // eslint-disable-next-line no-new-func
      const val = Function(`"use strict"; return (${sanitized})`)();
      if (typeof val === 'number' && Number.isFinite(val)) return String(val);
      return '';
    } catch {
      return '';
    }
  }, [expr]);

  const append = (t: string) => {
    setError(undefined);
    setExpr(prev => prev + t);
  };
  const backspace = () => setExpr(prev => prev.slice(0, -1));
  const clearAll = () => { setError(undefined); setExpr(''); };
  const evaluate = () => {
    if (!result) { setError(''); return; }
    setExpr(result);
  };
  const submit = () => {
    const val = result || expr;
    if (!val) return onClose();
    onSubmit(val);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Calculator</Text>
          <View style={styles.displayBox}>
            <Text style={styles.displayExpr} numberOfLines={2}>{expr || ' '}</Text>
            <Text style={styles.displayResult}>{result ? `= ${result}` : ' '}</Text>
          </View>

          <View style={styles.grid}>
            {[
              ['7','8','9','/'],
              ['4','5','6','*'],
              ['1','2','3','-'],
              ['0','.','=','+'],
            ].map((row, idx) => (
              <View key={idx} style={styles.row}>
                {row.map(key => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.key, /[0-9.]/.test(key) ? styles.keyNum : styles.keyOp]}
                    onPress={() => { key === '=' ? evaluate() : append(key); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.keyText}>{key}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            <View style={styles.row}>
              <TouchableOpacity style={[styles.key, styles.keyUtil]} onPress={clearAll} activeOpacity={0.7}>
                <Text style={styles.keyText}>C</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.key, styles.keyUtil]} onPress={backspace} activeOpacity={0.7}>
                <Text style={styles.keyText}>⌫</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
            </View>
          </View>

          {error ? <Text style={styles.error}>Invalid expression</Text> : null}

          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <Button title="Cancel" variant="neutral" onPress={onClose} style={{ marginRight: 8 }} />
            <Button title="OK" variant="primary" onPress={submit} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  sheet: { width: '90%', borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, padding: 16 },
  title: { color: Colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  displayBox: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 10, backgroundColor: Colors.background, marginBottom: 10 },
  displayExpr: { color: Colors.text, fontSize: 18, minHeight: 24 },
  displayResult: { color: Colors.mutedText, marginTop: 4 },
  grid: { marginTop: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  key: { flex: 1, height: 44, marginHorizontal: 4, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  keyNum: { backgroundColor: Colors.surface, borderColor: Colors.border },
  keyOp: { backgroundColor: Colors.progressBackground, borderColor: Colors.border },
  keyUtil: { backgroundColor: Colors.surface, borderColor: Colors.border },
  keyText: { color: Colors.text, fontWeight: '600' },
  error: { color: Colors.error, marginTop: 6 },
});


