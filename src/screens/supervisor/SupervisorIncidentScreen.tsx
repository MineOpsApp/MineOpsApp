import { useEffect, useState } from 'react';
import { getSiteIncidents, updateIncidentStatus, exportIncidentsCsv } from '../../services/api';
import { exportAndShareCsv } from '../../utils/exportCsv';
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AuthSession } from '../../types/auth';

type Incident = {
  id: number;
  reportedByName: string;
  zone: string;
  category: string;
  severity: string;
  description: string;
  involvedPersons: string | null;
  firstAidGiven: boolean;
  hospitalRequired: boolean;
  immediateAction: string | null;
  status: string;
  reportedAt: string;
  photoData: string | null;
};

type Props = { session: AuthSession };

type StatusFilter = 'all' | 'Open' | 'Under Investigation' | 'Closed';
type SeverityFilter = 'all' | 'Critical' | 'Serious' | 'Minor';

const STATUS_CHIPS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Open', label: 'Open' },
  { key: 'Under Investigation', label: 'Investigating' },
  { key: 'Closed', label: 'Closed' },
];

const SEVERITY_CHIPS: { key: SeverityFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Critical', label: 'Critical' },
  { key: 'Serious', label: 'Serious' },
  { key: 'Minor', label: 'Minor' },
];

function applyFilters(incidents: Incident[], status: StatusFilter, severity: SeverityFilter): Incident[] {
  return incidents.filter((i) => {
    const statusMatch = status === 'all' || i.status === status;
    const severityMatch = severity === 'all' || i.severity === severity;
    return statusMatch && severityMatch;
  });
}

const SEVERITY_COLORS: Record<string, string> = {
  Minor: '#1f6f5b',
  Serious: '#a15c00',
  Critical: '#b42318',
};

const CATEGORY_ICONS: Record<string, string> = {
  'Injury': '🤕',
  'Near Miss': '⚠️',
  'Equipment Damage': '🔧',
  'Environmental': '🌿',
};

const STATUSES = ['Open', 'Under Investigation', 'Closed'];

function IncidentPhoto({ photoData }: { photoData: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable onPress={() => setExpanded((e) => !e)} style={{ marginBottom: 10 }}>
      {expanded ? (
        <Image source={{ uri: `data:image/jpeg;base64,${photoData}` }} style={{ borderRadius: 8, height: 180, width: '100%' }} resizeMode="cover" />
      ) : (
        <View style={{ alignItems: 'center', backgroundColor: '#f4f6f8', borderColor: '#e5e9ef', borderRadius: 8, borderWidth: 1, paddingVertical: 10 }}>
          <Text style={{ color: '#5d6875', fontSize: 13, fontWeight: '700' }}>📷 Tap to view photo</Text>
        </View>
      )}
    </Pressable>
  );
}

