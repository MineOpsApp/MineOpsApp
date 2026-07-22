import { useEffect, useState } from 'react';
import { getSiteIncidents, updateIncidentStatus, exportIncidentsCsv } from '../../services/api';
import { exportAndShareCsv } from '../../utils/exportCsv';
import { Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AuthSession } from '../../types/auth';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, spacing, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

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

const CATEGORY_ICON_NAMES: Record<string, string> = {
  'Injury': 'bandage-outline',
  'Near Miss': 'warning-outline',
  'Equipment Damage': 'construct-outline',
  'Environmental': 'leaf-outline',
};

const STATUSES = ['Open', 'Under Investigation', 'Closed'];

function IncidentPhoto({ photoData }: { photoData: string }) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable onPress={() => setExpanded((e) => !e)} style={{ marginBottom: 10 }}>
      {expanded ? (
        <Image source={{ uri: `data:image/jpeg;base64,${photoData}` }} style={{ borderRadius: 8, height: 180, width: '100%' }} resizeMode="cover" />
      ) : (
        <View style={{ alignItems: 'center', backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', paddingVertical: 10 }}>
          <Ionicons name="camera-outline" size={14} color={theme.textSub} />
          <Text style={{ color: theme.textSub, fontSize: 13, fontWeight: '700' }}>Tap to view photo</Text>
        </View>
      )}
    </Pressable>
  );
}

