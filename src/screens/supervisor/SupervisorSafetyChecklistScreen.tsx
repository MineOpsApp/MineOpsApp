import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getSiteChecklistToday } from '../../services/api';
import type { PendingWorker, SafetyChecklist, SiteTodayChecklist } from '../../services/api';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

function formatTime(dt: string) {
  try { return new Date(dt).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' }); }
  catch { return dt; }
}

const ITEM_LABELS: { key: keyof SafetyChecklist; label: string }[] = [
  { key: 'ppeHelmet',                label: 'Helmet' },
  { key: 'ppeBoots',                 label: 'Boots' },
  { key: 'ppeGloves',                label: 'Gloves' },
  { key: 'ppeVest',                  label: 'Vest' },
  { key: 'equipmentChecked',         label: 'Equipment' },
  { key: 'communicationDevice',      label: 'Comms' },
  { key: 'emergencyExitsClear',      label: 'Exits' },
  { key: 'hazardousMaterialsSecured', label: 'Hazmat' },
];

export function SupervisorSafetyChecklistScreen({ session: _ }: Props) {
  const [data, setData] = useState<SiteTodayChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const result = await getSiteChecklistToday().catch(() => null);
    setData(result);
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color="#1f6f5b" /></View>;
  }

  const submitted: SafetyChecklist[] = data?.submitted ?? [];
  const pending: PendingWorker[] = data?.pending ?? [];
  const total = submitted.length + pending.length;
  const pct = total > 0 ? Math.round((submitted.length / total) * 100) : 0;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1f6f5b" />}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Safety Checklists</Text>
        <Text style={styles.pageSub}>Today · {data?.date ?? '—'}</Text>
      </View>

      <View style={styles.strip}>
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: '#1f6f5b' }]}>{submitted.length}</Text>
          <Text style={styles.stripLabel}>Submitted</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, pending.length > 0 && { color: '#b42318' }]}>{pending.length}</Text>
          <Text style={styles.stripLabel}>Pending</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: pct === 100 ? '#1f6f5b' : pct >= 60 ? '#92400e' : '#b42318' }]}>{pct}%</Text>
          <Text style={styles.stripLabel}>Coverage</Text>
        </View>
      </View>

      {/* Workers who haven't submitted */}
      {pending.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⚠ Not Yet Submitted</Text>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pending.length}</Text>
            </View>
          </View>
          {pending.map((w) => (
            <View key={w.workerEmail} style={styles.pendingCard}>
              <View style={styles.pendingAvatar}>
                <Text style={styles.pendingAvatarText}>{w.workerName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.pendingBody}>
                <Text style={styles.pendingName}>{w.workerName}</Text>
                <Text style={styles.pendingZone}>Zone: {w.zone}</Text>
              </View>
              <View style={styles.noBadge}>
                <Text style={styles.noBadgeText}>PENDING</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Workers who submitted */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✓ Submitted</Text>
        {submitted.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No submissions yet today</Text>
          </View>
        ) : (
          submitted.map((c) => (
            <View key={c.id} style={[styles.submittedCard, !c.allCleared && styles.submittedCardWarning]}>
              <View style={styles.submittedTop}>
                <View style={[styles.submittedAvatar, !c.allCleared && styles.submittedAvatarWarning]}>
                  <Text style={styles.submittedAvatarText}>{c.workerName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.submittedBody}>
                  <Text style={styles.submittedName}>{c.workerName}</Text>
                  <Text style={styles.submittedTime}>{formatTime(c.submittedAt)}</Text>
                </View>
                <View style={[styles.statusBadge, c.allCleared ? styles.statusBadgeOk : styles.statusBadgeWarn]}>
                  <Text style={styles.statusBadgeText}>{c.allCleared ? 'ALL CLEAR' : 'ISSUES'}</Text>
                </View>
              </View>
              <View style={styles.itemsRow}>
                {ITEM_LABELS.map((item) => {
                  const ok = c[item.key] as boolean;
                  return (
                    <View key={item.key} style={[styles.itemPill, ok ? styles.itemPillOk : styles.itemPillFail]}>
                      <Text style={[styles.itemPillText, ok ? styles.itemPillTextOk : styles.itemPillTextFail]}>
                        {ok ? '✓' : '✗'} {item.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  pageHeader: { marginBottom: 16 },
  pageTitle: { color: '#17212b', fontSize: 22, fontWeight: '900' },
  pageSub: { color: '#8fa3b8', fontSize: 12, fontWeight: '600', marginTop: 2 },
  strip: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 20, paddingVertical: 14 },
  stripItem: { alignItems: 'center', flex: 1 },
  stripValue: { color: '#17212b', fontSize: 24, fontWeight: '900' },
  stripLabel: { color: '#8fa3b8', fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  stripDivider: { backgroundColor: '#e5e9ef', width: 1 },
  section: { marginBottom: 20 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 10 },
  sectionTitle: { color: '#17212b', flex: 1, fontSize: 14, fontWeight: '900' },
  pendingBadge: { backgroundColor: '#b42318', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  pendingBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
  pendingCard: { alignItems: 'center', backgroundColor: '#fff5f5', borderColor: '#fca5a5', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 8, padding: 12 },
  pendingAvatar: { alignItems: 'center', backgroundColor: '#b42318', borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  pendingAvatarText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  pendingBody: { flex: 1 },
  pendingName: { color: '#17212b', fontSize: 13, fontWeight: '800' },
  pendingZone: { color: '#8fa3b8', fontSize: 11, fontWeight: '600', marginTop: 1 },
  noBadge: { backgroundColor: '#fee2e2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  noBadgeText: { color: '#b42318', fontSize: 10, fontWeight: '900' },
  emptyCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, padding: 16 },
  emptyText: { color: '#8fa3b8', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  submittedCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 14 },
  submittedCardWarning: { borderColor: '#fcd34d' },
  submittedTop: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 12 },
  submittedAvatar: { alignItems: 'center', backgroundColor: '#1f6f5b', borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  submittedAvatarWarning: { backgroundColor: '#b45309' },
  submittedAvatarText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  submittedBody: { flex: 1 },
  submittedName: { color: '#17212b', fontSize: 13, fontWeight: '800' },
  submittedTime: { color: '#8fa3b8', fontSize: 11, fontWeight: '600', marginTop: 1 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeOk: { backgroundColor: '#f0fdf4' },
  statusBadgeWarn: { backgroundColor: '#fffbeb' },
  statusBadgeText: { fontSize: 10, fontWeight: '900', color: '#5d6875' },
  itemsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  itemPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  itemPillOk: { backgroundColor: '#f0fdf4' },
  itemPillFail: { backgroundColor: '#fff5f5' },
  itemPillText: { fontSize: 11, fontWeight: '800' },
  itemPillTextOk: { color: '#15803d' },
  itemPillTextFail: { color: '#b42318' },
});
