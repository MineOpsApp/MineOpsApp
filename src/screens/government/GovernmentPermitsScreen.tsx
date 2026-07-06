import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getGovernmentPermits, type MiningPermitStatus } from '../../services/api';

function Check({ done }: { done: boolean | null }) {
  return <Text style={{ color: done ? '#15803d' : '#dc2626', fontWeight: '900', fontSize: 14 }}>{done ? '✓' : '✗'}</Text>;
}

function ministerialColor(s: string | null) {
  if (s === 'APPROVED') return '#15803d';
  if (s === 'REJECTED') return '#b42318';
  if (s === 'PENDING') return '#92400e';
  return '#8fa3b8';
}

export function GovernmentPermitsScreen() {
  const [permits, setPermits] = useState<MiningPermitStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try { setPermits(await getGovernmentPermits()); } catch { /* best-effort */ }
  }

  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  return (
    <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text style={styles.title}>Mining Permit Status</Text>
      <Text style={styles.sub}>Self-reported Minerals Commission permit progress per site</Text>
      {permits.length === 0 && <Text style={styles.empty}>No sites have reported permit status yet.</Text>}
      {permits.map(p => (
        <View key={p.id ?? p.site} style={styles.card}>
          <Text style={styles.siteName}>{p.site}</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}><Check done={p.applicationSubmitted} /><Text style={styles.gridLabel}>Application submitted</Text></View>
            <View style={styles.gridItem}><Check done={p.communityNotificationDone} /><Text style={styles.gridLabel}>Community notified</Text></View>
            <View style={styles.gridItem}><Check done={p.epaPermitObtained} /><Text style={styles.gridLabel}>EPA permit obtained</Text></View>
            <View style={styles.gridItem}>
              <Text style={[styles.ministerial, { color: ministerialColor(p.ministerialReviewStatus) }]}>
                {p.ministerialReviewStatus ?? 'Not set'}
              </Text>
              <Text style={styles.gridLabel}>Ministerial review</Text>
            </View>
          </View>
          {p.updatedByEmail && (
            <Text style={styles.meta}>Updated by {p.updatedByEmail}</Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f0f2f5' },
  title: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 2 },
  sub: { color: '#8fa3b8', fontSize: 12, fontWeight: '600', marginBottom: 16 },
  empty: { color: '#8fa3b8', fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#fff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, marginBottom: 12, padding: 14 },
  siteName: { color: '#1f6f5b', fontSize: 14, fontWeight: '900', marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  gridItem: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: '45%' },
  gridLabel: { color: '#5d6875', fontSize: 12, fontWeight: '600', flex: 1 },
  ministerial: { fontSize: 12, fontWeight: '900' },
  meta: { color: '#8fa3b8', fontSize: 11, fontWeight: '600' },
});
