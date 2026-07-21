import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { getNotices, getSiteHazardAlerts, getDangerZones, getMyVisit, completeVisitInduction, type VisitorVisit } from '../../services/api';
import type { Notice, HazardReport, DangerZone } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

export function GuestHomeScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [myVisit, setMyVisit] = useState<VisitorVisit | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const [n, h, d] = await Promise.all([
      getNotices().catch(() => [] as Notice[]),
      getSiteHazardAlerts().catch(() => [] as HazardReport[]),
      getDangerZones().catch(() => [] as DangerZone[]),
    ]);
    setNotices(n as Notice[]);
    setHazards(h as HazardReport[]);
    setDangerZones(d as DangerZone[]);
    getMyVisit().then(setMyVisit).catch(() => setMyVisit(null));
  }

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function completeInduction() {
    if (!myVisit) {
      Alert.alert('No visit record', 'Your supervisor needs to create a visit record for you first.');
      return;
    }
    if (myVisit.inductionCompleted) {
      Alert.alert('Already complete', 'Induction has already been recorded for this visit.');
      return;
    }
    try {
      const updated = await completeVisitInduction(myVisit.id, session.user.fullName);
      setMyVisit(updated);
      Alert.alert('Induction complete', `Recorded at ${new Date(updated.inductionCompletedAt!).toLocaleTimeString()}.`);
    } catch {
      Alert.alert('Action failed', 'Could not complete induction. Please try again.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>{session.user.fullName} · Visitor</Text>

      {/* Visitor pass card */}
      {myVisit ? (
        <View style={styles.passCard}>
          <View style={styles.passRow}>
            <Ionicons name="card" size={18} color={theme.accent} />
            <Text style={styles.passNumber}>{myVisit.visitorPassNumber ?? 'Pass pending'}</Text>
          </View>
          <Text style={styles.passDetail}>Status: <Text style={{ fontWeight: '900', color: myVisit.status === 'OVERDUE' ? theme.danger : myVisit.status === 'CHECKED_IN' ? theme.success : theme.text }}>{myVisit.status}</Text></Text>
          {myVisit.approvedZones ? <Text style={styles.passDetail}>Approved zones: {myVisit.approvedZones}</Text> : null}
          {myVisit.visitStart ? <Text style={styles.passDetail}>Visit window: {new Date(myVisit.visitStart).toLocaleDateString()} – {myVisit.visitEnd ? new Date(myVisit.visitEnd).toLocaleDateString() : '?'}</Text> : null}
          <View style={styles.inductionRow}>
            {myVisit.inductionCompleted
              ? <><Ionicons name="checkmark-circle" size={16} color={theme.success} /><Text style={[styles.passDetail, { color: theme.success }]}>Induction complete</Text></>
              : <><Ionicons name="alert-circle" size={16} color={theme.amber} /><Text style={[styles.passDetail, { color: theme.amber }]}>Induction not yet completed</Text></>
            }
          </View>
        </View>
      ) : null}

      {/* Safety induction */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Safety Induction Required</Text>
        <Text style={styles.infoText}>All visitors must complete a safety induction before entering the site.</Text>
      </View>
      <ActionButton
        label={myVisit?.inductionCompleted ? 'Induction Complete' : 'Complete Safety Induction'}
        onPress={completeInduction}
        disabled={myVisit?.inductionCompleted}
      />

      <Text style={styles.sectionTitle}>Site Notices</Text>
      {loading ? <Text style={styles.meta}>Loading...</Text> : null}
      {!loading && notices.length === 0 ? <View style={styles.card}><Text style={styles.meta}>No notices</Text></View> : null}
      {notices.slice(0, 5).map((n) => (
        <View key={n.id} style={styles.card}>
          <Text style={styles.cardTitle}>{n.title}</Text>
          <Text style={styles.meta}>{n.message}</Text>
        </View>
      ))}
    </ScrollView>
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
    container: { padding: spacing.xl, paddingBottom: 40, backgroundColor: theme.bg },
    title: { ...typography.h1, color: theme.text, marginBottom: 2 },
    subtitle: { color: theme.textSub, fontSize: 14, fontWeight: '700', marginBottom: spacing.lg },
    sectionTitle: { ...typography.h2, color: theme.text, marginBottom: 10, marginTop: spacing.sm },
    passCard: { backgroundColor: theme.bgCard, borderColor: theme.accent, borderRadius: 10, borderWidth: 1.5, marginBottom: spacing.md, padding: 14, gap: 4, ...cardShadow },
    passRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    passNumber: { color: theme.accent, fontSize: 17, fontWeight: '900' },
    passDetail: { color: theme.textSub, fontSize: 13, fontWeight: '600' },
    inductionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    infoCard: { backgroundColor: theme.infoLight, borderColor: theme.info, borderRadius: 8, borderWidth: 1, marginBottom: spacing.md, padding: 14, ...cardShadow },
    infoTitle: { color: theme.info, fontSize: 14, fontWeight: '800', marginBottom: 4 },
    infoText: { color: theme.info, fontSize: 13, fontWeight: '600', lineHeight: 18 },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14, ...cardShadow },
    cardTitle: { color: theme.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
    meta: { color: theme.textSub, fontSize: 13, fontWeight: '600', marginBottom: 2 },
  });
}
