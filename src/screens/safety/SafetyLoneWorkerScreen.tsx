import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSiteLoneWorkers, type LoneWorkerStatus } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

export function SafetyLoneWorkerScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

  const [workers, setWorkers] = useState<LoneWorkerStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  async function load() {
    setLoadError(false);
    try {
      setWorkers(await getSiteLoneWorkers());
    } catch {
      setLoadError(true);
    }
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function formatTime(dateStr?: string) {
    if (!dateStr) return '—';
    try { return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return '—'; }
  }

  const activeWorkers = workers.filter((w) => w.active);
  const overdue = activeWorkers.filter((w) => w.deadline && new Date(w.deadline).getTime() < Date.now());
  const onTrack = activeWorkers.filter((w) => !(w.deadline && new Date(w.deadline).getTime() < Date.now()));

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>Lone Worker Monitoring</Text>
      <Text style={styles.subtitle}>{activeWorkers.length} active · Pull to refresh</Text>

      {loadError && (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={theme.danger} />
          <Text style={styles.errorText}>Could not load lone worker data. Pull to retry.</Text>
        </View>
      )}

      {overdue.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overdue Check-ins</Text>
          {overdue.map((w) => (
            <View key={w.id} style={[styles.workerCard, styles.workerCardRed]}>
              <Ionicons name="warning" size={20} color={theme.danger} />
              <View style={styles.workerBody}>
                <Text style={styles.workerName}>{w.workerName ?? 'Unknown'}</Text>
                <Text style={styles.workerMeta}>
                  OVERDUE — missed check-in · {w.intervalMinutes}min interval
                </Text>
              </View>
              <Text style={styles.alertBadge}>ALERT</Text>
            </View>
          ))}
        </View>
      )}

      {onTrack.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Workers</Text>
          {onTrack.map((w) => (
            <View key={w.id} style={[styles.workerCard, styles.workerCardGreen]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.success} />
              <View style={styles.workerBody}>
                <Text style={styles.workerName}>{w.workerName ?? 'Unknown'}</Text>
                <Text style={styles.workerMeta}>
                  Next check-in by {formatTime(w.deadline)} · {w.intervalMinutes}min interval
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {activeWorkers.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="shield-checkmark-outline" size={40} color={theme.textMuted} style={{ marginBottom: 10 }} />
          <Text style={styles.emptyTitle}>No active lone workers</Text>
          <Text style={styles.emptySub}>Workers using the lone worker timer will appear here</Text>
        </View>
      )}
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
    container: { backgroundColor: theme.bg, padding: spacing.xl, paddingBottom: 40 },
    title: { ...typography.h1, color: theme.text, marginBottom: 2 },
    subtitle: { ...typography.caption, color: theme.textMuted, fontWeight: '600', marginBottom: spacing.md },
    errorBanner: { backgroundColor: theme.dangerLight, borderColor: '#fca5a5', borderRadius: 8, borderWidth: 1, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: spacing.lg, padding: spacing.md },
    errorText: { color: theme.danger, fontSize: 13, fontWeight: '600' as const, flex: 1 },
    section: { marginBottom: spacing.lg },
    sectionTitle: { ...typography.h3, color: theme.text, marginBottom: spacing.md },
    workerCard: { alignItems: 'center', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm, padding: 12, ...cardShadow },
    workerCardGreen: { backgroundColor: theme.successLight, borderColor: theme.success },
    workerCardRed: { backgroundColor: theme.dangerLight, borderColor: theme.danger },
    workerBody: { flex: 1 },
    workerName: { ...typography.bodyBold, color: theme.text, marginBottom: 2 },
    workerMeta: { ...typography.caption, color: theme.textSub, fontWeight: '600' },
    alertBadge: { color: theme.danger, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: spacing.xxxl },
    emptyTitle: { ...typography.bodyBold, color: theme.text, marginBottom: spacing.xs },
    emptySub: { ...typography.caption, color: theme.textMuted, textAlign: 'center' },
  });
}
