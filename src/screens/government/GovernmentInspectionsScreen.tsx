import { useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  createInspection, getInspections, startInspection, endInspection,
  submitInspectionFindings, type InspectionRecord,
} from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

const INSPECTION_TYPES = ['ROUTINE', 'COMPLAINT_DRIVEN', 'FOLLOW_UP', 'SURPRISE'];
const SCOPES = ['SAFETY', 'ENVIRONMENTAL', 'PRODUCTION', 'FINANCIAL', 'FULL_AUDIT'];
const COMPLIANCE = ['COMPLIANT', 'NON_COMPLIANT', 'PARTIAL'];

const COMPLIANCE_STYLE: Record<string, string> = {
  COMPLIANT: '#166534',
  NON_COMPLIANT: '#b91c1c',
  PARTIAL: '#a15c00',
};

export function GovernmentInspectionsScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  // New inspection form state
  const [site, setSite] = useState('');
  const [refNum, setRefNum] = useState('');
  const [inspType, setInspType] = useState('ROUTINE');
  const [scope, setScope] = useState('SAFETY');
  const [expectedDuration, setExpectedDuration] = useState('');
  const [legalRef, setLegalRef] = useState('');
  const [creating, setCreating] = useState(false);

  // Findings form per inspection
  const [findingsId, setFindingsId] = useState<number | null>(null);
  const [findingsText, setFindingsText] = useState('');
  const [compliance, setCompliance] = useState('COMPLIANT');
  const [followUp, setFollowUp] = useState(false);
  const [submittingFindings, setSubmittingFindings] = useState(false);

  async function load() {
    try {
      const data = await getInspections();
      setInspections(data);
    } catch { /* best-effort */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function handleCreate() {
    if (!site.trim() || !refNum.trim()) {
      Alert.alert('Required', 'Site and reference number are required.');
      return;
    }
    setCreating(true);
    try {
      const created = await createInspection({
        site: site.trim(),
        inspectionType: inspType,
        inspectionReferenceNumber: refNum.trim(),
        scope,
        legalAuthorityReference: legalRef.trim() || undefined,
        expectedDuration: expectedDuration.trim() || undefined,
      });
      setInspections(prev => [created, ...prev]);
      setShowNewForm(false);
      setSite(''); setRefNum(''); setLegalRef(''); setExpectedDuration('');
      setInspType('ROUTINE'); setScope('SAFETY');
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Could not create inspection.');
    } finally {
      setCreating(false);
    }
  }

  async function handleStart(id: number) {
    try {
      const updated = await startInspection(id);
      setInspections(prev => prev.map(i => i.id === updated.id ? updated : i));
    } catch { Alert.alert('Failed', 'Could not start inspection.'); }
  }

  async function handleEnd(id: number) {
    try {
      const updated = await endInspection(id);
      setInspections(prev => prev.map(i => i.id === updated.id ? updated : i));
    } catch { Alert.alert('Failed', 'Could not end inspection.'); }
  }

  async function handleSubmitFindings() {
    if (!findingsId) return;
    setSubmittingFindings(true);
    try {
      const updated = await submitInspectionFindings(findingsId, {
        findingsSummary: findingsText.trim() || undefined,
        complianceStatus: compliance,
        followUpRequired: followUp,
        reportSubmitted: true,
      });
      setInspections(prev => prev.map(i => i.id === updated.id ? updated : i));
      setFindingsId(null);
      setFindingsText('');
      setFollowUp(false);
    } catch { Alert.alert('Failed', 'Could not submit findings.'); }
    finally { setSubmittingFindings(false); }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <View style={styles.header}>
        <Text style={styles.title}>Inspections</Text>
        <Pressable style={styles.newBtn} onPress={() => setShowNewForm(v => !v)}>
          <Ionicons name={showNewForm ? 'close' : 'add'} size={18} color="#fff" />
          <Text style={styles.newBtnText}>{showNewForm ? 'Cancel' : 'New'}</Text>
        </Pressable>
      </View>
      <Text style={styles.sub}>Your inspection history at sites you've visited.</Text>

      {showNewForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>New Inspection</Text>

          <Text style={styles.label}>Site *</Text>
          <TextInput style={styles.input} value={site} onChangeText={setSite} placeholder="Mine site name" placeholderTextColor={theme.textMuted} />

          <Text style={styles.label}>Reference Number *</Text>
          <TextInput style={styles.input} value={refNum} onChangeText={setRefNum} placeholder="Agency-issued ref" placeholderTextColor={theme.textMuted} autoCapitalize="characters" />

          <Text style={styles.label}>Inspection Type</Text>
          <View style={styles.pillRow}>
            {INSPECTION_TYPES.map(t => (
              <Pressable key={t} onPress={() => setInspType(t)} style={[styles.pill, inspType === t && { backgroundColor: theme.accent, borderColor: theme.accent }]}>
                <Text style={[styles.pillText, inspType === t && { color: '#fff' }]}>{t.replace('_', ' ')}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Scope</Text>
          <View style={styles.pillRow}>
            {SCOPES.map(s => (
              <Pressable key={s} onPress={() => setScope(s)} style={[styles.pill, scope === s && { backgroundColor: theme.accent, borderColor: theme.accent }]}>
                <Text style={[styles.pillText, scope === s && { color: '#fff' }]}>{s.replace('_', ' ')}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Expected Duration (optional)</Text>
          <TextInput style={styles.input} value={expectedDuration} onChangeText={setExpectedDuration} placeholder="e.g. 2 hours" placeholderTextColor={theme.textMuted} />

          <Text style={styles.label}>Legal Authority Reference (optional)</Text>
          <TextInput style={styles.input} value={legalRef} onChangeText={setLegalRef} placeholder="Warrant ref if applicable" placeholderTextColor={theme.textMuted} />

          <Pressable style={[styles.submitBtn, creating && { opacity: 0.6 }]} onPress={handleCreate} disabled={creating}>
            <Text style={styles.submitBtnText}>{creating ? 'Creating…' : 'Start Inspection'}</Text>
          </Pressable>
        </View>
      )}

      {/* Findings form overlay */}
      {findingsId !== null && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Submit Findings</Text>

          <Text style={styles.label}>Compliance Status</Text>
          <View style={styles.pillRow}>
            {COMPLIANCE.map(c => (
              <Pressable key={c} onPress={() => setCompliance(c)} style={[styles.pill, compliance === c && { backgroundColor: COMPLIANCE_STYLE[c], borderColor: COMPLIANCE_STYLE[c] }]}>
                <Text style={[styles.pillText, compliance === c && { color: '#fff' }]}>{c.replace('_', ' ')}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Findings Summary</Text>
          <TextInput style={[styles.input, { minHeight: 80 }]} value={findingsText} onChangeText={setFindingsText} placeholder="Describe what was found…" placeholderTextColor={theme.textMuted} multiline textAlignVertical="top" />

          <Pressable style={styles.checkRow} onPress={() => setFollowUp(v => !v)}>
            <Ionicons name={followUp ? 'checkbox' : 'square-outline'} size={20} color={theme.accent} />
            <Text style={styles.checkLabel}>Follow-up required</Text>
          </Pressable>

          <View style={styles.pillRow}>
            <Pressable style={[styles.submitBtn, { flex: 1, backgroundColor: theme.textMuted }]} onPress={() => setFindingsId(null)}>
              <Text style={styles.submitBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.submitBtn, { flex: 1 }, submittingFindings && { opacity: 0.6 }]} onPress={handleSubmitFindings} disabled={submittingFindings}>
              <Text style={styles.submitBtnText}>{submittingFindings ? 'Submitting…' : 'Submit'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {loading ? <Text style={styles.loadingText}>Loading…</Text> : null}

      {!loading && inspections.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="document-text-outline" size={40} color={theme.textMuted} style={{ marginBottom: 10 }} />
          <Text style={styles.emptyTitle}>No inspections yet</Text>
          <Text style={styles.emptySub}>Tap "New" to log your first inspection.</Text>
        </View>
      ) : null}

      {inspections.map((insp) => (
        <View key={insp.id} style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.cardRef}>{insp.inspectionReferenceNumber ?? 'No ref'}</Text>
            {insp.complianceStatus ? (
              <View style={{ backgroundColor: COMPLIANCE_STYLE[insp.complianceStatus] + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: COMPLIANCE_STYLE[insp.complianceStatus], fontSize: 11, fontWeight: '900' }}>{insp.complianceStatus.replace('_', ' ')}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.cardDetail}>{insp.inspectionType?.replace('_', ' ')} · {insp.scope?.replace('_', ' ')}</Text>
          {insp.site ? <Text style={styles.cardDetail}>Site: {insp.site}</Text> : null}
          {insp.inspectionStartAt ? <Text style={styles.cardDetail}>Started: {new Date(insp.inspectionStartAt).toLocaleString()}</Text> : null}
          {insp.inspectionEndAt ? <Text style={styles.cardDetail}>Ended: {new Date(insp.inspectionEndAt).toLocaleString()}</Text> : null}
          {insp.findingsSummary ? <Text style={[styles.cardDetail, { marginTop: 4, fontStyle: 'italic' }]}>{insp.findingsSummary}</Text> : null}
          {insp.followUpRequired ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Ionicons name="alert-circle" size={13} color={theme.amber} />
              <Text style={{ color: theme.amber, fontSize: 12, fontWeight: '800' }}>Follow-up required</Text>
            </View>
          ) : null}

          <View style={styles.cardActions}>
            {!insp.inspectionStartAt && (
              <Pressable style={styles.cardBtn} onPress={() => handleStart(insp.id)}>
                <Text style={styles.cardBtnText}>Start</Text>
              </Pressable>
            )}
            {insp.inspectionStartAt && !insp.inspectionEndAt && (
              <Pressable style={styles.cardBtn} onPress={() => handleEnd(insp.id)}>
                <Text style={styles.cardBtnText}>End</Text>
              </Pressable>
            )}
            {insp.inspectionStartAt && !insp.reportSubmitted && (
              <Pressable style={[styles.cardBtn, { backgroundColor: theme.textMuted }]}
                onPress={() => { setFindingsId(insp.id); setFindingsText(insp.findingsSummary ?? ''); setCompliance(insp.complianceStatus ?? 'COMPLIANT'); setFollowUp(!!insp.followUpRequired); }}>
                <Text style={styles.cardBtnText}>Findings</Text>
              </Pressable>
            )}
            {insp.reportSubmitted && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="checkmark-circle" size={14} color={theme.success} />
                <Text style={{ color: theme.success, fontSize: 12, fontWeight: '800' }}>Report submitted</Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { padding: spacing.xl, paddingBottom: 40, backgroundColor: theme.bg },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
    title: { ...typography.h1, color: theme.text, flex: 1 },
    newBtn: { backgroundColor: theme.accent, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7 },
    newBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
    sub: { color: theme.textSub, fontSize: 13, fontWeight: '600', marginBottom: spacing.lg },
    formCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.md },
    formTitle: { ...typography.h3, color: theme.text, marginBottom: spacing.md },
    label: { color: theme.textSub, fontSize: 12, fontWeight: '800', marginBottom: 4, marginTop: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.4 },
    input: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, marginBottom: 4, padding: 10 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.xs },
    pill: { borderColor: theme.border, borderRadius: 6, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
    pillText: { color: theme.textSub, fontSize: 11, fontWeight: '800' },
    submitBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 8, padding: 12, marginTop: spacing.sm },
    submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.sm },
    checkLabel: { color: theme.text, fontSize: 14, fontWeight: '700' },
    loadingText: { color: theme.textSub, fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 40 },
    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: spacing.xxxl },
    emptyTitle: { ...typography.bodyBold, color: theme.text, marginBottom: spacing.xs },
    emptySub: { ...typography.caption, color: theme.textMuted, textAlign: 'center' },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.md, padding: spacing.md },
    cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    cardRef: { color: theme.text, fontSize: 15, fontWeight: '900', flex: 1 },
    cardDetail: { color: theme.textSub, fontSize: 13, fontWeight: '600', marginTop: 2 },
    cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap', alignItems: 'center' },
    cardBtn: { backgroundColor: theme.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
    cardBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  });
}
