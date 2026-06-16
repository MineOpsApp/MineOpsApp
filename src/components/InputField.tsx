import { StyleSheet, Text, TextInput, View } from 'react-native';

type InputFieldProps = {
  label: string;
  multiline?: boolean;
  onChangeText: (text: string) => void;
  placeholder?: string;
  value: string;
};

export function InputField({ label, multiline = false, onChangeText, placeholder, value }: InputFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor="#9aa5b1"
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 10,
  },
  label: {
    color: '#17212b',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
    borderRadius: 8,
    borderWidth: 1,
    color: '#17212b',
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
