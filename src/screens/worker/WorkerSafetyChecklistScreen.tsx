import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMyChecklistToday, submitSafetyChecklist } from '../../services/api';
import type { ChecklistPayload, SafetyChecklist } from '../../services/api';
import type { AuthSession } from '../../types/auth';

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
    if (existing && !submitted) return; // read-only unless resubmitting
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
    return <View style={styles.centered}><ActivityIndicator color="#1f6f5b" /></View>;
  }

  const allChecked = Object.values(checks).every(Boolean);
  const checkedCount = Object.values(checks).filter(Boolean).length;
  const isReadOnly = !!existing && !submitted;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1f6f5b" />}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Shift Safety Check</Text>
        <Text style={styles.pageSub}>Complete before starting work each shift</Text>
      </View>

      {isReadOnly ? (
        <View style={styles.doneCard}>
          <Text style={styles.doneIcon}>✓</Text>
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
                {checked && <Text style={styles.checkmark}>✓</Text>}
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
          disabled={!allChecked || submitting}
        >
          <Text style={styles.submitBtnText}>
            {submitting ? 'Submitting…' : allChecked ? 'Submit Checklist' : `${ITEMS.length - checkedCount} items remaining`}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  pageHeader: { marginBottom: 16 },
  pageTitle: { color: '#17212b', fontSize: 22, fontWeight: '900' },
  pageSub: { color: '#8fa3b8', fontSize: 12, fontWeight: '600', marginTop: 2 },
  doneCard: { alignItems: 'center', backgroundColor: '#f0fdf4', borderColor: '#86efac', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 16, padding: 14 },
  doneIcon: { color: '#16a34a', fontSize: 26, fontWeight: '900' },
  doneBody: { flex: 1 },
  doneTitle: { color: '#15803d', fontSize: 14, fontWeight: '900' },
  doneSub: { color: '#4ade80', fontSize: 12, fontWeight: '600', marginTop: 2 },
  updateBtn: { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  updateBtnText: { color: '#15803d', fontSize: 12, fontWeight: '800' },
  progressCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 14 },
  progressText: { color: '#17212b', fontSize: 13, fontWeight: '800', marginBottom: 10 },
  progressBar: { backgroundColor: '#e5e9ef', borderRadius: 4, height: 6, overflow: 'hidden' },
  progressFill: { backgroundColor: '#1f6f5b', borderRadius: 4, height: 6 },
  itemsCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 20, overflow: 'hidden' },
  item: { alignItems: 'center', flexDirection: 'row', gap: 14, padding: 14 },
  itemBorder: { borderBottomColor: '#f0f2f5', borderBottomWidth: 1 },
  checkbox: { alignItems: 'center', borderColor: '#d1d5db', borderRadius: 6, borderWidth: 2, height: 26, justifyContent: 'center', width: 26 },
  checkboxDone: { backgroundColor: '#1f6f5b', borderColor: '#1f6f5b' },
  checkmark: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  itemBody: { flex: 1 },
  itemLabel: { color: '#17212b', fontSize: 14, fontWeight: '800' },
  itemLabelDone: { color: '#1f6f5b' },
  itemSub: { color: '#8fa3b8', fontSize: 12, fontWeight: '600', marginTop: 2 },
  submitBtn: { backgroundColor: '#1f6f5b', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#8fa3b8' },
  submitBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
});
