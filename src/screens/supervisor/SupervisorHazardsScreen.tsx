import { useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HazardCard } from '../../components/HazardCard';
import { InputField } from '../../components/InputField';
import { getSiteHazardReports, reviewHazardReport, closeHazardReport, exportHazardsCsv } from '../../services/api';
import { exportAndShareCsv } from '../../utils/exportCsv';
import type { HazardReport } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

type StatusFilter = 'all' | 'open' | 'reviewed' | 'cleared';
type SeverityFilter = 'all' | 'Critical' | 'High' | 'Medium' | 'Low';

const STATUS_CHIPS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'cleared', label: 'Cleared' },
];

const SEVERITY_CHIPS: { key: SeverityFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Critical', label: 'Critical' },
  { key: 'High', label: 'High' },
  { key: 'Medium', label: 'Medium' },
  { key: 'Low', label: 'Low' },
];

function applyFilters(hazards: HazardReport[], status: StatusFilter, severity: SeverityFilter): HazardReport[] {
  return hazards.filter((h) => {
    const statusMatch = status === 'all' || h.status.toUpperCase() === status.toUpperCase();
    const severityMatch = severity === 'all' || h.severity === severity;
    return statusMatch && severityMatch;
  });
}

export function SupervisorHazardsScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [actionTaken, setActionTaken] = useState('Area isolated and assigned for follow-up');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await exportHazardsCsv();
      await exportAndShareCsv('hazard-reports.csv', csv);
    } catch (e: any) {
      Alert.alert('Export failed', e.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  }

  async function loadPage0() {
    return getSiteHazardReports(0).then((data) => {
      setHazards(data.content ?? []);
      setPage(0);
      setHasMore(data.totalPages ? 0 < data.totalPages - 1 : false);
    });
  }
  useEffect(() => { setLoading(true); loadPage0().finally(() => setLoading(false)); }, []);
  async function refresh() { setRefreshing(true); await loadPage0().catch(() => {}); setRefreshing(false); }

  async function loadMore() {
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const data = await getSiteHazardReports(nextPage);
      setHazards((c) => {
        const existingIds = new Set(c.map(h => h.id));
        const fresh = (data.content ?? []).filter(h => !existingIds.has(h.id));
        return [...c, ...fresh];
      });
      setPage(nextPage);
      setHasMore(nextPage < data.totalPages - 1);
    } catch {} finally { setLoadingMore(false); }
  }

  async function review(id: number) {
    try {
      const updated = await reviewHazardReport(id, { actionTaken: actionTaken.trim() || 'Hazard reviewed', actorEmail: session.user.email, actorName: session.user.fullName, actorRole: session.user.role });
      setHazards((c) => c.map((h) => h.id === updated.id ? updated : h));
    } catch { Alert.alert('Failed', 'Could not review the hazard.'); }
  }

  async function close(id: number) {
    try {
      const updated = await closeHazardReport(id, { actionTaken: actionTaken.trim() || 'Hazard cleared', actorEmail: session.user.email, actorName: session.user.fullName, actorRole: session.user.role });
      setHazards((c) => c.map((h) => h.id === updated.id ? updated : h));
    } catch { Alert.alert('Failed', 'Could not close the hazard.'); }
  }

  const open = hazards.filter((h) => h.status.toUpperCase() === 'OPEN');
  const reviewed = hazards.filter((h) => h.status.toUpperCase() === 'REVIEWED');
  const cleared = hazards.filter((h) => h.status.toUpperCase() === 'CLEARED');

  const visible = applyFilters(hazards, statusFilter, severityFilter);
  const isFiltered = statusFilter !== 'all' || severityFilter !== 'all';

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Hazard Reports</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {open.length > 0 && <View style={styles.urgentBadge}><Text style={styles.urgentBadgeText}>{open.length} open</Text></View>}
          <Pressable style={styles.exportBtn} onPress={handleExport} disabled={exporting}>
            <Text style={styles.exportBtnText}>{exporting ? '…' : '↓ CSV'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Summary strip — always uses unfiltered totals */}
      <View style={styles.strip}>
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, open.length > 0 && { color: theme.danger }]}>{open.length}</Text>
          <Text style={styles.stripLabel}>Open</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: theme.amber }]}>{reviewed.length}</Text>
          <Text style={styles.stripLabel}>Reviewed</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: theme.accent }]}>{cleared.length}</Text>
          <Text style={styles.stripLabel}>Cleared</Text>
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
      <View style={[styles.chipRow, { marginBottom: 14 }]}>
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

      <View style={styles.actionCard}>
        <Text style={styles.actionLabel}>Action taken (applied to reviewed/cleared reports)</Text>
        <InputField label="" multiline onChangeText={setActionTaken} value={actionTaken} placeholder="Describe the action taken..." />
      </View>

      {loading ? (
        <View style={styles.emptyCard}><Text style={styles.emptyText}>Loading reports...</Text></View>
      ) : hazards.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyTitle}>No hazard reports</Text>
          <Text style={styles.emptySub}>All clear on site</Text>
        </View>
      ) : visible.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No hazards match the selected filters</Text>
        </View>
      ) : null}

      {isFiltered && visible.length > 0 ? (
        <Text style={styles.resultCount}>{visible.length} of {hazards.length} report{hazards.length !== 1 ? 's' : ''}</Text>
      ) : null}

      {visible.map((h) => (
        <HazardCard key={h.id} hazard={h} canReview canClear onReview={review} onClear={close} />
      ))}

      {hasMore ? (
        <Pressable onPress={loadMore} style={styles.loadMoreBtn}>
          <Text style={styles.loadMoreText}>{loadingMore ? 'Loading...' : 'Load More'}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 40 },
    pageHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 16 },
    pageTitle: { color: theme.text, flex: 1, fontSize: 22, fontWeight: '900' },
    exportBtn: { backgroundColor: theme.bgHero, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    exportBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    urgentBadge: { backgroundColor: theme.danger, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    urgentBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
    strip: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 16, paddingVertical: 14 },
    stripItem: { alignItems: 'center', flex: 1 },
    stripValue: { color: theme.text, fontSize: 20, fontWeight: '900' },
    stripLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
    stripDivider: { backgroundColor: theme.border, width: 1 },
    filterLabel: { color: theme.textSub, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
    chip: { borderColor: theme.border, borderRadius: 20, borderWidth: 1.5, backgroundColor: theme.bgCard, paddingHorizontal: 14, paddingVertical: 6 },
    chipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    chipText: { color: theme.textSub, fontSize: 13, fontWeight: '700' },
    chipTextActive: { color: '#ffffff' },
    resultCount: { color: theme.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 8 },
    actionCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 14 },
    actionLabel: { color: theme.textSub, fontSize: 12, fontWeight: '700', marginBottom: 8 },
    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 32 },
    emptyIcon: { color: theme.accent, fontSize: 28, marginBottom: 8 },
    emptyTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
    emptySub: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
    emptyText: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
    loadMoreBtn: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, marginTop: 8, paddingVertical: 12 },
    loadMoreText: { color: theme.accent, fontSize: 14, fontWeight: '800' },
  });
}
