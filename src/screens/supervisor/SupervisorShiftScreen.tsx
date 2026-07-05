import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import { approveShiftLog, getSiteShiftLogs, rejectShiftLog, exportShiftLogsCsv } from '../../services/api';
import { exportAndShareCsv } from '../../utils/exportCsv';
import type { ShiftLog } from '../../services/api';
import type { AuthSession } from '../../types/auth';

// Session-persistent filter state — survives tab switches within the session
type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';
type StatusFilter = '' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

type FilterState = {
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
  mineralType: string;
  workerName: string;
  status: StatusFilter;
};

let sessionFilters: FilterState = {
  datePreset: 'today',
  dateFrom: '',
  dateTo: '',
  mineralType: '',
  workerName: '',
  status: '',
};

function presetToRange(preset: DatePreset): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (preset === 'today') {
    const s = fmt(now);
    return { dateFrom: s, dateTo: s };
  }
  if (preset === 'yesterday') {
    const y = new Date(now); y.setDate(now.getDate() - 1);
    const s = fmt(y);
    return { dateFrom: s, dateTo: s };
  }
  if (preset === 'week') {
    const start = new Date(now);
    const day = now.getDay();
    start.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    return { dateFrom: fmt(start), dateTo: fmt(now) };
  }
  if (preset === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: fmt(start), dateTo: fmt(now) };
  }
  return { dateFrom: '', dateTo: '' };
}

function buildApiParams(f: FilterState) {
  const range = f.datePreset !== 'custom' ? presetToRange(f.datePreset) : { dateFrom: f.dateFrom, dateTo: f.dateTo };
  return {
    dateFrom: range.dateFrom || undefined,
    dateTo: range.dateTo || undefined,
    mineralType: f.mineralType || undefined,
    workerName: f.workerName || undefined,
    status: f.status || undefined,
  };
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
}

function statusColor(s: string) {
  if (s === 'APPROVED') return '#15803d';
  if (s === 'REJECTED') return '#9aa5b1';
  return '#92400e';
}
function statusBg(s: string) {
  if (s === 'APPROVED') return '#dcfce7';
  if (s === 'REJECTED') return '#f4f6f8';
  return '#fef3c7';
}

type Props = { session: AuthSession };

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
];

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'SUBMITTED', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

