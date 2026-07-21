import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getAllBlasts, getSiteDrillOperations } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type DrillOp = {
  id: number;
  workerName: string;
  zone: string;
  drillType: string;
  stepSetupComplete: boolean;
  stepDrillingComplete: boolean;
  stepBlastingComplete: boolean;
  stepCleanupComplete: boolean;
  status: string;
};

type BlastSchedule = {
  id: number;
  zone: string;
  blastTime: string;
  notes?: string;
  status: string;
  scheduledByName: string;
};

type ZoneStatus = {
  zone: string;
  blast: BlastSchedule | null;
  workersAtBlasting: DrillOp[];
};

type Props = { session: AuthSession };

export function SafetyBlastDrillOverviewScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

  const [blasts, setBlasts] = useState<BlastSchedule[]>([]);
  const [drills, setDrills] = useState<DrillOp[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [now, setNow] = useState(Date.now());

  async function load() {
    setLoadError(false);
    try {
      const [allBlasts, allDrills] = await Promise.all([
        getAllBlasts(),
        getSiteDrillOperations(),
      ]);
      setBlasts((allBlasts as BlastSchedule[]).filter((b) => b.status === 'SCHEDULED'));
      setDrills((allDrills as DrillOp[]).filter((d) => d.status === 'IN_PROGRESS'));
    } catch {
      setLoadError(true);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function formatCountdown(blastTime: string): string {
    const ms = new Date(blastTime).getTime() - now;
    if (ms <= 0) return 'Imminent';
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `in ${mins}m`;
    return `in ${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  function formatTime(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
  }

  // Workers whose blasting step is currently active (drilling done, blasting not signed off yet)
  const workersAtBlasting = drills.filter(
    (d) => d.stepSetupComplete && d.stepDrillingComplete && !d.stepBlastingComplete,
  );

  const zones = [...new Set([...blasts.map((b) => b.zone), ...workersAtBlasting.map((d) => d.zone)])];
  const zoneStatuses: ZoneStatus[] = zones.map((zone) => ({
    zone,
    blast: blasts.find((b) => b.zone === zone) ?? null,
    workersAtBlasting: workersAtBlasting.filter((d) => d.zone === zone),
  }));

  // Most critical (workers at blasting step with no blast scheduled) first
  zoneStatuses.sort((a, b) => {
    const aRed = a.workersAtBlasting.length > 0 && !a.blast;
    const bRed = b.workersAtBlasting.length > 0 && !b.blast;
    if (aRed && !bRed) return -1;
    if (!aRed && bRed) return 1;
    return 0;
  });

  const unlinked = zoneStatuses.filter((z) => z.workersAtBlasting.length > 0 && !z.blast).length;
  const otherDrills = drills.filter(
    (d) => !(d.stepSetupComplete && d.stepDrillingComplete && !d.stepBlastingComplete),
  );

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>Blast & Drill Overview</Text>
      <Text style={styles.subtitle}>
        {drills.length} active drill{drills.length !== 1 ? 's' : ''} · {workersAtBlasting.length} at blasting step · Pull to refresh
      </Text>

      {loadError && (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={theme.danger} />
          <Text style={styles.errorText}>Could not load data. Pull to retry.</Text>
        </View>
      )}

      {unlinked > 0 && (
        <View style={styles.alertBanner}>
          <Ionicons name="warning" size={16} color={theme.amber} />
          <Text style={styles.alertText}>
            {unlinked} zone{unlinked !== 1 ? 's have' : ' has'} workers at the blasting step with no scheduled blast
          </Text>
        </View>
      )}

      {zoneStatuses.length === 0 && !loadError ? (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="bomb" size={40} color={theme.textMuted} style={{ marginBottom: 10 }} />
          <Text style={styles.emptyTitle}>No active blast activity</Text>
          <Text style={styles.emptySub}>Zones with scheduled blasts or drills at the blasting step appear here</Text>
        </View>
      ) : (
        <>
          {zoneStatuses.length > 0 && <Text style={styles.sectionTitle}>Blast Zone Status</Text>}
          {zoneStatuses.map((z) => {
            const hasBlast = !!z.blast;
            const hasWorkers = z.workersAtBlasting.length > 0;
            const aligned = hasBlast && hasWorkers;
            const warning = hasWorkers && !hasBlast;
            const borderColor = warning ? theme.danger : aligned ? theme.success : theme.amber;
            const bgColor = warning ? theme.dangerLight : aligned ? theme.successLight : theme.amberLight;

            return (
              <View key={z.zone} style={[styles.zoneCard, { borderColor, backgroundColor: bgColor }]}>
                <View style={styles.zoneHeader}>
                  <Text style={styles.zoneName}>{z.zone}</Text>
                  {warning ? (
                    <View style={[styles.badge, { backgroundColor: theme.dangerLight, borderColor: theme.danger }]}>
                      <Text style={[styles.badgeText, { color: theme.danger }]}>NO CLEARANCE</Text>
                    </View>
                  ) : aligned ? (
                    <View style={[styles.badge, { backgroundColor: theme.successLight, borderColor: theme.success }]}>
                      <Text style={[styles.badgeText, { color: theme.success }]}>ALIGNED</Text>
                    </View>
                  ) : (
                    <View style={[styles.badge, { backgroundColor: theme.amberLight, borderColor: theme.amber }]}>
                      <Text style={[styles.badgeText, { color: theme.amber }]}>BLAST PENDING</Text>
                    </View>
                  )}
                </View>

                {hasBlast && (
                  <View style={styles.blastRow}>
                    <MaterialCommunityIcons name="bomb" size={14} color={theme.textSub} />
                    <Text style={styles.blastLabel}>
                      Blast at {formatTime(z.blast!.blastTime)} · {formatCountdown(z.blast!.blastTime)}
                    </Text>
                    {z.blast!.notes ? <Text style={styles.blastNotes}> — {z.blast!.notes}</Text> : null}
                  </View>
                )}

                {hasWorkers ? (
                  z.workersAtBlasting.map((w) => (
                    <View key={w.id} style={styles.workerRow}>
                      <Ionicons name="person" size={14} color={warning ? theme.danger : theme.textSub} />
                      <Text style={[styles.workerLabel, warning && { color: theme.danger }]}>
                        {w.workerName} · {w.drillType} — awaiting blast sign-off
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.workerRow}>
                    <Ionicons name="person-outline" size={14} color={theme.textMuted} />
                    <Text style={styles.noWorkerText}>No workers at blasting step</Text>
                  </View>
                )}
              </View>
            );
          })}

          {otherDrills.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Other Active Drills</Text>
              {otherDrills.map((d) => {
                const step = !d.stepSetupComplete ? 'Setup' :
                  !d.stepDrillingComplete ? 'Drilling' :
                  !d.stepCleanupComplete ? 'Cleanup' : 'In Progress';
                return (
                  <View key={d.id} style={styles.drillRow}>
                    <Ionicons name="construct-outline" size={16} color={theme.textMuted} />
                    <View style={styles.drillBody}>
                      <Text style={styles.drillWorker}>{d.workerName}</Text>
                      <Text style={styles.drillMeta}>{d.zone} · {d.drillType} · {step}</Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </>
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
    errorBanner: { alignItems: 'center' as const, backgroundColor: theme.dangerLight, borderColor: '#fca5a5', borderRadius: 8, borderWidth: 1, flexDirection: 'row' as const, gap: 8, marginBottom: spacing.lg, padding: spacing.md },
    errorText: { color: theme.danger, flex: 1, fontSize: 13, fontWeight: '600' as const },
    alertBanner: { alignItems: 'center' as const, backgroundColor: theme.amberLight, borderColor: theme.amber, borderRadius: 8, borderWidth: 1, flexDirection: 'row' as const, gap: 8, marginBottom: spacing.lg, padding: spacing.md },
    alertText: { color: theme.amber, flex: 1, fontSize: 13, fontWeight: '700' as const },
    sectionTitle: { ...typography.h3, color: theme.text, marginBottom: spacing.md },
    zoneCard: { borderRadius: 12, borderWidth: 1.5, marginBottom: spacing.md, padding: spacing.md, ...cardShadow },
    zoneHeader: { alignItems: 'center' as const, flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: spacing.sm },
    zoneName: { ...typography.h2, color: theme.text },
    badge: { borderRadius: 4, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
    badgeText: { fontSize: 9, fontWeight: '900' as const },
    blastRow: { alignItems: 'center' as const, flexDirection: 'row' as const, gap: 6, marginBottom: 6 },
    blastLabel: { color: theme.textSub, fontSize: 12, fontWeight: '700' as const },
    blastNotes: { color: theme.textMuted, flex: 1, fontSize: 11 },
    workerRow: { alignItems: 'center' as const, flexDirection: 'row' as const, gap: 6, marginTop: 4 },
    workerLabel: { color: theme.textSub, flex: 1, fontSize: 12, fontWeight: '700' as const },
    noWorkerText: { color: theme.textMuted, fontSize: 12, fontWeight: '600' as const },
    drillRow: { alignItems: 'center' as const, backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, flexDirection: 'row' as const, gap: spacing.md, marginBottom: spacing.sm, padding: spacing.md, ...cardShadow },
    drillBody: { flex: 1 },
    drillWorker: { ...typography.bodyBold, color: theme.text, fontSize: 13 },
    drillMeta: { ...typography.caption, color: theme.textMuted },
    emptyCard: { alignItems: 'center' as const, backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: spacing.xxxl },
    emptyTitle: { ...typography.bodyBold, color: theme.text, marginBottom: spacing.xs },
    emptySub: { ...typography.caption, color: theme.textMuted, textAlign: 'center' as const },
  });
}
