import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getSiteShiftLogs } from '../../services/api';
import type { AuthSession } from '../../types/auth';

type ShiftLog = {
  id: number;
  workerName: string;
  workerEmail: string;
  zone: string;
  shiftType: string;
  mineralType: string;
  volumeExtracted: number;
  unit: string;
  equipmentCode: string;
  equipmentName: string;
  notes: string;
  status: string;
  submittedAt: string;
};

type Filter = 'today' | 'week' | 'month' | 'all';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All' },
];

function applyFilter(logs: ShiftLog[], filter: Filter): ShiftLog[] {
  if (filter === 'all') return logs;
  const now = new Date();
  return logs.filter((log) => {
    const d = new Date(log.submittedAt);
    if (filter === 'today') {
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }
    if (filter === 'week') {
      const startOfWeek = new Date(now);
      const day = now.getDay();
      startOfWeek.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      startOfWeek.setHours(0, 0, 0, 0);
      return d >= startOfWeek;
    }
    if (filter === 'month') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    return true;
  });
}

type Props = { session: AuthSession };

export function SupervisorShiftScreen({ session: _ }: Props) {
  const [logs, setLogs] = useState<ShiftLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('today');

  function load() {
    return getSiteShiftLogs().then(setLogs).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function formatDate(dateStr: string) {
    try { return new Date(dateStr).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return dateStr; }
  }

  const filteredLogs = applyFilter(logs, filter);

  const totalByMineral: Record<string, number> = {};
  filteredLogs.forEach((log) => {
    totalByMineral[log.mineralType] = (totalByMineral[log.mineralType] ?? 0) + Number(log.volumeExtracted);
  });

  const filterLabel = FILTERS.find((f) => f.key === filter)?.label ?? '';

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>Shift Logs</Text>
      <Text style={styles.subtitle}>Pull down to refresh</Text>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterBtnText, filter === f.key && styles.filterBtnTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {Object.keys(totalByMineral).length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Production Summary</Text>
          <View style={styles.summaryCard}>
            {Object.entries(totalByMineral).map(([mineral, total]) => (
              <View key={mineral} style={styles.summaryRow}>
                <Text style={styles.summaryMineral}>{mineral}</Text>
                <Text style={styles.summaryTotal}>{total.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>
        {filterLabel} · {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''}
      </Text>
      {filteredLogs.length === 0 ? (
        <View style={styles.card}><Text style={styles.meta}>No shift logs for this period</Text></View>
      ) : null}
      {filteredLogs.map((log) => (
        <View key={log.id} style={styles.logCard}>
          <View style={styles.logHeader}>
            <View>
              <Text style={styles.logMineral}>{log.mineralType}</Text>
              <Text style={styles.logWorker}>{log.workerName}</Text>
            </View>
            <Text style={styles.logVolume}>{log.volumeExtracted}{log.unit}</Text>
          </View>
          <Text style={styles.logMeta}>{log.shiftType} shift · {log.zone}</Text>
          <Text style={styles.logMeta}>{log.equipmentName} ({log.equipmentCode})</Text>
          {log.notes ? <Text style={styles.logNotes}>{log.notes}</Text> : null}
          <Text style={styles.logTime}>{formatDate(log.submittedAt)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f4f6f8' },
  title: { color: '#17212b', fontSize: 26, fontWeight: '800', marginBottom: 2 },
  subtitle: { color: '#9aa5b1', fontSize: 12, fontWeight: '600', marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterBtn: { borderRadius: 20, borderWidth: 1.5, borderColor: '#dde3ea', paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#fff' },
  filterBtnActive: { backgroundColor: '#1f6f5b', borderColor: '#1f6f5b' },
  filterBtnText: { color: '#5d6875', fontSize: 13, fontWeight: '700' },
  filterBtnTextActive: { color: '#fff' },
  sectionTitle: { color: '#17212b', fontSize: 18, fontWeight: '800', marginBottom: 10, marginTop: 8 },
  summaryCard: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  summaryRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomColor: '#f4f6f8', borderBottomWidth: 1 },
  summaryMineral: { color: '#17212b', fontSize: 14, fontWeight: '800' },
  summaryTotal: { color: '#1f6f5b', fontSize: 14, fontWeight: '900' },
  card: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  logCard: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 8, padding: 12 },
  logHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  logMineral: { color: '#17212b', fontSize: 15, fontWeight: '900' },
  logWorker: { color: '#5d6875', fontSize: 12, fontWeight: '700', marginTop: 2 },
  logVolume: { color: '#1f6f5b', fontSize: 16, fontWeight: '900' },
  logMeta: { color: '#5d6875', fontSize: 12, fontWeight: '700', marginBottom: 1 },
  logNotes: { color: '#17212b', fontSize: 13, fontWeight: '600', marginTop: 4 },
  logTime: { color: '#9aa5b1', fontSize: 11, fontWeight: '700', marginTop: 4 },
  meta: { color: '#5d6875', fontSize: 13, fontWeight: '600' },
});
