import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { resetUserPassword } from '../../services/api';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

export function SupervisorResetPasswordScreen({ session: _ }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ email: string; fullName: string; temporaryPassword: string } | null>(null);

  async function handleReset() {
    if (!email.trim()) { Alert.alert('Missing email', 'Enter the worker email address.'); return; }
    setLoading(true);
    try {
      const res = await resetUserPassword(email.trim().toLowerCase());
      setResult(res);
      setEmail('');
    } catch (error: any) {
      const msg = error?.message ?? '';
      if (msg.includes('404')) Alert.alert('Not found', 'No account found with that email.');
      else if (msg.includes('403')) Alert.alert('Not allowed', 'Cannot reset passwords for supervisors or safety officers.');
      else Alert.alert('Failed', 'Could not reset password.');
    } finally { setLoading(false); }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Reset Password</Text>
      <Text style={styles.pageSub}>Generate a temporary password for a worker who has been locked out</Text>

      {result ? (
        <View style={styles.successCard}>
          <Text style={styles.successTitle}>✓ Password Reset</Text>
          <Text style={styles.successSub}>Share this temporary password with the worker</Text>
          <View style={styles.credentialRow}>
            <Text style={styles.credentialLabel}>Name</Text>
            <Text style={styles.credentialValue}>{result.fullName}</Text>
          </View>
          <View style={styles.credentialRow}>
            <Text style={styles.credentialLabel}>Email</Text>
            <Text style={styles.credentialValue}>{result.email}</Text>
          </View>
          <View style={styles.credentialRow}>
            <Text style={styles.credentialLabel}>Temp Password</Text>
            <Text style={styles.credentialValueBold}>{result.temporaryPassword}</Text>
          </View>
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>⚠ This password will not be shown again. Note it down now.</Text>
          </View>
          <ActionButton label="Reset Another Password" onPress={() => setResult(null)} />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Worker Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="worker@example.com"
            placeholderTextColor="#8fa3b8"
            style={styles.input}
            value={email}
          />
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>The worker will receive a temporary password to log in. They should update it immediately.</Text>
          </View>
          <ActionButton label={loading ? 'Resetting...' : 'Reset Password'} onPress={handleReset} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  pageTitle: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 4 },
  pageSub: { color: '#8fa3b8', fontSize: 13, fontWeight: '600', marginBottom: 20 },
  card: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, padding: 16 },
  cardTitle: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 12 },
  input: { backgroundColor: '#f4f6f8', borderColor: '#e5e9ef', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 14, marginBottom: 12, minHeight: 44, paddingHorizontal: 12 },
  infoBox: { backgroundColor: '#f0f4ff', borderColor: '#c7d4f0', borderRadius: 8, borderWidth: 1, marginBottom: 14, padding: 12 },
  infoText: { color: '#4a6fa5', fontSize: 12, fontWeight: '600' },
  successCard: { backgroundColor: '#f0fdf4', borderColor: '#86efac', borderRadius: 12, borderWidth: 1, padding: 20 },
  successTitle: { color: '#15803d', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  successSub: { color: '#4ade80', fontSize: 13, fontWeight: '600', marginBottom: 16 },
  credentialRow: { borderTopColor: '#d1fae5', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  credentialLabel: { color: '#5d6875', fontSize: 13, fontWeight: '700' },
  credentialValue: { color: '#17212b', fontSize: 13, fontWeight: '700' },
  credentialValueBold: { color: '#15803d', fontSize: 15, fontWeight: '900' },
  warningBox: { backgroundColor: '#fffbeb', borderColor: '#d29922', borderRadius: 8, borderWidth: 1, marginBottom: 16, marginTop: 8, padding: 12 },
  warningText: { color: '#a15c00', fontSize: 12, fontWeight: '700' },
});

