import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMyChecklistToday, submitSafetyChecklist } from '../../services/api';
import { enqueue } from '../../utils/offlineQueue';
import type { ChecklistPayload, SafetyChecklist } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

type ItemKey = keyof ChecklistPayload;

const ITEMS: { key: ItemKey; label: string; sub: string }[] = [
  { key: 'ppeHelmet',                label: 'Safety Helmet',             sub: 'Worn, undamaged, chin strap secure' },
  { key: 'ppeBoots',                 label: 'Safety Boots',              sub: 'Steel-toe, no visible damage' },
  { key: 'ppeGloves',                label: 'Gloves',                    sub: 'Appropriate type for task, no tears' },
  { key: 'ppeVest',                  label: 'High-Vis Vest',             sub: 'Clean, reflective strips intact' },
  { key: 'equipmentChecked',         label: 'Equipment Checked',         sub: 'Pre-start inspection completed' },
  { key: 'communicationDevice',      label: 'Communication Device',      sub: 'Radio / phone charged and working' },
  { key: 'emergencyExitsClear',      label: 'Emergency Exits Clear',     sub: 'No obstructions, signs visible' },
  { key: 'hazardousMaterialsSecured', label: 'Hazardous Materials',      sub: 'Properly stored and labelled' },
];

const EMPTY_PAYLOAD: ChecklistPayload = {
  ppeHelmet: false,
  ppeBoots: false,
  ppeGloves: false,
  ppeVest: false,
  equipmentChecked: false,
  communicationDevice: false,
  emergencyExitsClear: false,
  hazardousMaterialsSecured: false,
};

