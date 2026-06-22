import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { SosButton } from '../../components/SosButton';
import { getNotices, getSiteHazardAlerts } from '../../services/api';
import type { HazardReport, Notice } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

const SEVERITY_COLOR: Record<string, string> = {
  Critical: '#7f1d1d',
  High: '#b42318',
  Medium: '#a15c00',
  Low: '#1f6f5b',
};

export function WorkerHomeScreen({ session }: Props) {
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getSiteHazardAlerts(), getNotices()])
      .then(([h, n]) => { setHazards(h); setNotices(n); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Compact hero */}
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <Text style={styles.greeting}>{greeting}, {session.user.fullName.split(' ')[0]}</Text>
            <Text style={styles.site}>{session.user.assignedSite ?? 'Obuasi Mine'}</Text>
          </View>
          <View style={styles.shiftBadge}>
            <View style={styles.shiftDot} />
            <Text style={styles.shiftText}>On Shift</Text>
          </View>
        </View>

        {/* Status strip */}
        <View style={styles.strip}>
          <View style={styles.stripItem}>
            <Text style={[styles.stripValue, hazards.length > 0 && { color: '#b42318' }]}>{hazards.length}</Text>
            <Text style={styles.stripLabel}>Alerts</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripValue}>{notices.length}</Text>
            <Text style={styles.stripLabel}>Notices</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={[styles.stripValue, { color: '#1f6f5b' }]}>Active</Text>
            <Text style={styles.stripLabel}>Site Status</Text>
          </View>
        </View>

        {/* Alerts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Site Alerts</Text>
            {hazards.length > 0 && (
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>{hazards.length}</Text>
              </View>
            )}
          </View>

          {loading ? (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>Loading...</Text></View>
          ) : hazards.length === 0 ? (
            <View style={styles.clearCard}>
              <Text style={styles.clearIcon}>✓</Text>
              <View>
                <Text style={styles.clearTitle}>All Clear</Text>
                <Text style={styles.clearSub}>No active hazards on site</Text>
              </View>
            </View>
          ) : (
            hazards.slice(0, 5).map((h) => (
              <View key={h.id} style={styles.alertCard}>
                <View style={[styles.severityBar, { backgroundColor: SEVERITY_COLOR[h.severity ?? 'Medium'] ?? '#a15c00' }]} />
                <View style={styles.alertBody}>
                  <Text style={styles.alertType}>{h.hazardType}</Text>
                  <Text style={styles.alertLocation}>{h.location} · {h.status}</Text>
                </View>
                <View style={[styles.severityPill, { backgroundColor: SEVERITY_COLOR[h.severity ?? 'Medium'] ?? '#a15c00' }]}>
                  <Text style={styles.severityPillText}>{h.severity ?? 'Med'}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Notices */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notices</Text>
          {!loading && notices.length === 0 ? (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>No notices posted</Text></View>
          ) : null}
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

      </ScrollView>
      <SosButton role={session.user.role} user={session.user} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f0f2f5' },
  container: { paddingBottom: 110 },

  hero: {
    alignItems: 'center',
    backgroundColor: '#17212b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  heroLeft: {},
  greeting: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  site: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  shiftBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  shiftDot: { backgroundColor: '#4ade80', borderRadius: 4, height: 7, width: 7 },
  shiftText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  strip: { backgroundColor: '#ffffff', borderBottomColor: '#e5e9ef', borderBottomWidth: 1, flexDirection: 'row', paddingVertical: 12 },
  stripItem: { alignItems: 'center', flex: 1 },
  stripValue: { color: '#17212b', fontSize: 18, fontWeight: '900' },
  stripLabel: { color: '#8fa3b8', fontSize: 10, fontWeight: '700', marginTop: 1, textTransform: 'uppercase' },
  stripDivider: { backgroundColor: '#e5e9ef', width: 1 },

  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 10 },
  sectionTitle: { color: '#17212b', flex: 1, fontSize: 15, fontWeight: '900', letterSpacing: -0.2 },
  alertBadge: { backgroundColor: '#b42318', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  alertBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },

  clearCard: { alignItems: 'center', backgroundColor: '#f0fdf4', borderColor: '#86efac', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  clearIcon: { color: '#16a34a', fontSize: 22 },
  clearTitle: { color: '#15803d', fontSize: 14, fontWeight: '900' },
  clearSub: { color: '#4ade80', fontSize: 12, fontWeight: '600', marginTop: 1 },

  emptyCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, padding: 14 },
  emptyText: { color: '#8fa3b8', fontSize: 13, fontWeight: '600' },

  alertCard: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, overflow: 'hidden' },
  severityBar: { alignSelf: 'stretch', width: 4 },
  alertBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  alertType: { color: '#17212b', fontSize: 13, fontWeight: '900', marginBottom: 2 },
  alertLocation: { color: '#8fa3b8', fontSize: 12, fontWeight: '600' },
  severityPill: { borderRadius: 6, marginRight: 12, paddingHorizontal: 8, paddingVertical: 3 },
  severityPillText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },

  noticeCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, flexDirection: 'row', marginBottom: 8, overflow: 'hidden' },
  noticeAccent: { backgroundColor: '#1f6f5b', width: 3 },
  noticeBody: { flex: 1, padding: 12 },
  noticeTitle: { color: '#17212b', fontSize: 13, fontWeight: '900', marginBottom: 3 },
  noticeMeta: { color: '#5d6875', fontSize: 12, fontWeight: '600', lineHeight: 17 },
});