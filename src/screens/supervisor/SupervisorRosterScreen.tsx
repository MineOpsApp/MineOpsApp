import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getSiteRoster } from '../../services/api';
import type { AuthSession } from '../../types/auth';

type AttendanceRecord = {
  id: number;
  workerName: string;
  workerEmail: string;
  workerRole: string;
  zone: string;
  site: string;
  clockInAt: string;
};

type Props = { session: AuthSession };

const ROLE_LABELS: Record<string, string> = {
  worker: 'Worker',
  supervisor: 'Supervisor',
  safetyOfficer: 'Safety Officer',
  guest: 'Guest',
};

export function SupervisorRosterScreen({ session: _ }: Props) {
  const [roster, setRoster] = useState<AttendanceRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  function load() { return getSiteRoster().then(setRoster).catch(() => {}); }
  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  function formatTime(dateStr: string) {
    try { return new Date(dateStr).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' }); }
    catch { return dateStr; }
  }

  function getDuration(clockIn: string) {
    const start = new Date(clockIn).getTime();
    const hours = Math.floor((Date.now() - start) / 3600000);
    const mins = Math.floor(((Date.now() - start) % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  }

  const byZone: Record<string, AttendanceRecord[]> = {};
  roster.forEach((r) => {
    if (!byZone[r.zone]) byZone[r.zone] = [];
    byZone[r.zone].push(r);
  });

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Site Roster</Text>
        <Text style={styles.pageSub}>Pull to refresh</Text>
      </View>

      {/* Headcount strip */}
      <View style={styles.strip}>
        <View style={styles.stripItem}>
          <Text style={styles.stripValue}>{roster.length}</Text>
          <Text style={styles.stripLabel}>On Site</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={styles.stripValue}>{roster.filter((r) => r.workerRole === 'worker').length}</Text>
          <Text style={styles.stripLabel}>Workers</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={styles.stripValue}>{Object.keys(byZone).length}</Text>
          <Text style={styles.stripLabel}>Zones Active</Text>
        </View>
      </View>

      {roster.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>👷</Text>
          <Text style={styles.emptyTitle}>No one on site</Text>
          <Text style={styles.emptySub}>Workers will appear here when they clock in</Text>
        </View>
      ) : null}

      {Object.entries(byZone).map(([zone, records]) => (
        <View key={zone} style={styles.zoneSection}>
          <View style={styles.zoneHeader}>
            <Text style={styles.zoneTitle}>📍 {zone}</Text>
            <View style={styles.zoneBadge}>
              <Text style={styles.zoneBadgeText}>{records.length}</Text>
            </View>
          </View>
          {records.map((r) => (
            <View key={r.id} style={styles.workerCard}>
              <View style={styles.workerLeft}>
                <View style={styles.workerAvatar}>
                  <Text style={styles.workerAvatarText}>{r.workerName.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.workerName}>{r.workerName}</Text>
                  <Text style={styles.workerRole}>{ROLE_LABELS[r.workerRole] ?? r.workerRole}</Text>
                </View>
              </View>
              <View style={styles.workerRight}>
                <Text style={styles.workerDuration}>{getDuration(r.clockInAt)}</Text>
                <Text style={styles.workerTime}>Since {formatTime(r.clockInAt)}</Text>
              </View>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  pageHeader: { marginBottom: 16 },
  pageTitle: { color: '#17212b', fontSize: 22, fontWeight: '900' },
  pageSub: { color: '#8fa3b8', fontSize: 11, fontWeight: '600', marginTop: 2 },
  strip: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 20, paddingVertical: 14 },
  stripItem: { alignItems: 'center', flex: 1 },
  stripValue: { color: '#17212b', fontSize: 24, fontWeight: '900' },
  stripLabel: { color: '#8fa3b8', fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  stripDivider: { backgroundColor: '#e5e9ef', width: 1 },
  emptyCard: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, padding: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  emptySub: { color: '#8fa3b8', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  zoneSection: { marginBottom: 16 },
  zoneHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 8 },
  zoneTitle: { color: '#17212b', flex: 1, fontSize: 14, fontWeight: '900' },
  zoneBadge: { backgroundColor: '#17212b', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  zoneBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  workerCard: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, padding: 12 },
  workerLeft: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  workerAvatar: { alignItems: 'center', backgroundColor: '#17212b', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  workerAvatarText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  workerName: { color: '#17212b', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  workerRole: { color: '#8fa3b8', fontSize: 11, fontWeight: '700' },
  workerRight: { alignItems: 'flex-end' },
  workerDuration: { color: '#1f6f5b', fontSize: 13, fontWeight: '900', marginBottom: 2 },
  workerTime: { color: '#8fa3b8', fontSize: 11, fontWeight: '600' },
});