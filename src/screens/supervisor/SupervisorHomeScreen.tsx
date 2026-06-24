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
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    getSiteHazardAlerts().then(setHazards).catch(() => setConnectionError(true));
    getNotices().then(setNotices).catch(() => setConnectionError(true));
  }, []);

  async function handleRenew() {
    if (!guestEmail.trim()) { Alert.alert('Missing email', 'Enter the guest email address.'); return; }
    setRenewing(true);
    try {
      const result = await renewGuestSession(guestEmail.trim(), parseInt(guestHours) || 24);
      setGuestEmail('');
      Alert.alert('Access renewed', `${result.fullName} can access the site for ${result.hoursGranted} more hours.`);
    } catch (error: any) {
      const msg = error?.message ?? '';
      if (msg.includes('404')) Alert.alert('Not found', 'No guest account found with that email.');
      else if (msg.includes('400')) Alert.alert('Not a guest', 'That account is not a guest account.');
      else Alert.alert('Action failed', 'Could not renew guest session.');
    } finally { setRenewing(false); }
  }

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View>
            <Text style={styles.greeting}>Operations Overview</Text>
            <Text style={styles.site}>{session.user.assignedSite ?? 'Obuasi Mine'}</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Live</Text>
          </View>
        </View>
        {connectionError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠ Cannot reach server — check your connection</Text>
          </View>
        ) : null}

        {/* Stats */}
        <View style={styles.strip}>
          <View style={styles.stripItem}>
            <Text style={[styles.stripValue, hazards.length > 0 && { color: '#b42318' }]}>{hazards.length}</Text>
            <Text style={styles.stripLabel}>Active Alerts</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripValue}>{notices.length}</Text>
            <Text style={styles.stripLabel}>Notices</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={[styles.stripValue, { color: '#1f6f5b' }]}>Active</Text>
            <Text style={styles.stripLabel}>Site</Text>
          </View>
        </View>

        {/* Alerts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Hazards</Text>
            {hazards.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{hazards.length}</Text></View>}
          </View>
          {hazards.length === 0 ? (
            <View style={styles.clearCard}>
              <Text style={styles.clearIcon}>✓</Text>
              <View>
                <Text style={styles.clearTitle}>All Clear</Text>
                <Text style={styles.clearSub}>No active hazards</Text>
              </View>
            </View>
          ) : hazards.map((h) => (
            <View key={h.id} style={styles.alertCard}>
              <View style={[styles.alertBar, { backgroundColor: h.severity === 'Critical' ? '#7f1d1d' : h.severity === 'High' ? '#b42318' : '#a15c00' }]} />
              <View style={styles.alertBody}>
                <Text style={styles.alertType}>{h.hazardType}</Text>
                <Text style={styles.alertMeta}>{h.location} · {h.reportedByName}</Text>
              </View>
              <Text style={styles.alertStatus}>{h.status}</Text>
            </View>
          ))}
        </View>

        {/* Notices */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Notices</Text>
          {notices.slice(0, 3).map((n) => (
            <View key={n.id} style={styles.noticeCard}>
              <View style={styles.noticeAccent} />
              <View style={styles.noticeBody}>
                <Text style={styles.noticeTitle}>{n.title}</Text>
                <Text style={styles.noticeMeta}>{n.message}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Guest Access */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guest Access</Text>
          <View style={styles.guestCard}>
            <Text style={styles.guestLabel}>Renew guest session</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setGuestEmail}
              placeholder="Guest email address"
              placeholderTextColor="#8fa3b8"
              style={styles.input}
              value={guestEmail}
            />
            <View style={styles.hoursRow}>
              {['8', '24', '48', '72'].map((h) => (
                <Text
                  key={h}
                  onPress={() => setGuestHours(h)}
                  style={[styles.hoursPill, guestHours === h && styles.hoursPillActive]}
                >
                  {h}h
                </Text>
              ))}
            </View>
            <ActionButton label={renewing ? 'Renewing...' : `Renew ${guestHours}h Access`} onPress={handleRenew} />
          </View>
        </View>

      </ScrollView>
      <SosButton role={session.user.role} user={session.user} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f0f2f5' },
  container: { paddingBottom: 110 },
  hero: { alignItems: 'center', backgroundColor: '#17212b', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  greeting: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  site: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  statusBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  statusDot: { backgroundColor: '#4ade80', borderRadius: 4, height: 7, width: 7 },
  statusText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  strip: { backgroundColor: '#ffffff', borderBottomColor: '#e5e9ef', borderBottomWidth: 1, flexDirection: 'row', paddingVertical: 12 },
  stripItem: { alignItems: 'center', flex: 1 },
  stripValue: { color: '#17212b', fontSize: 18, fontWeight: '900' },
  stripLabel: { color: '#8fa3b8', fontSize: 10, fontWeight: '700', marginTop: 1, textTransform: 'uppercase' },
  stripDivider: { backgroundColor: '#e5e9ef', width: 1 },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 10 },
  sectionTitle: { color: '#17212b', flex: 1, fontSize: 15, fontWeight: '900' },
  badge: { backgroundColor: '#b42318', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  clearCard: { alignItems: 'center', backgroundColor: '#f0fdf4', borderColor: '#86efac', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  clearIcon: { color: '#16a34a', fontSize: 22 },
  clearTitle: { color: '#15803d', fontSize: 14, fontWeight: '900' },
  clearSub: { color: '#4ade80', fontSize: 12, fontWeight: '600', marginTop: 1 },
  alertCard: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, flexDirection: 'row', marginBottom: 8, overflow: 'hidden' },
  alertBar: { alignSelf: 'stretch', width: 4 },
  alertBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  alertType: { color: '#17212b', fontSize: 13, fontWeight: '900', marginBottom: 2 },
  alertMeta: { color: '#8fa3b8', fontSize: 12, fontWeight: '600' },
  alertStatus: { color: '#5d6875', fontSize: 11, fontWeight: '800', marginRight: 12, textTransform: 'uppercase' },
  noticeCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, flexDirection: 'row', marginBottom: 8, overflow: 'hidden' },
  noticeAccent: { backgroundColor: '#1f6f5b', width: 3 },
  noticeBody: { flex: 1, padding: 12 },
  noticeTitle: { color: '#17212b', fontSize: 13, fontWeight: '900', marginBottom: 3 },
  noticeMeta: { color: '#5d6875', fontSize: 12, fontWeight: '600', lineHeight: 17 },
  guestCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, padding: 14 },
  guestLabel: { color: '#17212b', fontSize: 13, fontWeight: '800', marginBottom: 10 },
  input: { backgroundColor: '#f4f6f8', borderColor: '#e5e9ef', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 14, marginBottom: 10, minHeight: 42, paddingHorizontal: 12 },
  hoursRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  hoursPill: { borderColor: '#e5e9ef', borderRadius: 20, borderWidth: 1, color: '#5d6875', fontSize: 12, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 6 },
  hoursPillActive: { backgroundColor: '#17212b', borderColor: '#17212b', color: '#ffffff' },

  errorBanner: { backgroundColor: '#fff5f5', borderColor: '#f5c6c6', borderRadius: 8, borderWidth: 1, margin: 20, marginBottom: 0, padding: 12 },
errorBannerText: { color: '#b42318', fontSize: 13, fontWeight: '700', textAlign: 'center' },
});

