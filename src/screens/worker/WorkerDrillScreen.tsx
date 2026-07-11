import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { InputField } from '../../components/InputField';
import { startDrillOperation, signOffDrillStep, getMyDrillOperations } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type DrillOp = {
  id: number;
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

type StepStatus = 'done' | 'active' | 'locked';

type Props = { session: AuthSession };

const DRILL_TYPES = ['Rotary', 'Percussion', 'Diamond Core', 'DTH', 'Auger'];
const ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D'];

const STEPS: { key: string; label: string; description: string; icon: string }[] = [
  { key: 'setup', label: 'Setup & Safety Check', description: 'Equipment inspected, area secured', icon: '🔧' },
  { key: 'drilling', label: 'Drilling', description: 'Active drilling in progress', icon: '⛏' },
  { key: 'blasting', label: 'Blasting', description: 'Controlled blasting executed', icon: '💥' },
  { key: 'cleanup', label: 'Cleanup & Close', description: 'Area cleared, equipment secured', icon: '✅' },
];

function getStepStatus(drill: DrillOp, stepKey: string): StepStatus {
  const completedMap: Record<string, boolean> = {
    setup: drill.stepSetupComplete,
    drilling: drill.stepDrillingComplete,
    blasting: drill.stepBlastingComplete,
    cleanup: drill.stepCleanupComplete,
  };
  const prevMap: Record<string, boolean> = {
    setup: true,
    drilling: drill.stepSetupComplete,
    blasting: drill.stepDrillingComplete,
    cleanup: drill.stepBlastingComplete,
  };
  if (completedMap[stepKey]) return 'done';
  if (prevMap[stepKey]) return 'active';
  return 'locked';
}

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

export function WorkerDrillScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [drills, setDrills] = useState<DrillOp[]>([]);
  const [zone, setZone] = useState('Zone A');
  const [drillType, setDrillType] = useState('Rotary');
  const [equipmentCode, setEquipmentCode] = useState('EX-01');
  const [stepNotes, setStepNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getMyDrillOperations().then(setDrills).catch(() => {});
  }, []);

  async function startDrill() {
    setLoading(true);
    try {
      const op = await startDrillOperation({ zone, drillType, equipmentCode });
      setDrills((c) => [op, ...c]);
      Alert.alert('Drill started', `${drillType} in ${zone} — sign off each step as you go.`);
    } catch {
      Alert.alert('Failed', 'Could not start drill operation.');
    } finally {
      setLoading(false);
    }
  }

  async function signOff(drillId: number, step: string) {
    try {
      const updated = await signOffDrillStep(drillId, { step, notes: stepNotes[`${drillId}-${step}`] ?? '' });
      setDrills((c) => c.map((d) => (d.id === updated.id ? updated : d)));
      setStepNotes((c) => ({ ...c, [`${drillId}-${step}`]: '' }));
      if (updated.status === 'COMPLETED') {
        Alert.alert('Operation complete', 'All steps signed off.');
      } else {
        Alert.alert('Signed off', `${step} confirmed.`);
      }
    } catch (error: any) {
      const msg = error?.message ?? '';
      if (msg.includes('400')) {
        Alert.alert('Out of order', 'Complete the previous step first.');
      } else {
        Alert.alert('Failed', 'Could not sign off this step.');
      }
    }
  }

  const activeDrills = drills.filter((d) => d.status === 'IN_PROGRESS');
  const completedDrills = drills.filter((d) => d.status === 'COMPLETED');

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Drill Operations</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>⛏ Start New Operation</Text>

        <Text style={styles.fieldLabel}>Zone</Text>
        <View style={styles.pillRow}>
          {ZONES.map((z) => (
            <Pressable key={z} onPress={() => setZone(z)} style={[styles.pill, zone === z && styles.pillActive]}>
              <Text style={[styles.pillText, zone === z && styles.pillActiveText]}>{z}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Drill Type</Text>
        <View style={styles.pillRow}>
          {DRILL_TYPES.map((t) => (
            <Pressable key={t} onPress={() => setDrillType(t)} style={[styles.pill, drillType === t && styles.pillActive]}>
              <Text style={[styles.pillText, drillType === t && styles.pillActiveText]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        <InputField label="Equipment Code" onChangeText={setEquipmentCode} value={equipmentCode} placeholder="e.g. EX-01" />
        <ActionButton label={loading ? 'Starting...' : 'Start Drill Operation'} onPress={startDrill} />
      </View>

      {activeDrills.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Active Operations</Text>
          {activeDrills.map((drill) => (
            <View key={drill.id} style={styles.drillCard}>
              <View style={styles.drillHeader}>
                <View>
                  <Text style={styles.drillType}>{drill.drillType}</Text>
                  <Text style={styles.drillMeta}>{drill.zone} · {drill.equipmentCode}</Text>
                </View>
                <View style={styles.inProgressBadge}>
                  <Text style={styles.inProgressText}>In Progress</Text>
                </View>
              </View>
              <Text style={styles.drillStarted}>Started {formatTime(drill.startedAt)}</Text>

              {STEPS.map((step) => {
                const status = getStepStatus(drill, step.key);
                return (
                  <View key={step.key} style={[styles.step, status === 'done' && styles.stepDone, status === 'locked' && styles.stepLocked]}>
                    <View style={styles.stepLeft}>
                      <View style={[styles.stepDot, status === 'done' ? styles.stepDotDone : status === 'active' ? styles.stepDotActive : styles.stepDotLocked]}>
                        <Text style={styles.stepDotText}>{status === 'done' ? '✓' : step.icon}</Text>
                      </View>
                      <View style={styles.stepBody}>
                        <Text style={[styles.stepLabel, status === 'done' && styles.stepLabelDone, status === 'locked' && styles.stepLabelLocked]}>
                          {step.label}
                        </Text>
                        <Text style={styles.stepDesc}>{step.description}</Text>
                      </View>
                    </View>
                    {status === 'active' ? (
                      <View style={styles.stepAction}>
                        <InputField
                          label=""
                          placeholder="Notes (optional)..."
                          onChangeText={(t) => setStepNotes((c) => ({ ...c, [`${drill.id}-${step.key}`]: t }))}
                          value={stepNotes[`${drill.id}-${step.key}`] ?? ''}
                        />
                        <Pressable onPress={() => signOff(drill.id, step.key)} style={styles.signOffBtn}>
                          <Text style={styles.signOffBtnText}>Sign Off ✓</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}
        </>
      ) : null}

      {completedDrills.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Completed</Text>
          {completedDrills.slice(0, 5).map((drill) => (
            <View key={drill.id} style={styles.completedCard}>
              <View style={styles.completedLeft}>
                <View style={styles.completedCheck}>
                  <Text style={styles.completedCheckText}>✓</Text>
                </View>
                <View>
                  <Text style={styles.drillType}>{drill.drillType} — {drill.zone}</Text>
                  <Text style={styles.drillMeta}>{formatTime(drill.startedAt)}</Text>
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
          <Text style={styles.emptySub}>Start one above</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 40 },
    pageTitle: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 16 },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 16 },
    cardTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 14 },
    fieldLabel: { color: theme.textSub, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
    pill: { borderColor: theme.border, borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
    pillActive: { backgroundColor: theme.bgHero, borderColor: theme.bgHero },
    pillText: { color: theme.textMuted, fontSize: 12, fontWeight: '800' },
    pillActiveText: { color: '#ffffff' },
    sectionTitle: { color: theme.text, fontSize: 16, fontWeight: '900', marginBottom: 12 },
    drillCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
    drillHeader: { alignItems: 'center', backgroundColor: theme.bgHero, flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
    drillType: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
    drillMeta: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', marginTop: 2 },
    inProgressBadge: { backgroundColor: 'rgba(74,222,128,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    inProgressText: { color: '#4ade80', fontSize: 11, fontWeight: '800' },
    drillStarted: { color: theme.textMuted, fontSize: 11, fontWeight: '700', paddingHorizontal: 14, paddingVertical: 8 },
    step: { borderTopColor: theme.bg, borderTopWidth: 1, padding: 14 },
    stepDone: { backgroundColor: theme.bgCard },
    stepLocked: { opacity: 0.45 },
    stepLeft: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
    stepDot: { alignItems: 'center', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
    stepDotDone: { backgroundColor: theme.accent },
    stepDotActive: { backgroundColor: theme.bgHero },
    stepDotLocked: { backgroundColor: theme.border },
    stepDotText: { fontSize: 16 },
    stepBody: { flex: 1 },
    stepLabel: { color: theme.text, fontSize: 14, fontWeight: '800', marginBottom: 2 },
    stepLabelDone: { color: theme.accent },
    stepLabelLocked: { color: theme.textMuted },
    stepDesc: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
    stepAction: { marginTop: 12 },
    signOffBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 8, marginTop: 6, paddingVertical: 10 },
    signOffBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
    completedCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, marginBottom: 8, padding: 12 },
    completedLeft: { alignItems: 'center', flexDirection: 'row', gap: 12 },
    completedCheck: { alignItems: 'center', backgroundColor: theme.bgInput, borderRadius: 14, height: 28, justifyContent: 'center', width: 28 },
    completedCheckText: { color: theme.accent, fontSize: 14, fontWeight: '900' },
    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 32 },
    emptyIcon: { fontSize: 32, marginBottom: 10 },
    emptyTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
    emptySub: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
  });
}
