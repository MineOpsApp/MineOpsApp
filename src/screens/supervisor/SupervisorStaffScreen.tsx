import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ActionButton } from '../../components/ActionButton';
import { createStaffAccount } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type StaffRole = 'supervisor' | 'safetyOfficer';

const STAFF_ROLES: { id: StaffRole; label: string; description: string; color: string }[] = [
  { id: 'supervisor', label: 'Supervisor', description: 'Manages site operations, workers, approvals, and pay', color: '#b8722e' },
  { id: 'safetyOfficer', label: 'Safety Officer', description: 'Oversees site safety, hazards, zones, and compliance', color: '#1d5f99' },
];

const SITES = ['Obuasi Mine', 'Tarkwa Mine', 'Bogoso Mine', 'Prestea Mine'];

type Props = { session: AuthSession };

export function SupervisorStaffScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('supervisor');
  const [site, setSite] = useState(session.user.assignedSite ?? 'Obuasi Mine');
  const [loading, setLoading] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<{
    email: string; password: string; fullName: string; role: StaffRole; site: string;
  } | null>(null);

  async function handleCreate() {
    if (!fullName.trim()) { Alert.alert('Missing info', 'Enter the full name.'); return; }
    if (!email.trim()) { Alert.alert('Missing info', 'Enter the email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { Alert.alert('Invalid email', 'Enter a valid email address.'); return; }
    setLoading(true);
    try {
      const tempPassword = `Staff${Math.random().toString(36).slice(2, 8).toUpperCase()}!`;
      await createStaffAccount({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: tempPassword,
        role,
        assignedSite: site,
      });
      setCreatedAccount({ email: email.trim().toLowerCase(), password: tempPassword, fullName: fullName.trim(), role, site });
      setFullName('');
      setEmail('');
    } catch (error: any) {
      const msg = error?.message ?? '';
      if (msg.includes('409')) Alert.alert('Email taken', 'An account with this email already exists.');
      else Alert.alert('Failed', 'Could not create staff account.');
    } finally { setLoading(false); }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Staff Accounts</Text>
      <Text style={styles.pageSub}>Create supervisor and safety officer accounts for your site</Text>

      {createdAccount ? (
        <View style={styles.successCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="checkmark-circle" size={16} color={styles.successTitle.color} />
            <Text style={styles.successTitle}>Account Created</Text>
          </View>
          <Text style={styles.successSub}>Share these credentials with the new staff member</Text>
          <View style={styles.credentialRow}>
            <Text style={styles.credentialLabel}>Name</Text>
            <Text style={styles.credentialValue}>{createdAccount.fullName}</Text>
          </View>
          <View style={styles.credentialRow}>
            <Text style={styles.credentialLabel}>Email</Text>
            <Text style={styles.credentialValue}>{createdAccount.email}</Text>
          </View>
          <View style={styles.credentialRow}>
            <Text style={styles.credentialLabel}>Password</Text>
            <Text style={styles.credentialValueBold}>{createdAccount.password}</Text>
          </View>
          <View style={styles.credentialRow}>
            <Text style={styles.credentialLabel}>Role</Text>
            <Text style={styles.credentialValue}>{createdAccount.role === 'safetyOfficer' ? 'Safety Officer' : 'Supervisor'}</Text>
          </View>
          <View style={styles.credentialRow}>
            <Text style={styles.credentialLabel}>Site</Text>
            <Text style={styles.credentialValue}>{createdAccount.site}</Text>
          </View>
          <ActionButton label="Create Another" onPress={() => setCreatedAccount(null)} />
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Staff Details</Text>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              autoCapitalize="words"
              onChangeText={setFullName}
              placeholder="Staff full name"
              placeholderTextColor={theme.textMuted}
              style={styles.input}
              value={fullName}
            />
            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="staff@mineops.com"
              placeholderTextColor={theme.textMuted}
              style={styles.input}
              value={email}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Role</Text>
            {STAFF_ROLES.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => setRole(r.id)}
                style={[styles.typeRow, role === r.id && { borderColor: r.color, backgroundColor: `${r.color}11` }]}
              >
                <View style={styles.typeBody}>
                  <Text style={[styles.typeLabel, role === r.id && { color: r.color }]}>{r.label}</Text>
                  <Text style={styles.typeDesc}>{r.description}</Text>
                </View>
                <View style={[styles.typeRadio, role === r.id && { backgroundColor: r.color, borderColor: r.color }]}>
                  {role === r.id ? <Ionicons name="checkmark" size={13} color={styles.typeRadioCheck.color} /> : null}
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Assigned Site</Text>
            <View style={styles.pillRow}>
              {SITES.map((s) => (
                <Pressable key={s} onPress={() => setSite(s)} style={[styles.pill, site === s && styles.pillActive]}>
                  <Text style={[styles.pillText, site === s && styles.pillActiveText]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <ActionButton label={loading ? 'Creating...' : 'Create Staff Account'} onPress={handleCreate} disabled={loading} />
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 40 },
    pageTitle: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 4 },
    pageSub: { color: theme.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 20 },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 16 },
    cardTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
    fieldLabel: { color: theme.textSub, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6, marginTop: 4, textTransform: 'uppercase' },
    input: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, marginBottom: 12, minHeight: 44, paddingHorizontal: 12 },
    typeRow: { alignItems: 'center', borderColor: theme.border, borderRadius: 10, borderWidth: 1.5, flexDirection: 'row', marginBottom: 8, padding: 12 },
    typeBody: { flex: 1 },
    typeLabel: { color: theme.text, fontSize: 14, fontWeight: '800', marginBottom: 2 },
    typeDesc: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
    typeRadio: { alignItems: 'center', borderColor: theme.border, borderRadius: 12, borderWidth: 2, height: 24, justifyContent: 'center', width: 24 },
    typeRadioCheck: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: { borderColor: theme.border, borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
    pillActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    pillText: { color: theme.textMuted, fontSize: 12, fontWeight: '800' },
    pillActiveText: { color: '#ffffff' },
    successCard: { backgroundColor: theme.successLight, borderColor: theme.success, borderRadius: 12, borderWidth: 1, padding: 20 },
    successTitle: { color: theme.success, fontSize: 18, fontWeight: '900', marginBottom: 4 },
    successSub: { color: theme.success, fontSize: 13, fontWeight: '600', marginBottom: 16 },
    credentialRow: { borderTopColor: theme.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
    credentialLabel: { color: theme.textSub, fontSize: 13, fontWeight: '700' },
    credentialValue: { color: theme.text, fontSize: 13, fontWeight: '700' },
    credentialValueBold: { color: theme.success, fontSize: 15, fontWeight: '900' },
  });
}