export function SupervisorShiftScreen({ session: _ }: Props) {
  const [filters, setFilters] = useState<FilterState>({ ...sessionFilters });
  const [logs, setLogs] = useState<ShiftLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioning, setActioning] = useState<Record<number, boolean>>({});
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await exportShiftLogsCsv();
      await exportAndShareCsv('shift-logs.csv', csv);
    } catch (e: any) {
      Alert.alert('Export failed', e.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  }
  const pendingLoad = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      sessionFilters = next;
      return next;
    });
  }

  async function load(f: FilterState = filters) {
    try {
      const data = await getSiteShiftLogs(buildApiParams(f));
      setLogs(data);
    } catch {}
  }

  // Debounce text-field changes so we don't fire a request on every keystroke
  useEffect(() => {
    if (pendingLoad.current) clearTimeout(pendingLoad.current);
    pendingLoad.current = setTimeout(() => load(filters), 400);
    return () => { if (pendingLoad.current) clearTimeout(pendingLoad.current); };
  }, [filters]);

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleApprove(log: ShiftLog) {
    Alert.alert(
      'Approve Shift Log',
      `Approve ${log.mineralType} ${log.volumeExtracted}${log.unit} from ${log.workerName}?\n\nThis adds to the mineral inventory.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setActioning((p) => ({ ...p, [log.id]: true }));
            try {
              const updated = await approveShiftLog(log.id);
              setLogs((p) => p.map((l) => (l.id === updated.id ? updated : l)));
            } catch {
              Alert.alert('Error', 'Could not approve. Try again.');
            }
            setActioning((p) => ({ ...p, [log.id]: false }));
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
          text: 'Reject', style: 'destructive',
          onPress: async () => {
            setActioning((p) => ({ ...p, [log.id]: true }));
            try {
              const updated = await rejectShiftLog(log.id);
              setLogs((p) => p.map((l) => (l.id === updated.id ? updated : l)));
            } catch {
              Alert.alert('Error', 'Could not reject. Try again.');
            }
            setActioning((p) => ({ ...p, [log.id]: false }));
          },
        },
      ]
    );
  }

  // Production summary
  const approvedTotals: Record<string, number> = {};
  let pendingCount = 0;
  let rejectedCount = 0;
  logs.forEach((log) => {
    if (log.status === 'APPROVED') {
      const key = `${log.mineralType} (${log.unit})`;
      approvedTotals[key] = (approvedTotals[key] ?? 0) + Number(log.volumeExtracted);
    } else if (log.status === 'SUBMITTED') pendingCount++;
    else if (log.status === 'REJECTED') rejectedCount++;
  });

  const hasActiveFilters = filters.mineralType || filters.workerName || filters.status;

  function clearFilters() {
    const reset: FilterState = { datePreset: 'today', dateFrom: '', dateTo: '', mineralType: '', workerName: '', status: '' };
    setFilters(reset);
    sessionFilters = reset;
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1f6f5b" /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f4f6f8' }}>
      {/* Filter Panel */}
      <View style={styles.filterPanel}>
        {/* Date presets */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {DATE_PRESETS.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[styles.chip, filters.datePreset === p.key && styles.chipActive]}
                onPress={() => updateFilter('datePreset', p.key)}
              >
                <Text style={[styles.chipText, filters.datePreset === p.key && styles.chipTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Custom date range */}
        {filters.datePreset === 'custom' ? (
          <View style={styles.dateRangeRow}>
            <TextInput
              style={[styles.dateInput, { flex: 1 }]}
              placeholder="From (YYYY-MM-DD)"
              placeholderTextColor="#9aa5b1"
              value={filters.dateFrom}
              onChangeText={(v) => updateFilter('dateFrom', v)}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={styles.dateArrow}>→</Text>
            <TextInput
              style={[styles.dateInput, { flex: 1 }]}
              placeholder="To (YYYY-MM-DD)"
              placeholderTextColor="#9aa5b1"
              value={filters.dateTo}
              onChangeText={(v) => updateFilter('dateTo', v)}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        ) : null}

        {/* Status filter */}
        <View style={styles.statusRow}>
          {STATUS_FILTERS.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.statusChip, filters.status === s.key && styles.statusChipActive]}
              onPress={() => updateFilter('status', s.key)}
            >
              <Text style={[styles.statusChipText, filters.status === s.key && styles.statusChipTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Text filters */}
        <View style={styles.textFilterRow}>
          <TextInput
            style={[styles.textFilter, { flex: 1 }]}
            placeholder="⛏ Mineral type..."
            placeholderTextColor="#9aa5b1"
            value={filters.mineralType}
            onChangeText={(v) => updateFilter('mineralType', v)}
          />
          <TextInput
            style={[styles.textFilter, { flex: 1 }]}
            placeholder="👷 Worker name..."
            placeholderTextColor="#9aa5b1"
            value={filters.workerName}
            onChangeText={(v) => updateFilter('workerName', v)}
          />
        </View>

        {hasActiveFilters ? (
          <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕ Clear filters</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {/* Production summary */}
        {Object.keys(approvedTotals).length > 0 ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Approved Production</Text>
            {Object.entries(approvedTotals).map(([key, total]) => (
              <View key={key} style={styles.summaryRow}>
                <Text style={styles.summaryMineral}>{key}</Text>
                <Text style={styles.summaryTotal}>{total.toFixed(2)}</Text>
              </View>
            ))}
            {(pendingCount > 0 || rejectedCount > 0) ? (
              <Text style={styles.summaryFootnote}>
                {pendingCount > 0 ? `${pendingCount} pending` : ''}
                {pendingCount > 0 && rejectedCount > 0 ? ' · ' : ''}
                {rejectedCount > 0 ? `${rejectedCount} rejected` : ''}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Pending banner */}
        {pendingCount > 0 && filters.status !== 'APPROVED' && filters.status !== 'REJECTED' ? (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingBannerText}>
              ⏳ {pendingCount} log{pendingCount !== 1 ? 's' : ''} awaiting approval
            </Text>
          </View>
        ) : null}

        {/* Result count + export */}
        <View style={{ alignItems: 'center', flexDirection: 'row', marginBottom: 8 }}>
          <Text style={[styles.resultCount, { flex: 1, marginBottom: 0 }]}>
            {logs.length} log{logs.length !== 1 ? 's' : ''} · newest first
          </Text>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport} disabled={exporting}>
            <Text style={styles.exportBtnText}>{exporting ? '…' : '↓ CSV'}</Text>
          </TouchableOpacity>
        </View>

        {logs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No shift logs match your filters.</Text>
          </View>
        ) : null}

        {logs.map((log) => (
          <View key={log.id} style={styles.logCard}>
            <View style={styles.logHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.logMineral}>{log.mineralType}</Text>
                <Text style={styles.logWorker}>{log.workerName}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={styles.logVolume}>{log.volumeExtracted} {log.unit}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusBg(log.status) }]}>
                  <Text style={[styles.statusBadgeText, { color: statusColor(log.status) }]}>
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
                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(log)}>
                      <Text style={styles.approveBtnText}>✓ Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(log)}>
                      <Text style={styles.rejectBtnText}>✗ Reject</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' },
  filterPanel: { backgroundColor: '#fff', borderBottomColor: '#dde3ea', borderBottomWidth: 1, padding: 12, gap: 0 },
  chip: { borderRadius: 20, borderWidth: 1.5, borderColor: '#dde3ea', paddingHorizontal: 14, paddingVertical: 6 },
  chipActive: { backgroundColor: '#1f6f5b', borderColor: '#1f6f5b' },
  chipText: { color: '#5d6875', fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  dateRangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dateInput: { backgroundColor: '#f4f6f8', borderRadius: 8, borderWidth: 1, borderColor: '#dde3ea', color: '#17212b', fontSize: 13, paddingHorizontal: 10, paddingVertical: 8 },
  dateArrow: { color: '#9aa5b1', fontSize: 16, fontWeight: '700' },
  statusRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  statusChip: { borderRadius: 20, borderWidth: 1.5, borderColor: '#dde3ea', paddingHorizontal: 12, paddingVertical: 5 },
  statusChipActive: { backgroundColor: '#17212b', borderColor: '#17212b' },
  statusChipText: { color: '#5d6875', fontSize: 12, fontWeight: '700' },
  statusChipTextActive: { color: '#fff' },
  textFilterRow: { flexDirection: 'row', gap: 8 },
  textFilter: { backgroundColor: '#f4f6f8', borderRadius: 8, borderWidth: 1, borderColor: '#dde3ea', color: '#17212b', fontSize: 13, paddingHorizontal: 10, paddingVertical: 8 },
  clearBtn: { alignSelf: 'flex-start', marginTop: 6 },
  clearBtnText: { color: '#b42318', fontSize: 12, fontWeight: '700' },
  container: { padding: 14, paddingBottom: 40 },
  summaryCard: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  summaryTitle: { color: '#17212b', fontSize: 13, fontWeight: '900', marginBottom: 8 },
  summaryRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomColor: '#f4f6f8', borderBottomWidth: 1 },
  summaryMineral: { color: '#17212b', fontSize: 13, fontWeight: '800' },
  summaryTotal: { color: '#1f6f5b', fontSize: 14, fontWeight: '900' },
  summaryFootnote: { color: '#9aa5b1', fontSize: 11, fontWeight: '700', marginTop: 8 },
  pendingBanner: { backgroundColor: '#fef3c7', borderColor: '#f59e0b', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 10 },
  pendingBannerText: { color: '#92400e', fontSize: 13, fontWeight: '700' },
  resultCount: { color: '#9aa5b1', fontSize: 11, fontWeight: '700', marginBottom: 8 },
  exportBtn: { backgroundColor: '#17212b', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  exportBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  emptyCard: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, padding: 16, alignItems: 'center' },
  emptyText: { color: '#9aa5b1', fontSize: 13, fontWeight: '600' },
  logCard: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 8, padding: 12 },
  logHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  logMineral: { color: '#17212b', fontSize: 15, fontWeight: '900' },
  logWorker: { color: '#5d6875', fontSize: 12, fontWeight: '700', marginTop: 2 },
  logVolume: { color: '#1f6f5b', fontSize: 16, fontWeight: '900' },
  statusBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  statusBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
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
});
