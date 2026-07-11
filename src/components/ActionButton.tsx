import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme, type Theme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
};

export function ActionButton({ label, onPress, tone = 'default', disabled = false }: ActionButtonProps) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

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

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    button: {
      alignItems: 'center',
      backgroundColor: theme.accent,
      borderRadius: 8,
      justifyContent: 'center',
      marginBottom: 10,
      minHeight: 48,
      paddingHorizontal: 14,
    },
    dangerButton: {
      backgroundColor: theme.danger,
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
}