export function SupervisorIncidentScreen({ session: _ }: Props) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [investigationNotes, setInvestigationNotes] = useState<Record<number, string>>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await exportIncidentsCsv();
      await exportAndShareCsv('incident-reports.csv', csv);
    } catch (e: any) {
      Alert.alert('Export failed', e.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  }

  function load() {
    setLoadError(false);
    return getSiteIncidents().then(setIncidents).catch(() => { setLoadError(true); });
  }
  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function handleStatusChange(incident: Incident, status: string, notes?: string) {
    try {
      const updated = await updateIncidentStatus(incident.id, status, notes);
      setIncidents((c) => c.map((i) => i.id === updated.id ? updated : i));
    } catch { Alert.alert('Failed', 'Could not update incident status.'); }
  }

  function formatDate(dateStr: string) {
    try { return new Date(dateStr).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return dateStr; }
  }

  const open = incidents.filter((i) => i.status === 'Open');
  const investigating = incidents.filter((i) => i.status === 'Under Investigation');
  const closed = incidents.filter((i) => i.status === 'Closed');

  const visible = applyFilters(incidents, statusFilter, severityFilter);
  const isFiltered = statusFilter !== 'all' || severityFilter !== 'all';

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', marginBottom: 2 }}>
        <Text style={[styles.pageTitle, { flex: 1 }]}>Incident Reports</Text>
        <Pressable style={styles.exportBtn} onPress={handleExport} disabled={exporting}>
          <Text style={styles.exportBtnText}>{exporting ? '…' : '↓ CSV'}</Text>
        </Pressable>
      </View>
      <Text style={styles.pageSub}>Pull to refresh</Text>

      {/* Summary strip — always uses unfiltered totals */}
      <View style={styles.strip}>
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, open.length > 0 && { color: '#b42318' }]}>{open.length}</Text>
          <Text style={styles.stripLabel}>Open</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: '#a15c00' }]}>{investigating.length}</Text>
          <Text style={styles.stripLabel}>Investigating</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: '#1f6f5b' }]}>{closed.length}</Text>
          <Text style={styles.stripLabel}>Closed</Text>
        </View>
      </View>

      {/* Status filter */}
      <Text style={styles.filterLabel}>Status</Text>
      <View style={styles.chipRow}>
        {STATUS_CHIPS.map((c) => (
          <Pressable
            key={c.key}
            onPress={() => setStatusFilter(c.key)}
            style={[styles.chip, statusFilter === c.key && styles.chipActive]}
          >
            <Text style={[styles.chipText, statusFilter === c.key && styles.chipTextActive]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Severity filter */}
      <Text style={styles.filterLabel}>Severity</Text>
      <View style={[styles.chipRow, { marginBottom: 16 }]}>
        {SEVERITY_CHIPS.map((c) => (
          <Pressable
            key={c.key}
            onPress={() => setSeverityFilter(c.key)}
            style={[styles.chip, severityFilter === c.key && styles.chipActive]}
          >
            <Text style={[styles.chipText, severityFilter === c.key && styles.chipTextActive]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      {incidents.length === 0 ? (
        loadError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>Failed to load incidents. Pull to refresh.</Text>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>✓</Text>
            <Text style={styles.emptyTitle}>No incidents reported</Text>
            <Text style={styles.emptySub}>Site is clear</Text>
          </View>
        )
      ) : visible.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No incidents match the selected filters</Text>
        </View>
      ) : null}

      {isFiltered && visible.length > 0 ? (
        <Text style={styles.resultCount}>{visible.length} of {incidents.length} incident{incidents.length !== 1 ? 's' : ''}</Text>
      ) : null}

      {visible.map((inc) => (
        <Pressable key={inc.id} onPress={() => setExpanded(expanded === inc.id ? null : inc.id)} style={styles.incidentCard}>
          <View style={styles.incidentHeader}>
            <View style={styles.incidentLeft}>
              <Text style={styles.incidentCategory}>{CATEGORY_ICONS[inc.category]} {inc.category}</Text>
              <Text style={styles.incidentMeta}>{inc.zone} · {inc.reportedByName}</Text>
              <Text style={styles.incidentTime}>{formatDate(inc.reportedAt)}</Text>
            </View>
            <View style={styles.incidentRight}>
              <View style={[styles.severityBadge, { backgroundColor: (SEVERITY_COLORS[inc.severity] ?? '#8fa3b8') + '22', borderColor: SEVERITY_COLORS[inc.severity] ?? '#8fa3b8' }]}>
                <Text style={[styles.severityText, { color: SEVERITY_COLORS[inc.severity] ?? '#8fa3b8' }]}>{inc.severity}</Text>
              </View>
              <Text style={styles.expandHint}>{expanded === inc.id ? '▲' : '▼'}</Text>
            </View>
          </View>

          {expanded === inc.id ? (
            <View style={styles.expandedBody}>
              <Text style={styles.descriptionText}>{inc.description}</Text>
              {inc.photoData ? <IncidentPhoto photoData={inc.photoData} /> : null}
              {inc.involvedPersons ? <Text style={styles.detailText}>👥 {inc.involvedPersons}</Text> : null}
              {inc.immediateAction ? <Text style={styles.detailText}>⚡ {inc.immediateAction}</Text> : null}
              <View style={styles.medicalRow}>
                {inc.firstAidGiven ? <Text style={styles.medicalTag}>🩹 First Aid Given</Text> : null}
                {inc.hospitalRequired ? <Text style={[styles.medicalTag, { color: '#b42318' }]}>🏥 Hospital Required</Text> : null}
              </View>

              <TextInput
                multiline
                onChangeText={(text) => setInvestigationNotes((c) => ({ ...c, [inc.id]: text }))}
                placeholder="Investigation notes or corrective actions..."
                placeholderTextColor="#8fa3b8"
                style={styles.notesInput}
                value={investigationNotes[inc.id] ?? ''}
              />

              <Text style={styles.statusLabel}>Update Status</Text>
              <View style={styles.statusRow}>
                {STATUSES.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => handleStatusChange(inc, s, investigationNotes[inc.id])}
                    style={[styles.statusBtn, inc.status === s && styles.statusBtnActive]}
                  >
                    <Text style={[styles.statusBtnText, inc.status === s && styles.statusBtnTextActive]}>
                      {s === 'Under Investigation' ? 'Investigating' : s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  pageTitle: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 2 },
  exportBtn: { backgroundColor: '#17212b', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  exportBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  pageSub: { color: '#8fa3b8', fontSize: 11, fontWeight: '600', marginBottom: 16 },
  strip: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 16, paddingVertical: 14 },
  stripItem: { alignItems: 'center', flex: 1 },
  stripValue: { color: '#17212b', fontSize: 22, fontWeight: '900' },
  stripLabel: { color: '#8fa3b8', fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  stripDivider: { backgroundColor: '#e5e9ef', width: 1 },
  filterLabel: { color: '#5d6875', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { borderColor: '#dde3ea', borderRadius: 20, borderWidth: 1.5, backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 6 },
  chipActive: { backgroundColor: '#1f6f5b', borderColor: '#1f6f5b' },
  chipText: { color: '#5d6875', fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: '#ffffff' },
  resultCount: { color: '#8fa3b8', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  emptyCard: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, padding: 32 },
  emptyIcon: { color: '#1f6f5b', fontSize: 28, marginBottom: 8 },
  emptyTitle: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  emptySub: { color: '#8fa3b8', fontSize: 13, fontWeight: '600' },
  emptyText: { color: '#8fa3b8', fontSize: 13, fontWeight: '600' },
  errorBanner: { backgroundColor: '#fff5f5', borderColor: '#fca5a5', borderRadius: 8, borderWidth: 1, marginBottom: 12, padding: 14 },
  errorBannerText: { color: '#b42318', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  incidentCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 8, padding: 14 },
  incidentHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  incidentLeft: { flex: 1 },
  incidentCategory: { color: '#17212b', fontSize: 14, fontWeight: '900', marginBottom: 2 },
  incidentMeta: { color: '#5d6875', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  incidentTime: { color: '#8fa3b8', fontSize: 11, fontWeight: '600' },
  incidentRight: { alignItems: 'flex-end', gap: 6 },
  severityBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  severityText: { fontSize: 11, fontWeight: '900' },
  expandHint: { color: '#8fa3b8', fontSize: 12 },
  expandedBody: { borderTopColor: '#f4f6f8', borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
  descriptionText: { color: '#17212b', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  detailText: { color: '#5d6875', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  medicalRow: { flexDirection: 'row', gap: 10, marginBottom: 12, marginTop: 4 },
  medicalTag: { color: '#1f6f5b', fontSize: 12, fontWeight: '700' },
  statusLabel: { color: '#5d6875', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  statusRow: { flexDirection: 'row', gap: 6 },
  statusBtn: { alignItems: 'center', borderColor: '#e5e9ef', borderRadius: 8, borderWidth: 1, flex: 1, paddingVertical: 8 },
  statusBtnActive: { backgroundColor: '#17212b', borderColor: '#17212b' },
  statusBtnText: { color: '#8fa3b8', fontSize: 11, fontWeight: '800' },
  statusBtnTextActive: { color: '#ffffff' },
  notesInput: { backgroundColor: '#f4f6f8', borderColor: '#e5e9ef', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 13, marginBottom: 10, minHeight: 70, padding: 10 },
});
