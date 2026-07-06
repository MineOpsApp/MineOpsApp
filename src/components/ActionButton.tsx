import { Pressable, StyleSheet, Text } from 'react-native';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
};

export function ActionButton({ label, onPress, tone = 'default', disabled = false }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, tone === 'danger' && styles.dangerButton, disabled && styles.disabledButton]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#1f6f5b',
    borderRadius: 8,
    justifyContent: 'center',
    marginBottom: 10,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  dangerButton: {
    backgroundColor: '#b42318',
  },
  disabledButton: {
    opacity: 0.6,
  },
  text: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
});