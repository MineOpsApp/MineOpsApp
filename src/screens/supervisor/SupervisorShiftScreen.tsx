import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

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

type Props = { session: AuthSession };

export function SupervisorShiftScreen({ session: _ }: Props) {
  const [logs, setLogs] = useState<ShiftLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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

  const totalByMineral: Record<string, number> = {};
  logs.forEach((log) => {
    totalByMineral[log.mineralType] = (totalByMineral[log.mineralType] ?? 0) + Number(log.volumeExtracted);
  });

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>Shift Logs</Text>
      <Text style={styles.subtitle}>Pull down to refresh</Text>

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

      <Text style={styles.sectionTitle}>All Shift Logs ({logs.length})</Text>
      {logs.length === 0 ? (
        <View style={styles.card}><Text style={styles.meta}>No shift logs yet</Text></View>
      ) : null}
      {logs.map((log) => (
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
  subtitle: { color: '#9aa5b1', fontSize: 12, fontWeight: '600', marginBottom: 16 },
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
