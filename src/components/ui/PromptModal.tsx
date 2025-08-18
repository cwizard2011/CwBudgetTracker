import React, { ReactNode } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../theme/colors';
import { Button } from './Button';

export interface PromptModalProps {
  visible: boolean;
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  showConfirm?: boolean;
}

export function PromptModal({ visible, title, children, onCancel, onConfirm, confirmText = 'Save', cancelText = 'Cancel', showConfirm = true }: PromptModalProps) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <View style={{ width: '100%' }}>{children}</View>
          <View style={styles.actions}>
            <Button title={cancelText} onPress={onCancel} variant="neutral" />
            {showConfirm && onConfirm && <Button title={confirmText} onPress={onConfirm} variant="primary" />}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 12,
    width: '86%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  actions: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10 as any,
  },
});


