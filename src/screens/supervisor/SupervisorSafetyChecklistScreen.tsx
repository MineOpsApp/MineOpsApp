import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getSiteChecklistToday } from '../../services/api';
import type { PendingWorker, SafetyChecklist, SiteTodayChecklist } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

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
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

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
    return <View style={styles.centered}><ActivityIndicator color={theme.accent} /></View>;
  }

  const submitted: SafetyChecklist[] = data?.submitted ?? [];
  const pending: PendingWorker[] = data?.pending ?? [];
  const total = submitted.length + pending.length;
  const pct = total > 0 ? Math.round((submitted.length / total) * 100) : 0;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.accent} />}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Safety Checklists</Text>
        <Text style={styles.pageSub}>Today · {data?.date ?? '—'}</Text>
      </View>

      <View style={styles.strip}>
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: theme.accent }]}>{submitted.length}</Text>
          <Text style={styles.stripLabel}>Submitted</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, pending.length > 0 && { color: theme.danger }]}>{pending.length}</Text>
          <Text style={styles.stripLabel}>Pending</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: pct === 100 ? theme.accent : pct >= 60 ? theme.amber : theme.danger }]}>{pct}%</Text>
          <Text style={styles.stripLabel}>Coverage</Text>
        </View>
      </View>

      {pending.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Ionicons name="warning" size={14} color={styles.sectionTitle.color} />
              <Text style={styles.sectionTitle}>Not Yet Submitted</Text>
            </View>
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

      <View style={styles.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="checkmark-circle" size={14} color={styles.sectionTitle.color} />
          <Text style={styles.sectionTitle}>Submitted</Text>
        </View>
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
                    <View key={item.key} style={[styles.itemPill, { flexDirection: 'row', alignItems: 'center', gap: 4 }, ok ? styles.itemPillOk : styles.itemPillFail]}>
                      <Ionicons name={ok ? 'checkmark' : 'close'} size={12} color={(ok ? styles.itemPillTextOk : styles.itemPillTextFail).color} />
                      <Text style={[styles.itemPillText, ok ? styles.itemPillTextOk : styles.itemPillTextFail]}>
                        {item.label}
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

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    centered: { alignItems: 'center', flex: 1, justifyContent: 'center', backgroundColor: theme.bg },
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 40 },
    pageHeader: { marginBottom: 16 },
    pageTitle: { color: theme.text, fontSize: 22, fontWeight: '900' },
    pageSub: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
    strip: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 20, paddingVertical: 14 },
    stripItem: { alignItems: 'center', flex: 1 },
    stripValue: { color: theme.text, fontSize: 24, fontWeight: '900' },
    stripLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
    stripDivider: { backgroundColor: theme.border, width: 1 },
    section: { marginBottom: 20 },
    sectionHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 10 },
    sectionTitle: { color: theme.text, flex: 1, fontSize: 14, fontWeight: '900' },
    pendingBadge: { backgroundColor: theme.danger, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    pendingBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
    pendingCard: { alignItems: 'center', backgroundColor: theme.dangerLight, borderColor: theme.danger, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 8, padding: 12 },
    pendingAvatar: { alignItems: 'center', backgroundColor: theme.danger, borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
    pendingAvatarText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
    pendingBody: { flex: 1 },
    pendingName: { color: theme.text, fontSize: 13, fontWeight: '800' },
    pendingZone: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginTop: 1 },
    noBadge: { backgroundColor: theme.dangerLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    noBadgeText: { color: theme.danger, fontSize: 10, fontWeight: '900' },
    emptyCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, padding: 16 },
    emptyText: { color: theme.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    submittedCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 14 },
    submittedCardWarning: { borderColor: theme.amber },
    submittedTop: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 12 },
    submittedAvatar: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
    submittedAvatarWarning: { backgroundColor: theme.amber },
    submittedAvatarText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
    submittedBody: { flex: 1 },
    submittedName: { color: theme.text, fontSize: 13, fontWeight: '800' },
    submittedTime: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginTop: 1 },
    statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusBadgeOk: { backgroundColor: theme.successLight },
    statusBadgeWarn: { backgroundColor: theme.amberLight },
    statusBadgeText: { fontSize: 10, fontWeight: '900', color: theme.textSub },
    itemsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    itemPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
    itemPillOk: { backgroundColor: theme.successLight },
    itemPillFail: { backgroundColor: theme.dangerLight },
    itemPillText: { fontSize: 11, fontWeight: '800' },
    itemPillTextOk: { color: theme.success },
    itemPillTextFail: { color: theme.danger },
  });
}
