import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getSosAlerts } from '../../services/api';
import type { SosAlert } from '../../types/sos';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

export function SupervisorSosScreen({ session: _ }: Props) {
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  function load() { return getSosAlerts().then(setAlerts).catch(() => {}); }
  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  const active = alerts.filter((a) => a.status.toLowerCase() !== 'resolved');

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#b42318" />}>

      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>SOS Alerts</Text>
        {active.length > 0 && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>🚨 {active.length} active</Text></View>}
      </View>

      {active.length === 0 ? (
        <View style={styles.clearCard}>
          <Text style={styles.clearIcon}>✓</Text>
          <View>
            <Text style={styles.clearTitle}>No active SOS alerts</Text>
            <Text style={styles.clearSub}>Pull down to refresh</Text>
          </View>
        </View>
      ) : null}

      {alerts.map((a) => (
        <View key={a.id} style={[styles.alertCard, a.status.toLowerCase() === 'resolved' && styles.alertCardDone]}>
          <View style={styles.alertTop}>
            <View style={styles.alertIconWrap}>
              <Text style={styles.alertIcon}>🚨</Text>
            </View>
            <View style={styles.alertBody}>
              <Text style={styles.alertSite}>{a.site}</Text>
              <Text style={styles.alertMessage}>{a.message}</Text>
            </View>
            <View style={[styles.statusPill, a.status.toLowerCase() === 'resolved' ? styles.statusPillDone : styles.statusPillActive]}>
              <Text style={styles.statusPillText}>{a.status}</Text>
            </View>
          </View>
          <Text style={styles.alertMeta}>Triggered by {a.role} · Alert #{a.id}</Text>
        </View>
      ))}

      {alerts.length === 0 ? (
        <View style={styles.emptyCard}><Text style={styles.emptyText}>No SOS alerts on record</Text></View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  pageHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 20 },
  pageTitle: { color: '#17212b', flex: 1, fontSize: 22, fontWeight: '900' },
  activeBadge: { backgroundColor: '#b42318', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  activeBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  clearCard: { alignItems: 'center', backgroundColor: '#f0fdf4', borderColor: '#86efac', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 16, padding: 16 },
  clearIcon: { color: '#16a34a', fontSize: 24 },
  clearTitle: { color: '#15803d', fontSize: 14, fontWeight: '900' },
  clearSub: { color: '#4ade80', fontSize: 12, fontWeight: '600', marginTop: 2 },
  alertCard: { backgroundColor: '#ffffff', borderColor: '#f5c6c6', borderLeftColor: '#b42318', borderLeftWidth: 4, borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 14 },
  alertCardDone: { borderColor: '#e5e9ef', borderLeftColor: '#8fa3b8', opacity: 0.7 },
  alertTop: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: 8 },
  alertIconWrap: { backgroundColor: '#fff5f5', borderRadius: 20, height: 36, width: 36, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  alertIcon: { fontSize: 18 },
  alertBody: { flex: 1 },
  alertSite: { color: '#17212b', fontSize: 14, fontWeight: '900', marginBottom: 2 },
  alertMessage: { color: '#5d6875', fontSize: 13, fontWeight: '600' },
  statusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusPillActive: { backgroundColor: '#fff5f5' },
  statusPillDone: { backgroundColor: '#f4f6f8' },
  statusPillText: { color: '#5d6875', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  alertMeta: { color: '#8fa3b8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  emptyCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, padding: 20 },
  emptyText: { color: '#8fa3b8', fontSize: 13, fontWeight: '600', textAlign: 'center' },
});