export function SupervisorIncidentScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
    <FlatList
      data={visible}
      keyExtractor={(inc) => String(inc.id)}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListHeaderComponent={
        <>
          <View style={{ alignItems: 'center', flexDirection: 'row', marginBottom: 2 }}>
            <Text style={[styles.pageTitle, { flex: 1 }]}>Incident Reports</Text>
            <Pressable style={styles.exportBtn} onPress={handleExport} disabled={exporting}>
              {exporting ? (
                <Text style={styles.exportBtnText}>…</Text>
              ) : (
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: 4 }}>
                  <Ionicons name="download-outline" size={13} color="#fff" />
                  <Text style={styles.exportBtnText}>CSV</Text>
                </View>
              )}
            </Pressable>
          </View>
          <Text style={styles.pageSub}>Pull to refresh</Text>

          {/* Summary strip — always uses unfiltered totals */}
          <View style={styles.strip}>
            <View style={styles.stripItem}>
              <Text style={[styles.stripValue, open.length > 0 && { color: theme.danger }]}>{open.length}</Text>
              <Text style={styles.stripLabel}>Open</Text>
            </View>
            <View style={styles.stripDivider} />
            <View style={styles.stripItem}>
              <Text style={[styles.stripValue, { color: theme.amber }]}>{investigating.length}</Text>
              <Text style={styles.stripLabel}>Investigating</Text>
            </View>
            <View style={styles.stripDivider} />
            <View style={styles.stripItem}>
              <Text style={[styles.stripValue, { color: theme.accent }]}>{closed.length}</Text>
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

          {isFiltered && visible.length > 0 ? (
            <Text style={styles.resultCount}>{visible.length} of {incidents.length} incident{incidents.length !== 1 ? 's' : ''}</Text>
          ) : null}
        </>
      }
      ListEmptyComponent={
        incidents.length === 0 ? (
          loadError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>Failed to load incidents. Pull to refresh.</Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-circle" size={28} color={theme.accent} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>No incidents reported</Text>
              <Text style={styles.emptySub}>Site is clear</Text>
            </View>
          )
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No incidents match the selected filters</Text>
          </View>
        )
      }
      renderItem={({ item: inc }) => (
        <Pressable onPress={() => setExpanded(expanded === inc.id ? null : inc.id)} style={styles.incidentCard}>
          <View style={styles.incidentHeader}>
            <View style={styles.incidentLeft}>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 2 }}>
                <Ionicons name={(CATEGORY_ICON_NAMES[inc.category] ?? 'alert-circle-outline') as any} size={14} color={theme.textSub} />
                <Text style={styles.incidentCategory}>{inc.category}</Text>
              </View>
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
              {inc.involvedPersons ? (
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="people-outline" size={13} color={theme.textSub} />
                  <Text style={styles.detailText}>{inc.involvedPersons}</Text>
                </View>
              ) : null}
              {inc.immediateAction ? (
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="flash-outline" size={13} color={theme.textSub} />
                  <Text style={styles.detailText}>{inc.immediateAction}</Text>
                </View>
              ) : null}
              <View style={styles.medicalRow}>
                {inc.firstAidGiven ? (
                  <View style={{ alignItems: 'center', flexDirection: 'row', gap: 4 }}>
                    <Ionicons name="medkit-outline" size={13} color={theme.accent} />
                    <Text style={styles.medicalTag}>First Aid Given</Text>
                  </View>
                ) : null}
                {inc.hospitalRequired ? (
                  <View style={{ alignItems: 'center', flexDirection: 'row', gap: 4 }}>
                    <Ionicons name="business-outline" size={13} color={theme.danger} />
                    <Text style={[styles.medicalTag, { color: theme.danger }]}>Hospital Required</Text>
                  </View>
                ) : null}
              </View>

              <TextInput
                multiline
                onChangeText={(text) => setInvestigationNotes((c) => ({ ...c, [inc.id]: text }))}
                placeholder="Investigation notes or corrective actions..."
                placeholderTextColor={theme.textMuted}
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
      )}
    />
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: Theme, isDark: boolean) {
  const cardShadow = {
    shadowColor: '#000' as const,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 4,
    elevation: 2,
  };
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: spacing.xl, paddingBottom: 40 },
    pageTitle: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 2 },
    exportBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 8, flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 6 },
    exportBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    pageSub: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginBottom: spacing.lg },
    strip: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: spacing.lg, paddingVertical: 14, ...cardShadow },
    stripItem: { alignItems: 'center', flex: 1 },
    stripValue: { color: theme.text, fontSize: 22, fontWeight: '900' },
    stripLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
    stripDivider: { backgroundColor: theme.border, width: 1 },
    filterLabel: { color: theme.textSub, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
    chip: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 6 },
    chipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    chipText: { color: theme.textSub, fontSize: 13, fontWeight: '700' },
    chipTextActive: { color: '#ffffff' },
    resultCount: { color: theme.textMuted, fontSize: 12, fontWeight: '700', marginBottom: spacing.sm },
    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 32, ...cardShadow },
    emptyTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
    emptySub: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
    emptyText: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
    errorBanner: { backgroundColor: theme.dangerLight, borderColor: theme.danger, borderRadius: 8, borderWidth: 1, marginBottom: spacing.md, padding: 14 },
    errorBannerText: { color: theme.danger, fontSize: 13, fontWeight: '700', textAlign: 'center' },
    incidentCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.sm, padding: 14, ...cardShadow },
    incidentHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
    incidentLeft: { flex: 1 },
    incidentCategory: { color: theme.text, fontSize: 14, fontWeight: '900' },
    incidentMeta: { color: theme.textSub, fontSize: 12, fontWeight: '700', marginBottom: 2 },
    incidentTime: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
    incidentRight: { alignItems: 'flex-end', gap: 6 },
    severityBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    severityText: { fontSize: 11, fontWeight: '900' },
    expandHint: { color: theme.textMuted, fontSize: 12 },
    expandedBody: { borderTopColor: theme.bgInput, borderTopWidth: 1, marginTop: spacing.md, paddingTop: spacing.md },
    descriptionText: { color: theme.text, fontSize: 13, fontWeight: '600', marginBottom: spacing.sm },
    detailText: { color: theme.textSub, fontSize: 12, fontWeight: '600' },
    medicalRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.md, marginTop: 4 },
    medicalTag: { color: theme.accent, fontSize: 12, fontWeight: '700' },
    statusLabel: { color: theme.textSub, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: spacing.sm, textTransform: 'uppercase' },
    statusRow: { flexDirection: 'row', gap: 6 },
    statusBtn: { alignItems: 'center', borderColor: theme.border, borderRadius: 8, borderWidth: 1, flex: 1, paddingVertical: spacing.sm },
    statusBtnActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    statusBtnText: { color: theme.textMuted, fontSize: 11, fontWeight: '800' },
    statusBtnTextActive: { color: '#ffffff' },
    notesInput: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 13, marginBottom: 10, minHeight: 70, padding: 10 },
  });
}
