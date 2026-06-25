import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { createGuestAccount, renewGuestSession } from '../../services/api';
import type { AuthSession } from '../../types/auth';

type GuestType = 'visitor' | 'inspector' | 'investor';
type ActiveTab = 'create' | 'renew';

const GUEST_TYPES: { id: GuestType; label: string; icon: string; description: string; color: string }[] = [
  { id: 'visitor', label: 'Visitor', icon: '👤', description: 'General site visit or contractor', color: '#1f6f5b' },
  { id: 'inspector', label: 'Regulatory Inspector', icon: '🔍', description: 'Government or regulatory inspection', color: '#1d5f99' },
  { id: 'investor', label: 'Investor', icon: '📊', description: 'Business review or due diligence', color: '#a15c00' },
];

const SITES = ['Obuasi Mine', 'Tarkwa Mine', 'Bogoso Mine', 'Prestea Mine'];
const DURATIONS = [
  { hours: 8, label: '8h' },
  { hours: 24, label: '1 day' },
  { hours: 48, label: '2 days' },
  { hours: 72, label: '3 days' },
];

type Props = { session: AuthSession };

export function SupervisorGuestScreen({ session }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('create');

  // Create state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [guestType, setGuestType] = useState<GuestType>('visitor');
  const [site, setSite] = useState(session.user.assignedSite ?? 'Obuasi Mine');
  const [duration, setDuration] = useState(24);
  const [loading, setLoading] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<{ email: string; password: string; fullName: string; guestType: string; expiresIn: string } | null>(null);

  // Renew state
  const [renewEmail, setRenewEmail] = useState('');
  const [renewHours, setRenewHours] = useState(24);
  const [renewing, setRenewing] = useState(false);

  async function createGuest() {
    if (!fullName.trim()) { Alert.alert('Missing info', 'Enter the guest full name.'); return; }
    if (!email.trim()) { Alert.alert('Missing info', 'Enter the guest email address.'); return; }
    setLoading(true);
    try {
      const tempPassword = `Guest${Math.random().toString(36).slice(2, 8).toUpperCase()}!`;
      await createGuestAccount({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: tempPassword,
        guestSubRole: guestType,
        assignedSite: site,
        sessionHours: duration,
        createdByEmail: session.user.email,
        createdByName: session.user.fullName,
      });
      setCreatedAccount({
        email: email.trim().toLowerCase(),
        password: tempPassword,
        fullName: fullName.trim(),
        guestType,
        expiresIn: `${duration} hours`,
      });
      setFullName('');
      setEmail('');
    } catch (error: any) {
      const msg = error?.message ?? '';
      if (msg.includes('409')) Alert.alert('Email taken', 'An account with this email already exists.');
      else Alert.alert('Failed', 'Could not create guest account.');
    } finally { setLoading(false); }
  }

  async function handleRenew() {
    if (!renewEmail.trim()) { Alert.alert('Missing email', 'Enter the guest email address.'); return; }
    setRenewing(true);
    try {
      const result = await renewGuestSession(renewEmail.trim(), renewHours);
      setRenewEmail('');
      Alert.alert('Access renewed', `${result.fullName} can access the site for ${result.hoursGranted} more hours.`);
    } catch (error: any) {
      const msg = error?.message ?? '';
      if (msg.includes('404')) Alert.alert('Not found', 'No guest account found with that email.');
      else if (msg.includes('400')) Alert.alert('Not a guest', 'That account is not a guest account.');
      else Alert.alert('Failed', 'Could not renew guest session.');
    } finally { setRenewing(false); }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Guest Access</Text>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        <Pressable onPress={() => setActiveTab('create')} style={[styles.tab, activeTab === 'create' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>Create Account</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab('renew')} style={[styles.tab, activeTab === 'renew' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === 'renew' && styles.tabTextActive]}>Renew Access</Text>
        </Pressable>
      </View>

      {activeTab === 'create' ? (
        <>
          {createdAccount ? (
            <View style={styles.successCard}>
              <Text style={styles.successTitle}>✓ Account Created</Text>
              <Text style={styles.successSub}>Share these credentials with the guest</Text>
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
                <Text style={styles.credentialLabel}>Type</Text>
                <Text style={styles.credentialValue}>{createdAccount.guestType}</Text>
              </View>
              <View style={styles.credentialRow}>
                <Text style={styles.credentialLabel}>Expires in</Text>
                <Text style={styles.credentialValue}>{createdAccount.expiresIn}</Text>
              </View>
              <ActionButton label="Create Another Guest" onPress={() => setCreatedAccount(null)} />
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Guest Details</Text>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput autoCapitalize="words" onChangeText={setFullName} placeholder="Guest full name" placeholderTextColor="#8fa3b8" style={styles.input} value={fullName} />
                <Text style={styles.fieldLabel}>Email Address</Text>
                <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="guest@example.com" placeholderTextColor="#8fa3b8" style={styles.input} value={email} />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Visit Type</Text>
                {GUEST_TYPES.map((gt) => (
                  <Pressable key={gt.id} onPress={() => setGuestType(gt.id)} style={[styles.typeRow, guestType === gt.id && { borderColor: gt.color, backgroundColor: `${gt.color}11` }]}>
                    <Text style={styles.typeIcon}>{gt.icon}</Text>
                    <View style={styles.typeBody}>
                      <Text style={[styles.typeLabel, guestType === gt.id && { color: gt.color }]}>{gt.label}</Text>
                      <Text style={styles.typeDesc}>{gt.description}</Text>
                    </View>
                    <View style={[styles.typeRadio, guestType === gt.id && { backgroundColor: gt.color, borderColor: gt.color }]}>
                      {guestType === gt.id ? <Text style={styles.typeRadioCheck}>✓</Text> : null}
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

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Access Duration</Text>
                <View style={styles.durationRow}>
                  {DURATIONS.map((d) => (
                    <Pressable key={d.hours} onPress={() => setDuration(d.hours)} style={[styles.durationBtn, duration === d.hours && styles.durationBtnActive]}>
                      <Text style={[styles.durationText, duration === d.hours && styles.durationTextActive]}>{d.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <ActionButton label={loading ? 'Creating...' : 'Create Guest Account'} onPress={createGuest} />
            </>
          )}
        </>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Renew Guest Session</Text>
          <Text style={styles.renewSub}>Extend access for a guest whose session has expired</Text>
          <Text style={styles.fieldLabel}>Guest Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setRenewEmail}
            placeholder="Guest email address"
            placeholderTextColor="#8fa3b8"
            style={styles.input}
            value={renewEmail}
          />
          <Text style={styles.fieldLabel}>Extend By</Text>
          <View style={styles.durationRow}>
            {DURATIONS.map((d) => (
              <Pressable key={d.hours} onPress={() => setRenewHours(d.hours)} style={[styles.durationBtn, renewHours === d.hours && styles.durationBtnActive]}>
                <Text style={[styles.durationText, renewHours === d.hours && styles.durationTextActive]}>{d.label}</Text>
              </Pressable>
            ))}
          </View>
          <ActionButton label={renewing ? 'Renewing...' : `Renew ${renewHours}h Access`} onPress={handleRenew} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  pageTitle: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 16 },
  tabRow: { backgroundColor: '#edf1f5', borderRadius: 10, flexDirection: 'row', marginBottom: 20, padding: 4 },
  tab: { alignItems: 'center', borderRadius: 8, flex: 1, paddingVertical: 10 },
  tabActive: { backgroundColor: '#ffffff' },
  tabText: { color: '#5d6875', fontSize: 13, fontWeight: '800' },
  tabTextActive: { color: '#17212b' },
  card: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 16 },
  cardTitle: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  renewSub: { color: '#8fa3b8', fontSize: 12, fontWeight: '600', marginBottom: 14 },
  fieldLabel: { color: '#5d6875', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6, marginTop: 4, textTransform: 'uppercase' },
  input: { backgroundColor: '#f4f6f8', borderColor: '#e5e9ef', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 14, marginBottom: 12, minHeight: 44, paddingHorizontal: 12 },
  typeRow: { alignItems: 'center', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1.5, flexDirection: 'row', marginBottom: 8, padding: 12 },
  typeIcon: { fontSize: 22, marginRight: 12 },
  typeBody: { flex: 1 },
  typeLabel: { color: '#17212b', fontSize: 14, fontWeight: '800', marginBottom: 2 },
  typeDesc: { color: '#8fa3b8', fontSize: 12, fontWeight: '600' },
  typeRadio: { alignItems: 'center', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 2, height: 24, justifyContent: 'center', width: 24 },
  typeRadioCheck: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderColor: '#e5e9ef', borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  pillActive: { backgroundColor: '#17212b', borderColor: '#17212b' },
  pillText: { color: '#8fa3b8', fontSize: 12, fontWeight: '800' },
  pillActiveText: { color: '#ffffff' },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  durationBtn: { alignItems: 'center', borderColor: '#e5e9ef', borderRadius: 8, borderWidth: 1, flex: 1, paddingVertical: 10 },
  durationBtnActive: { backgroundColor: '#17212b', borderColor: '#17212b' },
  durationText: { color: '#8fa3b8', fontSize: 12, fontWeight: '800' },
  durationTextActive: { color: '#ffffff' },
  successCard: { backgroundColor: '#f0fdf4', borderColor: '#86efac', borderRadius: 12, borderWidth: 1, padding: 20 },
  successTitle: { color: '#15803d', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  successSub: { color: '#4ade80', fontSize: 13, fontWeight: '600', marginBottom: 16 },
  credentialRow: { borderTopColor: '#d1fae5', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  credentialLabel: { color: '#5d6875', fontSize: 13, fontWeight: '700' },
  credentialValue: { color: '#17212b', fontSize: 13, fontWeight: '700' },
  credentialValueBold: { color: '#15803d', fontSize: 15, fontWeight: '900' },
});