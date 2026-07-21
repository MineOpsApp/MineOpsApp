import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { createGuestAccount, renewGuestSession, getGuestList } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, spacing, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type GuestType = 'visitor';
type ActiveTab = 'create' | 'renew' | 'list';

const GUEST_TYPES: { id: GuestType; label: string; icon: string; description: string; color: string }[] = [
  { id: 'visitor', label: 'Visitor', icon: 'person-outline', description: 'General site visit or contractor', color: '#1f6f5b' },
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
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

  const [activeTab, setActiveTab] = useState<ActiveTab>('create');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [guestType, setGuestType] = useState<GuestType>('visitor');
  const [site, setSite] = useState(session.user.assignedSite ?? 'Obuasi Mine');
  const [duration, setDuration] = useState(24);
  const [loading, setLoading] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<{ email: string; password: string; fullName: string; guestType: string; expiresIn: string } | null>(null);
  const [guests, setGuests] = useState<any[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);

  const [renewEmail, setRenewEmail] = useState('');
  const [renewHours, setRenewHours] = useState(24);
  const [renewing, setRenewing] = useState(false);

  async function createGuest() {
    if (!fullName.trim()) { Alert.alert('Missing info', 'Enter the guest full name.'); return; }
    if (!email.trim()) { Alert.alert('Missing info', 'Enter the guest email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { Alert.alert('Invalid email', 'Enter a valid email address.'); return; }
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

  async function loadGuests() {
    setLoadingGuests(true);
    try {
      setGuests(await getGuestList());
    } catch {
      Alert.alert('Connection error', 'Could not load guest list. Pull to retry.');
    } finally {
      setLoadingGuests(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Guest Access</Text>

      <View style={styles.tabRow}>
        <Pressable onPress={() => setActiveTab('create')} style={[styles.tab, activeTab === 'create' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>Create Account</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab('renew')} style={[styles.tab, activeTab === 'renew' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === 'renew' && styles.tabTextActive]}>Renew Access</Text>
        </Pressable>
        <Pressable onPress={() => { setActiveTab('list'); loadGuests(); }} style={[styles.tab, activeTab === 'list' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>Guest List</Text>
        </Pressable>
      </View>

      {activeTab === 'create' ? (
        <>
          {createdAccount ? (
            <View style={styles.successCard}>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                <Text style={styles.successTitle}>Account Created</Text>
              </View>
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
                <TextInput autoCapitalize="words" onChangeText={setFullName} placeholder="Guest full name" placeholderTextColor={theme.textMuted} style={styles.input} value={fullName} />
                <Text style={styles.fieldLabel}>Email Address</Text>
                <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="guest@example.com" placeholderTextColor={theme.textMuted} style={styles.input} value={email} />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Visit Type</Text>
                {GUEST_TYPES.map((gt) => (
                  <Pressable key={gt.id} onPress={() => setGuestType(gt.id)} style={[styles.typeRow, guestType === gt.id && { borderColor: gt.color, backgroundColor: `${gt.color}11` }]}>
                    <Ionicons name={gt.icon as any} size={22} color={gt.color} style={{ marginRight: 12 }} />
                    <View style={styles.typeBody}>
                      <Text style={[styles.typeLabel, guestType === gt.id && { color: gt.color }]}>{gt.label}</Text>
                      <Text style={styles.typeDesc}>{gt.description}</Text>
                    </View>
                    <View style={[styles.typeRadio, guestType === gt.id && { backgroundColor: gt.color, borderColor: gt.color }]}>
                      {guestType === gt.id ? <Ionicons name="checkmark" size={12} color="#ffffff" /> : null}
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

              <ActionButton label={loading ? 'Creating...' : 'Create Guest Account'} onPress={createGuest} disabled={loading} />
            </>
          )}
        </>
      ) : activeTab === 'renew' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Renew Guest Session</Text>
          <Text style={styles.renewSub}>Extend access for a guest whose session has expired</Text>
          <Text style={styles.fieldLabel}>Guest Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setRenewEmail}
            placeholder="Guest email address"
            placeholderTextColor={theme.textMuted}
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
          <ActionButton label={renewing ? 'Renewing...' : `Renew ${renewHours}h Access`} onPress={handleRenew} disabled={renewing} />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Guests</Text>
          {loadingGuests ? (
            <Text style={styles.renewSub}>Loading...</Text>
          ) : guests.length === 0 ? (
            <Text style={styles.renewSub}>No guests on site</Text>
          ) : guests.map((g) => (
            <View key={g.id} style={styles.guestRow}>
              <View style={styles.guestLeft}>
                <Text style={styles.guestName}>{g.fullName}</Text>
                <Text style={styles.guestEmail}>{g.email}</Text>
                <Text style={styles.guestRole}>{g.guestSubRole ?? 'visitor'}</Text>
              </View>
              <View style={[styles.guestExpiry, g.expired ? styles.guestExpired : styles.guestActive]}>
                <Text style={styles.guestExpiryText}>{g.expired ? 'Expired' : 'Active'}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: Theme, isDark: boolean) {
  const cardShadow = {
    shadowColor: '#000' as const,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 4,
    elevation: 2,
  };
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: spacing.xl, paddingBottom: 40 },
    pageTitle: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: spacing.lg },
    tabRow: { backgroundColor: theme.bgInput, borderRadius: 10, flexDirection: 'row', marginBottom: spacing.xl, padding: 4 },
    tab: { alignItems: 'center', borderRadius: 8, flex: 1, paddingVertical: 10 },
    tabActive: { backgroundColor: theme.bgCard },
    tabText: { color: theme.textSub, fontSize: 13, fontWeight: '800' },
    tabTextActive: { color: theme.text },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.lg, ...cardShadow },
    cardTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
    renewSub: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 14 },
    fieldLabel: { color: theme.textSub, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6, marginTop: 4, textTransform: 'uppercase' },
    input: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, marginBottom: spacing.md, minHeight: 44, paddingHorizontal: spacing.md },
    typeRow: { alignItems: 'center', borderColor: theme.border, borderRadius: 10, borderWidth: 1.5, flexDirection: 'row', marginBottom: spacing.sm, padding: spacing.md },
    typeBody: { flex: 1 },
    typeLabel: { color: theme.text, fontSize: 14, fontWeight: '800', marginBottom: 2 },
    typeDesc: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
    typeRadio: { alignItems: 'center', borderColor: theme.border, borderRadius: 12, borderWidth: 2, height: 24, justifyContent: 'center', width: 24 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    pill: { borderColor: theme.border, borderRadius: 20, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 7 },
    pillActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    pillText: { color: theme.textMuted, fontSize: 12, fontWeight: '800' },
    pillActiveText: { color: '#ffffff' },
    durationRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: 14 },
    durationBtn: { alignItems: 'center', borderColor: theme.border, borderRadius: 8, borderWidth: 1, flex: 1, paddingVertical: 10 },
    durationBtnActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    durationText: { color: theme.textMuted, fontSize: 12, fontWeight: '800' },
    durationTextActive: { color: '#ffffff' },
    successCard: { backgroundColor: theme.successLight, borderColor: theme.success, borderRadius: 12, borderWidth: 1, padding: spacing.xl, ...cardShadow },
    successTitle: { color: theme.success, fontSize: 18, fontWeight: '900' },
    successSub: { color: theme.success, fontSize: 13, fontWeight: '600', marginBottom: spacing.lg },
    credentialRow: { borderTopColor: theme.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
    credentialLabel: { color: theme.textSub, fontSize: 13, fontWeight: '700' },
    credentialValue: { color: theme.text, fontSize: 13, fontWeight: '700' },
    credentialValueBold: { color: theme.success, fontSize: 15, fontWeight: '900' },
    guestRow: { borderTopColor: theme.bgInput, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
    guestLeft: { flex: 1 },
    guestName: { color: theme.text, fontSize: 13, fontWeight: '800', marginBottom: 2 },
    guestEmail: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 2 },
    guestRole: { color: theme.textSub, fontSize: 11, fontWeight: '700' },
    guestExpiry: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 4 },
    guestActive: { backgroundColor: theme.accentLight },
    guestExpired: { backgroundColor: theme.dangerLight },
    guestExpiryText: { color: theme.textSub, fontSize: 11, fontWeight: '800' },
  });
}
