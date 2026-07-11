import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme, type Theme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';

type InputFieldProps = {
  label: string;
  multiline?: boolean;
  onChangeText: (text: string) => void;
  placeholder?: string;
  value: string;
};

export function InputField({ label, multiline = false, onChangeText, placeholder, value }: InputFieldProps) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={theme.textMuted}
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
      />
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrapper: {
      marginBottom: 10,
    },
    label: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 5,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    input: {
      backgroundColor: theme.bgInput,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.text,
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
}