function formatTime(dt: string) {
  try { return new Date(dt).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' }); }
  catch { return dt; }
}

export function WorkerSafetyChecklistScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [existing, setExisting] = useState<SafetyChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checks, setChecks] = useState<ChecklistPayload>(EMPTY_PAYLOAD);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function load() {
    const today = await getMyChecklistToday().catch(() => null);
    setExisting(today);
    if (today) {
      setChecks({
        ppeHelmet: today.ppeHelmet,
        ppeBoots: today.ppeBoots,
        ppeGloves: today.ppeGloves,
        ppeVest: today.ppeVest,
        equipmentChecked: today.equipmentChecked,
        communicationDevice: today.communicationDevice,
        emergencyExitsClear: today.emergencyExitsClear,
        hazardousMaterialsSecured: today.hazardousMaterialsSecured,
      });
    }
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function toggle(key: ItemKey) {
    if (existing && !submitted) return;
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit() {
    const allChecked = Object.values(checks).every(Boolean);
    if (!allChecked) {
      Alert.alert(
        'Incomplete Checklist',
        'All items must be confirmed before submitting. If something is not cleared, report a hazard first.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSubmitting(true);
    try {
      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected && netState.isInternetReachable !== false;
      if (!isOnline) {
        await enqueue('safetyChecklist', checks as Record<string, unknown>);
        Alert.alert('Saved offline', 'Checklist queued — will sync automatically when you reconnect.');
        setSubmitting(false);
        return;
      }
      const saved = await submitSafetyChecklist(checks);
      setExisting(saved);
      setSubmitted(true);
    } catch (e: any) {
      Alert.alert('Submit Failed', e?.message ?? 'Could not submit. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function startResubmit() {
    Alert.alert(
      'Update Checklist',
      'You have already submitted today. Do you want to update your checklist?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Update', onPress: () => setSubmitted(false) },
      ]
    );
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={theme.accent} /></View>;
  }

  const allChecked = Object.values(checks).every(Boolean);
  const checkedCount = Object.values(checks).filter(Boolean).length;
  const isReadOnly = !!existing && !submitted;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.accent} />}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Shift Safety Check</Text>
        <Text style={styles.pageSub}>Complete before starting work each shift</Text>
      </View>

      {isReadOnly ? (
        <View style={styles.doneCard}>
          <Ionicons name="checkmark-circle" size={26} color={theme.success} />
          <View style={styles.doneBody}>
            <Text style={styles.doneTitle}>Checklist submitted</Text>
            <Text style={styles.doneSub}>Submitted at {formatTime(existing!.submittedAt)}</Text>
          </View>
          <Pressable onPress={startResubmit} style={styles.updateBtn}>
            <Text style={styles.updateBtnText}>Update</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.progressCard}>
          <Text style={styles.progressText}>{checkedCount} / {ITEMS.length} items confirmed</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(checkedCount / ITEMS.length) * 100}%` as any }]} />
          </View>
        </View>
      )}

      <View style={styles.itemsCard}>
        {ITEMS.map((item, idx) => {
          const checked = checks[item.key];
          return (
            <Pressable
              key={item.key}
              onPress={() => toggle(item.key)}
              style={[styles.item, idx < ITEMS.length - 1 && styles.itemBorder]}
              disabled={isReadOnly}
            >
              <View style={[styles.checkbox, checked && styles.checkboxDone]}>
                {checked && <Ionicons name="checkmark" size={16} color="#ffffff" />}
              </View>
              <View style={styles.itemBody}>
                <Text style={[styles.itemLabel, checked && styles.itemLabelDone]}>{item.label}</Text>
                <Text style={styles.itemSub}>{item.sub}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {!isReadOnly && (
        <Pressable
          onPress={handleSubmit}
          style={[styles.submitBtn, (!allChecked || submitting) && styles.submitBtnDisabled]}
          disabled={submitting}
        >
          <Text style={styles.submitBtnText}>
            {submitting ? 'Submitting…' : allChecked ? 'Submit Checklist' : `${ITEMS.length - checkedCount} items remaining`}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    centered: { alignItems: 'center', flex: 1, justifyContent: 'center' },
    container: { backgroundColor: theme.bg, padding: spacing.xl, paddingBottom: 40 },
    pageHeader: { marginBottom: spacing.lg },
    pageTitle: { ...typography.h1, color: theme.text },
    pageSub: { ...typography.caption, color: theme.textMuted, marginTop: 2 },
    doneCard: { alignItems: 'center', backgroundColor: theme.successLight, borderColor: theme.success, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg, padding: 14 },
    doneBody: { flex: 1 },
    doneTitle: { ...typography.bodyBold, color: theme.success },
    doneSub: { ...typography.caption, color: theme.success, marginTop: 2 },
    updateBtn: { backgroundColor: theme.successLight, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: 6 },
    updateBtnText: { ...typography.caption, color: theme.success, fontWeight: '800' },
    progressCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.lg, padding: 14 },
    progressText: { ...typography.bodyBold, color: theme.text, marginBottom: 10 },
    progressBar: { backgroundColor: theme.border, borderRadius: 4, height: 6, overflow: 'hidden' },
    progressFill: { backgroundColor: theme.accent, borderRadius: 4, height: 6 },
    itemsCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.xl, overflow: 'hidden' },
    item: { alignItems: 'center', flexDirection: 'row', gap: 14, padding: 14 },
    itemBorder: { borderBottomColor: theme.bg, borderBottomWidth: 1 },
    checkbox: { alignItems: 'center', borderColor: theme.border, borderRadius: 6, borderWidth: 2, height: 26, justifyContent: 'center', width: 26 },
    checkboxDone: { backgroundColor: theme.accent, borderColor: theme.accent },
    itemBody: { flex: 1 },
    itemLabel: { ...typography.bodyBold, color: theme.text },
    itemLabelDone: { color: theme.accent },
    itemSub: { ...typography.caption, color: theme.textMuted, marginTop: 2 },
    submitBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 12, paddingVertical: spacing.lg },
    submitBtnDisabled: { backgroundColor: theme.textMuted },
    submitBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  });
}
