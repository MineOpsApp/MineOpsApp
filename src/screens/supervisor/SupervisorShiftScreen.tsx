import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { approveShiftLog, getSiteShiftLogs, rejectShiftLog } from '../../services/api';
import type { ShiftLog } from '../../services/api';
import type { AuthSession } from '../../types/auth';

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

function statusColor(status: string) {
  if (status === 'APPROVED') return '#15803d';
  if (status === 'REJECTED') return '#9aa5b1';
  return '#92400e'; // SUBMITTED
}

function statusBg(status: string) {
  if (status === 'APPROVED') return '#dcfce7';
  if (status === 'REJECTED') return '#f4f6f8';
  return '#fef3c7'; // SUBMITTED
}

type Props = { session: AuthSession };

export function SupervisorShiftScreen({ session: _ }: Props) {
  const [logs, setLogs] = useState<ShiftLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('today');
  const [actioning, setActioning] = useState<Record<number, boolean>>({});

  function load() {
    return getSiteShiftLogs().then(setLogs).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleApprove(log: ShiftLog) {
    Alert.alert(
      'Approve Shift Log',
      `Approve ${log.mineralType} ${log.volumeExtracted}${log.unit} from ${log.workerName}?\n\nThis will add to the mineral inventory.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setActioning((prev) => ({ ...prev, [log.id]: true }));
            try {
              const updated = await approveShiftLog(log.id);
              setLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
            } catch {
              Alert.alert('Error', 'Could not approve shift log. Try again.');
            } finally {
              setActioning((prev) => ({ ...prev, [log.id]: false }));
            }
          },
        },
      ]
    );
  }

  async function handleReject(log: ShiftLog) {
    Alert.alert(
      'Reject Shift Log',
      `Reject ${log.mineralType} ${log.volumeExtracted}${log.unit} from ${log.workerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setActioning((prev) => ({ ...prev, [log.id]: true }));
            try {
              const updated = await rejectShiftLog(log.id);
              setLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
            } catch {
              Alert.alert('Error', 'Could not reject shift log. Try again.');
            } finally {
              setActioning((prev) => ({ ...prev, [log.id]: false }));
            }
          },
        },
      ]
    );
  }

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return dateStr; }
  }

  const filteredLogs = applyFilter(logs, filter);

  const totalByMineral: Record<string, number> = {};
  filteredLogs.forEach((log) => {
    if (log.status === 'APPROVED') {
      totalByMineral[log.mineralType] = (totalByMineral[log.mineralType] ?? 0) + Number(log.volumeExtracted);
    }
  });

  const pendingCount = filteredLogs.filter((l) => l.status === 'SUBMITTED').length;
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

      {pendingCount > 0 ? (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingBannerText}>
            ⏳ {pendingCount} log{pendingCount !== 1 ? 's' : ''} awaiting review
          </Text>
        </View>
      ) : null}

      {Object.keys(totalByMineral).length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Approved Production</Text>
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
            <View style={{ flex: 1 }}>
              <Text style={styles.logMineral}>{log.mineralType}</Text>
              <Text style={styles.logWorker}>{log.workerName}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={styles.logVolume}>{log.volumeExtracted}{log.unit}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusBg(log.status) }]}>
                <Text style={[styles.statusText, { color: statusColor(log.status) }]}>
                  {log.status}
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.logMeta}>{log.shiftType} shift · {log.zone}</Text>
          <Text style={styles.logMeta}>{log.equipmentName} ({log.equipmentCode})</Text>
          {log.notes ? <Text style={styles.logNotes}>{log.notes}</Text> : null}
          <Text style={styles.logTime}>{formatDate(log.submittedAt)}</Text>

          {log.status === 'APPROVED' && log.approvedBy ? (
            <Text style={styles.approvedBy}>✅ Approved by {log.approvedBy}</Text>
          ) : null}
          {log.status === 'REJECTED' && log.rejectedBy ? (
            <Text style={styles.rejectedBy}>✗ Rejected by {log.rejectedBy}</Text>
          ) : null}

          {log.status === 'SUBMITTED' ? (
            <View style={styles.actionRow}>
              {actioning[log.id] ? (
                <ActivityIndicator size="small" color="#1f6f5b" />
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleApprove(log)}
                  >
                    <Text style={styles.approveBtnText}>✓ Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleReject(log)}
                  >
                    <Text style={styles.rejectBtnText}>✗ Reject</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f4f6f8' },
  title: { color: '#17212b', fontSize: 26, fontWeight: '800', marginBottom: 2 },
  subtitle: { color: '#9aa5b1', fontSize: 12, fontWeight: '600', marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  filterBtn: { borderRadius: 20, borderWidth: 1.5, borderColor: '#dde3ea', paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#fff' },
  filterBtnActive: { backgroundColor: '#1f6f5b', borderColor: '#1f6f5b' },
  filterBtnText: { color: '#5d6875', fontSize: 13, fontWeight: '700' },
  filterBtnTextActive: { color: '#fff' },
  pendingBanner: { backgroundColor: '#fef3c7', borderColor: '#f59e0b', borderRadius: 8, borderWidth: 1, marginBottom: 12, padding: 10 },
  pendingBannerText: { color: '#92400e', fontSize: 13, fontWeight: '700' },
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
  statusBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  logMeta: { color: '#5d6875', fontSize: 12, fontWeight: '700', marginBottom: 1 },
  logNotes: { color: '#17212b', fontSize: 13, fontWeight: '600', marginTop: 4 },
  logTime: { color: '#9aa5b1', fontSize: 11, fontWeight: '700', marginTop: 4 },
  approvedBy: { color: '#15803d', fontSize: 11, fontWeight: '700', marginTop: 4 },
  rejectedBy: { color: '#9aa5b1', fontSize: 11, fontWeight: '700', marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  approveBtn: { flex: 1, backgroundColor: '#1f6f5b', borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  rejectBtn: { flex: 1, backgroundColor: '#fff', borderColor: '#b42318', borderWidth: 1.5, borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  rejectBtnText: { color: '#b42318', fontSize: 13, fontWeight: '800' },
  meta: { color: '#5d6875', fontSize: 13, fontWeight: '600' },
});
