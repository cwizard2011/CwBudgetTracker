import React from 'react';
import { StyleSheet, TextInput, TextInputProps } from 'react-native';
import { Colors } from '../../theme/colors';

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={Colors.mutedText} {...props} style={[styles.input, { color: Colors.text, backgroundColor: Colors.surface, borderColor: Colors.border }, props.style]} />;
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
});


