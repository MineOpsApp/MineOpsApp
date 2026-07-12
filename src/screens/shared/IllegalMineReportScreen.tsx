import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { submitIllegalMineReport, parseApiError } from '../../services/api';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

export function IllegalMineReportScreen() {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [location, setLocation] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!location.trim()) { Alert.alert('Required', 'Describe the location of the suspected illegal mining activity.'); return; }
    setSubmitting(true);
    try {
      await submitIllegalMineReport({ locationDescription: location.trim(), details: details.trim() || undefined });
      setSubmitted(true);
    } catch (e) {
      Alert.alert('Failed', parseApiError(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <ScrollView contentContainerStyle={[styles.container, { alignItems: 'center', paddingTop: 60 }]}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>✅</Text>
        <Text style={styles.successTitle}>Report submitted</Text>
        <Text style={styles.successSub}>Your tip has been received and will be reviewed by a GoldBod regulator. Thank you for helping keep Ghana's mining sector legal.</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Report Illegal Mining</Text>
      <Text style={styles.sub}>Tips are reviewed by GoldBod regulators. Your report is confidential.</Text>

      <Text style={styles.label}>Location / Area Description *</Text>
      <TextInput
        style={styles.input}
        value={location}
        onChangeText={setLocation}
        placeholder="e.g. Near Nsuta Junction, along the Ankobra River, Tarkwa area"
        placeholderTextColor={theme.textMuted}
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>Additional Details (optional)</Text>
      <TextInput
        style={[styles.input, styles.inputLarge]}
        value={details}
        onChangeText={setDetails}
        placeholder="Equipment seen, number of people, dates of activity, any other relevant information…"
        placeholderTextColor={theme.textMuted}
        multiline
        numberOfLines={5}
      />

      <Pressable onPress={handleSubmit} disabled={submitting} style={[styles.submitBtn, submitting && { opacity: 0.6 }]}>
        <Text style={styles.submitBtnText}>{submitting ? 'Submitting…' : 'Submit Report'}</Text>
      </Pressable>

      <Text style={styles.disclaimer}>
        This report is logged internally and forwarded to GoldBod for review. False reports may have legal consequences.
      </Text>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 40, backgroundColor: theme.bg },
    title: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 4 },
    sub: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 20 },
    label: { color: theme.textSub, fontSize: 13, fontWeight: '800', marginBottom: 6, marginTop: 4 },
    input: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, marginBottom: 14, padding: 12, textAlignVertical: 'top' },
    inputLarge: { minHeight: 100 },
    submitBtn: { alignItems: 'center', backgroundColor: theme.danger, borderRadius: 10, paddingVertical: 14, marginBottom: 16 },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
    disclaimer: { color: theme.textMuted, fontSize: 11, fontWeight: '600', lineHeight: 16, textAlign: 'center' },
    successTitle: { color: theme.text, fontSize: 20, fontWeight: '900', marginBottom: 12 },
    successSub: { color: theme.textSub, fontSize: 14, fontWeight: '600', lineHeight: 22, textAlign: 'center' },
  });
}
