import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { SosButton } from '../../components/SosButton';
import { ActionButton } from '../../components/ActionButton';
import { getSiteHazardAlerts, getNotices, renewGuestSession } from '../../services/api';
import type { HazardReport, Notice } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

export function SupervisorHomeScreen({ session }: Props) {
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestHours, setGuestHours] = useState('24');
  const [renewing, setRenewing] = useState(false);

  useEffect(() => {
    getSiteHazardAlerts().then(setHazards).catch(() => {});
    getNotices().then(setNotices).catch(() => {});
  }, []);

  async function handleRenew() {
    if (!guestEmail.trim()) { Alert.alert('Missing email', 'Enter the guest email address.'); return; }
    setRenewing(true);
    try {
      const result = await renewGuestSession(guestEmail.trim(), parseInt(guestHours) || 24);
      setGuestEmail('');
      Alert.alert(
        'Access renewed',
        `${result.fullName} (${result.email}) can now access the site for ${result.hoursGranted} more hours.\nExpires: ${new Date(result.sessionExpiresAt).toLocaleString()}`
      );
    } catch (error: any) {
      const msg = error?.message ?? '';
      if (msg.includes('404')) {
        Alert.alert('Not found', 'No guest account found with that email.');
      } else if (msg.includes('400')) {
        Alert.alert('Not a guest', 'That account is not a guest account.');
      } else {
        Alert.alert('Action failed', 'Could not renew guest session.');
      }
    } finally {
      setRenewing(false);
    }
  }

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Operations</Text>
        <Text style={styles.subtitle}>{session.user.fullName} · Supervisor</Text>

        <Text style={styles.sectionTitle}>Active Site Alerts</Text>
        {hazards.length === 0 ? (
          <View style={styles.card}><Text style={styles.meta}>No active hazards</Text></View>
        ) : null}
        {hazards.map((h) => (
          <View key={h.id} style={styles.alertCard}>
            <Text style={styles.alertTitle}>{h.hazardType} — {h.location}</Text>
            <Text style={styles.meta}>{h.status} · {h.site}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Recent Notices</Text>
        {notices.slice(0, 3).map((n) => (
          <View key={n.id} style={styles.card}>
            <Text style={styles.cardTitle}>{n.title}</Text>
            <Text style={styles.meta}>{n.message}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Guest Access</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Renew Guest Session</Text>
          <Text style={styles.meta}>Extend a guest's access by entering their email address.</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setGuestEmail}
            placeholder="Guest email address"
            style={styles.input}
            value={guestEmail}
          />
          <View style={styles.hoursRow}>
            {[8, 24, 48, 72].map((h) => (
              <Text
                key={h}
                onPress={() => setGuestHours(String(h))}
                style={[styles.hoursPill, guestHours === String(h) && styles.hoursPillActive]}
              >
                {h}h
              </Text>
            ))}
          </View>
          <ActionButton
            label={renewing ? 'Renewing...' : `Renew Access (${guestHours}h)`}
            onPress={handleRenew}
          />
        </View>
      </ScrollView>
      <SosButton role={session.user.role} user={session.user} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f4f6f8' },
  container: { padding: 20, paddingBottom: 100 },
  title: { color: '#17212b', fontSize: 26, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#5d6875', fontSize: 14, fontWeight: '700', marginBottom: 20 },
  sectionTitle: { color: '#17212b', fontSize: 18, fontWeight: '800', marginBottom: 10, marginTop: 8 },
  card: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  alertCard: { backgroundColor: '#fff5f5', borderColor: '#f5c6c6', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  cardTitle: { color: '#17212b', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  alertTitle: { color: '#b42318', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  meta: { color: '#5d6875', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#f4f6f8', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 14, marginBottom: 10, marginTop: 8, minHeight: 44, paddingHorizontal: 12 },
  hoursRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  hoursPill: { borderColor: '#dde3ea', borderRadius: 20, borderWidth: 1, color: '#5d6875', fontSize: 13, fontWeight: '800', paddingHorizontal: 14, paddingVertical: 6, overflow: 'hidden' },
  hoursPillActive: { backgroundColor: '#17212b', borderColor: '#17212b', color: '#ffffff' },
});