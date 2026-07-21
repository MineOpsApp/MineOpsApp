import { useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getVisitorVisits, checkInVisit, checkOutVisit, type VisitorVisit } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

const STATUS_STYLE: Record<string, { bg: string; textColor: string }> = {
  PENDING: { bg: '#f3f4f6', textColor: '#6b7280' },
  CHECKED_IN: { bg: '#dcfce7', textColor: '#166534' },
  CHECKED_OUT: { bg: '#e0f2fe', textColor: '#0369a1' },
  OVERDUE: { bg: '#fee2e2', textColor: '#b91c1c' },
};

function StatusBadge({ status, theme }: { status: string; theme: Theme }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.PENDING;
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ color: s.textColor, fontSize: 11, fontWeight: '900' }}>{status.replace('_', ' ')}</Text>
    </View>
  );
}

export function SupervisorVisitorRecordsScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [visits, setVisits] = useState<VisitorVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const data = await getVisitorVisits();
      setVisits(data.map(v => computeStatus(v)));
    } catch { /* best-effort */ }
    finally { setLoading(false); }
  }

  function computeStatus(v: VisitorVisit): VisitorVisit {
    if (v.status === 'CHECKED_IN' && v.visitEnd && new Date() > new Date(v.visitEnd)) {
      return { ...v, status: 'OVERDUE' };
    }
    return v;
  }

  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function handleCheckIn(visit: VisitorVisit) {
    if (!visit.inductionCompleted) {
      Alert.alert('Induction required', 'Visitor must complete safety induction before check-in.');
      return;
    }
    try {
      const updated = await checkInVisit(visit.id);
      setVisits(prev => prev.map(v => v.id === updated.id ? computeStatus(updated) : v));
    } catch (e: any) {
      Alert.alert('Check-in failed', e?.message ?? 'Please try again.');
    }
  }

  async function handleCheckOut(visit: VisitorVisit) {
    Alert.alert('Check out', `Check out visitor ${visit.visitorPassNumber ?? '#' + visit.id}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check Out',
        onPress: async () => {
          try {
            const updated = await checkOutVisit(visit.id);
            setVisits(prev => prev.map(v => v.id === updated.id ? computeStatus(updated) : v));
          } catch { Alert.alert('Failed', 'Could not check out visitor.'); }
        },
      },
    ]);
  }

  if (loading) {
    return <View style={styles.centered}><Text style={styles.loadingText}>Loading visitor records…</Text></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text style={styles.title}>Visitor Records</Text>
      <Text style={styles.sub}>{session.user.assignedSite} · {visits.length} visit{visits.length !== 1 ? 's' : ''}</Text>

      {visits.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={40} color={theme.textMuted} style={{ marginBottom: 10 }} />
          <Text style={styles.emptyTitle}>No visits yet</Text>
          <Text style={styles.emptySub}>Visitor records will appear here once a guest code is redeemed.</Text>
        </View>
      ) : null}

      {visits.map((v) => (
        <View key={v.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.passNum}>{v.visitorPassNumber ?? 'Pass pending'}</Text>
              <StatusBadge status={v.status} theme={theme} />
            </View>
            {v.inductionCompleted
              ? <Ionicons name="shield-checkmark" size={18} color={theme.success} />
              : <Ionicons name="alert-circle" size={18} color={theme.amber} />
            }
          </View>

          {v.purposeOfVisit ? <Text style={styles.purpose}>{v.purposeOfVisit}</Text> : null}
          {v.visitingOrganisation ? <Text style={styles.detail}>Org: {v.visitingOrganisation}</Text> : null}
          {v.approvedZones ? <Text style={styles.detail}>Zones: {v.approvedZones}</Text> : null}
          {v.visitStart ? (
            <Text style={styles.detail}>
              Window: {new Date(v.visitStart).toLocaleDateString()} – {v.visitEnd ? new Date(v.visitEnd).toLocaleDateString() : '?'}
            </Text>
          ) : null}
          {v.checkInAt ? <Text style={styles.detail}>Checked in: {new Date(v.checkInAt).toLocaleString()}</Text> : null}
          {v.checkOutAt ? <Text style={styles.detail}>Checked out: {new Date(v.checkOutAt).toLocaleString()}</Text> : null}

          <View style={styles.actions}>
            {v.status === 'PENDING' && (
              <Pressable style={styles.actionBtn} onPress={() => handleCheckIn(v)}>
                <Ionicons name="log-in-outline" size={14} color="#fff" />
                <Text style={styles.actionBtnText}>Check In</Text>
              </Pressable>
            )}
            {v.status === 'CHECKED_IN' || v.status === 'OVERDUE' ? (
              <Pressable style={[styles.actionBtn, { backgroundColor: theme.textMuted }]} onPress={() => handleCheckOut(v)}>
                <Ionicons name="log-out-outline" size={14} color="#fff" />
                <Text style={styles.actionBtnText}>Check Out</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { padding: spacing.xl, paddingBottom: 40, backgroundColor: theme.bg },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
    loadingText: { color: theme.textSub, fontSize: 14, fontWeight: '600' },
    title: { ...typography.h1, color: theme.text, marginBottom: 2 },
    sub: { color: theme.textSub, fontSize: 13, fontWeight: '600', marginBottom: spacing.lg },
    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: spacing.xxxl },
    emptyTitle: { ...typography.bodyBold, color: theme.text, marginBottom: spacing.xs },
    emptySub: { ...typography.caption, color: theme.textMuted, textAlign: 'center' },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.md, padding: spacing.md },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.xs },
    passNum: { color: theme.accent, fontSize: 15, fontWeight: '900', marginBottom: 4 },
    purpose: { color: theme.text, fontSize: 14, fontWeight: '700', marginTop: 6 },
    detail: { color: theme.textSub, fontSize: 13, fontWeight: '600', marginTop: 2 },
    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    actionBtn: { backgroundColor: theme.accent, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8 },
    actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  });
}
