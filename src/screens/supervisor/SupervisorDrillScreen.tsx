import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getSiteDrillOperations } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type DrillOp = {
  id: number;
  workerName: string;
  workerEmail: string;
  zone: string;
  drillType: string;
  equipmentCode: string;
  status: string;
  stepSetupComplete: boolean;
  stepDrillingComplete: boolean;
  stepBlastingComplete: boolean;
  stepCleanupComplete: boolean;
  startedAt: string;
  completedAt: string | null;
};

type Props = { session: AuthSession };

const STEPS = [
  { key: 'stepSetupComplete', label: 'Setup' },
  { key: 'stepDrillingComplete', label: 'Drilling' },
  { key: 'stepBlastingComplete', label: 'Blasting' },
  { key: 'stepCleanupComplete', label: 'Cleanup' },
];

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}

export function SupervisorDrillScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [drills, setDrills] = useState<DrillOp[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  function load() { return getSiteDrillOperations().then(setDrills).catch(() => {}); }
  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  const active = drills.filter((d) => d.status === 'IN_PROGRESS');
  const completed = drills.filter((d) => d.status === 'COMPLETED');

  function getProgress(drill: DrillOp): number {
    return [drill.stepSetupComplete, drill.stepDrillingComplete, drill.stepBlastingComplete, drill.stepCleanupComplete]
      .filter(Boolean).length;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Drill Operations</Text>
        <Text style={styles.pageSub}>Pull to refresh</Text>
      </View>

      {/* Stats */}
      <View style={styles.strip}>
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, active.length > 0 && { color: theme.amber }]}>{active.length}</Text>
          <Text style={styles.stripLabel}>Active</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: theme.accent }]}>{completed.length}</Text>
          <Text style={styles.stripLabel}>Completed</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={styles.stripValue}>{drills.length}</Text>
          <Text style={styles.stripLabel}>Total</Text>
        </View>
      </View>

      {/* Active operations */}
      {active.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Active Operations</Text>
          {active.map((drill) => {
            const progress = getProgress(drill);
            return (
              <View key={drill.id} style={styles.drillCard}>
                <View style={styles.drillHeader}>
                  <View>
                    <Text style={styles.drillType}>{drill.drillType}</Text>
                    <Text style={styles.drillMeta}>{drill.zone} · {drill.equipmentCode}</Text>
                  </View>
                  <View style={styles.progressBadge}>
                    <Text style={styles.progressText}>{progress}/4 steps</Text>
                  </View>
                </View>

                <Text style={styles.drillWorker}>👷 {drill.workerName}</Text>
                <Text style={styles.drillStarted}>Started {formatTime(drill.startedAt)}</Text>

                {/* Step progress bar */}
                <View style={styles.stepRow}>
                  {STEPS.map((step) => {
                    const done = drill[step.key as keyof DrillOp] as boolean;
                    return (
                      <View key={step.key} style={styles.stepItem}>
                        <View style={[styles.stepDot, done ? styles.stepDotDone : styles.stepDotPending]} />
                        <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{step.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </>
      ) : (
        <View style={styles.clearCard}>
          <Text style={styles.clearIcon}>✓</Text>
          <View>
            <Text style={styles.clearTitle}>No active drill operations</Text>
            <Text style={styles.clearSub}>All clear on site</Text>
          </View>
        </View>
      )}

      {/* Completed */}
      {completed.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Completed</Text>
          {completed.map((drill) => (
            <View key={drill.id} style={styles.completedCard}>
              <View style={styles.completedLeft}>
                <View style={styles.completedCheck}>
                  <Text style={styles.completedCheckText}>✓</Text>
                </View>
                <View style={styles.completedBody}>
                  <Text style={styles.completedType}>{drill.drillType} — {drill.zone}</Text>
                  <Text style={styles.completedMeta}>👷 {drill.workerName} · {formatTime(drill.startedAt)}</Text>
                </View>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {drills.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>⛏</Text>
          <Text style={styles.emptyTitle}>No drill operations yet</Text>
          <Text style={styles.emptySub}>Workers log drill operations from their app</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 40 },
    pageHeader: { marginBottom: 16 },
    pageTitle: { color: theme.text, fontSize: 22, fontWeight: '900' },
    pageSub: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
    strip: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 20, paddingVertical: 14 },
    stripItem: { alignItems: 'center', flex: 1 },
    stripValue: { color: theme.text, fontSize: 20, fontWeight: '900' },
    stripLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
    stripDivider: { backgroundColor: theme.border, width: 1 },
    sectionTitle: { color: theme.text, fontSize: 16, fontWeight: '900', marginBottom: 12 },
    drillCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
    drillHeader: { alignItems: 'center', backgroundColor: theme.bgHero, flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
    drillType: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
    drillMeta: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', marginTop: 2 },
    progressBadge: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    progressText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
    drillWorker: { color: theme.text, fontSize: 13, fontWeight: '700', paddingHorizontal: 14, paddingTop: 12 },
    drillStarted: { color: theme.textMuted, fontSize: 11, fontWeight: '700', paddingBottom: 10, paddingHorizontal: 14 },
    stepRow: { borderTopColor: theme.bgInput, borderTopWidth: 1, flexDirection: 'row', padding: 14 },
    stepItem: { alignItems: 'center', flex: 1 },
    stepDot: { borderRadius: 8, height: 16, marginBottom: 4, width: 16 },
    stepDotDone: { backgroundColor: theme.accent },
    stepDotPending: { backgroundColor: theme.border },
    stepLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', textAlign: 'center' },
    stepLabelDone: { color: theme.accent },
    clearCard: { alignItems: 'center', backgroundColor: theme.successLight, borderColor: theme.success, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 16, padding: 16 },
    clearIcon: { color: theme.success, fontSize: 22 },
    clearTitle: { color: theme.success, fontSize: 14, fontWeight: '900' },
    clearSub: { color: theme.success, fontSize: 12, fontWeight: '600', marginTop: 2 },
    completedCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, marginBottom: 8, padding: 12 },
    completedLeft: { alignItems: 'center', flexDirection: 'row', gap: 12 },
    completedCheck: { alignItems: 'center', backgroundColor: theme.accentLight, borderRadius: 14, height: 28, justifyContent: 'center', width: 28 },
    completedCheckText: { color: theme.accent, fontSize: 14, fontWeight: '900' },
    completedBody: { flex: 1 },
    completedType: { color: theme.text, fontSize: 13, fontWeight: '800', marginBottom: 2 },
    completedMeta: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 32 },
    emptyIcon: { fontSize: 32, marginBottom: 10 },
    emptyTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
    emptySub: { color: theme.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  });
}
