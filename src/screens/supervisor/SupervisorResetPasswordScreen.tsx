import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { resetUserPassword, suspendUser } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

export function SupervisorResetPasswordScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ email: string; fullName: string; temporaryPassword: string } | null>(null);
  const [suspendEmail, setSuspendEmail] = useState('');
  const [suspending, setSuspending] = useState(false);

  async function handleReset() {
    if (!email.trim()) { Alert.alert('Missing email', 'Enter the user email address.'); return; }
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

  async function handleSuspend(suspend: boolean) {
    if (!suspendEmail.trim()) { Alert.alert('Missing email', 'Enter the user email address.'); return; }
    setSuspending(true);
    try {
      const res = await suspendUser(suspendEmail.trim().toLowerCase(), suspend);
      setSuspendEmail('');
      Alert.alert(
        suspend ? 'Account suspended' : 'Account reinstated',
        `${res.fullName} has been ${suspend ? 'suspended' : 'reinstated'}.`
      );
    } catch (error: any) {
      const msg = error?.message ?? '';
      if (msg.includes('404')) Alert.alert('Not found', 'No account found with that email.');
      else if (msg.includes('403')) Alert.alert('Not allowed', 'Cannot suspend supervisors or safety officers.');
      else Alert.alert('Failed', 'Could not update account status.');
    } finally { setSuspending(false); }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>Reset Password</Text>
        <Text style={styles.pageSub}>Generate a temporary password for a worker, buyer, or government user who has been locked out</Text>

        {result ? (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>✓ Password Reset</Text>
            <Text style={styles.successSub}>Share this temporary password with the user</Text>
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
            <Text style={styles.cardTitle}>User Email</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="user@example.com"
              placeholderTextColor={theme.textMuted}
              style={styles.input}
              value={email}
            />
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>The user will receive a temporary password to log in. They should update it immediately.</Text>
            </View>
            <ActionButton label={loading ? 'Resetting...' : 'Reset Password'} onPress={handleReset} disabled={loading} />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Suspend / Reinstate Account</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setSuspendEmail}
            placeholder="user@example.com"
            placeholderTextColor={theme.textMuted}
            style={styles.input}
            value={suspendEmail}
          />
          <View style={styles.suspendRow}>
            <Pressable
              disabled={suspending}
              onPress={() => Alert.alert(
                'Suspend account?',
                'This will prevent the user from logging in. You can reinstate them at any time.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Suspend', style: 'destructive', onPress: () => handleSuspend(true) },
                ]
              )}
              style={[styles.suspendBtn, styles.suspendBtnRed, suspending && { opacity: 0.6 }]}>
              <Text style={styles.suspendBtnText}>{suspending ? '...' : 'Suspend'}</Text>
            </Pressable>
            <Pressable
              disabled={suspending}
              onPress={() => handleSuspend(false)}
              style={[styles.suspendBtn, styles.suspendBtnGreen, suspending && { opacity: 0.6 }]}>
              <Text style={styles.suspendBtnText}>{suspending ? '...' : 'Reinstate'}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 40 },
    pageTitle: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 4 },
    pageSub: { color: theme.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 20 },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
    cardTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 12 },
    input: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, marginBottom: 12, minHeight: 44, paddingHorizontal: 12 },
    infoBox: { backgroundColor: theme.infoLight, borderColor: theme.info, borderRadius: 8, borderWidth: 1, marginBottom: 14, padding: 12 },
    infoText: { color: theme.info, fontSize: 12, fontWeight: '600' },
    successCard: { backgroundColor: theme.successLight, borderColor: theme.success, borderRadius: 12, borderWidth: 1, padding: 20, marginBottom: 16 },
    successTitle: { color: theme.success, fontSize: 18, fontWeight: '900', marginBottom: 4 },
    successSub: { color: theme.success, fontSize: 13, fontWeight: '600', marginBottom: 16 },
    credentialRow: { borderTopColor: theme.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
    credentialLabel: { color: theme.textSub, fontSize: 13, fontWeight: '700' },
    credentialValue: { color: theme.text, fontSize: 13, fontWeight: '700' },
    credentialValueBold: { color: theme.success, fontSize: 15, fontWeight: '900' },
    warningBox: { backgroundColor: theme.amberLight, borderColor: theme.amber, borderRadius: 8, borderWidth: 1, marginBottom: 16, marginTop: 8, padding: 12 },
    warningText: { color: theme.amber, fontSize: 12, fontWeight: '700' },
    suspendRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    suspendBtn: { alignItems: 'center', borderRadius: 8, flex: 1, paddingVertical: 12 },
    suspendBtnRed: { backgroundColor: theme.danger },
    suspendBtnGreen: { backgroundColor: theme.accent },
    suspendBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  });
}
