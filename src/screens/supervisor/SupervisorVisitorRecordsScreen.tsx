import { useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  getVisitorVisits, checkInVisit, checkOutVisit, createVisitorVisit, getGuestList,
  type VisitorVisit,
} from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

type GuestEntry = { id: number; fullName: string; email: string; expired: boolean };

const STATUS_STYLE: Record<string, { bg: string; textColor: string }> = {
  PENDING: { bg: '#f3f4f6', textColor: '#6b7280' },
  CHECKED_IN: { bg: '#dcfce7', textColor: '#166534' },
  CHECKED_OUT: { bg: '#e0f2fe', textColor: '#0369a1' },
  OVERDUE: { bg: '#fee2e2', textColor: '#b91c1c' },
};

function StatusBadge({ status }: { status: string }) {
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
  const [guests, setGuests] = useState<GuestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New visit form
  const [showForm, setShowForm] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<GuestEntry | null>(null);
  const [guestQuery, setGuestQuery] = useState('');
  const [hostName, setHostName] = useState('');
  const [purposeOfVisit, setPurposeOfVisit] = useState('');
  const [visitStart, setVisitStart] = useState('');
  const [visitEnd, setVisitEnd] = useState('');
  const [approvedZones, setApprovedZones] = useState('');
  const [visitingOrganisation, setVisitingOrganisation] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      const [data, guestData] = await Promise.all([getVisitorVisits(), getGuestList()]);
      setVisits(data.map(computeStatus));
      setGuests((guestData as GuestEntry[]).filter(g => !g.expired));
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

  const filteredGuests = guestQuery.trim()
    ? guests.filter(g =>
        g.fullName.toLowerCase().includes(guestQuery.toLowerCase()) ||
        g.email.toLowerCase().includes(guestQuery.toLowerCase())
      )
    : guests;

  function resetForm() {
    setSelectedGuest(null);
    setGuestQuery('');
    setHostName('');
    setPurposeOfVisit('');
    setVisitStart('');
    setVisitEnd('');
    setApprovedZones('');
    setVisitingOrganisation('');
    setEmergencyContactName('');
    setEmergencyContactPhone('');
    setShowForm(false);
  }

  async function handleCreate() {
    if (!selectedGuest) { Alert.alert('Select a guest', 'Choose a guest from the list.'); return; }
    if (!purposeOfVisit.trim()) { Alert.alert('Required', 'Purpose of visit is required.'); return; }
    if (visitStart.trim() && isNaN(new Date(visitStart.trim()).getTime())) {
      Alert.alert('Invalid date', 'Visit Start must be in YYYY-MM-DD format.'); return;
    }
    if (visitEnd.trim() && isNaN(new Date(visitEnd.trim()).getTime())) {
      Alert.alert('Invalid date', 'Visit End must be in YYYY-MM-DD format.'); return;
    }
    setCreating(true);
    try {
      const created = await createVisitorVisit({
        guestUserId: selectedGuest.id,
        hostName: hostName.trim() || undefined,
        purposeOfVisit: purposeOfVisit.trim(),
        visitStart: visitStart.trim() ? visitStart.trim() + 'T00:00:00' : undefined,
        visitEnd: visitEnd.trim() ? visitEnd.trim() + 'T23:59:59' : undefined,
        approvedZones: approvedZones.trim() || undefined,
        visitingOrganisation: visitingOrganisation.trim() || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
      });
      setVisits(prev => [computeStatus(created), ...prev]);
      resetForm();
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Could not create visit record.');
    } finally {
      setCreating(false);
    }
  }

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
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Visitor Records</Text>
          <Text style={styles.sub}>{session.user.assignedSite} · {visits.length} visit{visits.length !== 1 ? 's' : ''}</Text>
        </View>
        <Pressable style={styles.newBtn} onPress={() => { setShowForm(v => !v); if (showForm) resetForm(); }}>
          <Ionicons name={showForm ? 'close' : 'add'} size={18} color="#fff" />
          <Text style={styles.newBtnText}>{showForm ? 'Cancel' : 'New Visit'}</Text>
        </Pressable>
      </View>

      {/* ── New visit form ── */}
      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>New Visitor Visit</Text>

          {/* Guest picker */}
          <Text style={styles.label}>Guest *</Text>
          {selectedGuest ? (
            <View style={styles.selectedGuestRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedGuestName}>{selectedGuest.fullName}</Text>
                <Text style={styles.selectedGuestEmail}>{selectedGuest.email}</Text>
              </View>
              <Pressable onPress={() => setSelectedGuest(null)}>
                <Ionicons name="close-circle" size={20} color={theme.textMuted} />
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={guestQuery}
                onChangeText={setGuestQuery}
                placeholder="Search by name or email…"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
              />
              {guests.length === 0 ? (
                <Text style={styles.noGuests}>No active guests at this site. Share a guest code first.</Text>
              ) : (
                <View style={styles.guestList}>
                  {filteredGuests.slice(0, 8).map(g => (
                    <Pressable key={g.id} style={styles.guestRow} onPress={() => { setSelectedGuest(g); setGuestQuery(''); }}>
                      <Ionicons name="person-circle-outline" size={18} color={theme.textMuted} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.guestName}>{g.fullName}</Text>
                        <Text style={styles.guestEmail}>{g.email}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
                    </Pressable>
                  ))}
                  {filteredGuests.length === 0 && guestQuery ? (
                    <Text style={styles.noGuests}>No guests match "{guestQuery}"</Text>
                  ) : null}
                </View>
              )}
            </>
          )}

          <Text style={styles.label}>Purpose of Visit *</Text>
          <TextInput
            style={styles.input}
            value={purposeOfVisit}
            onChangeText={setPurposeOfVisit}
            placeholder="e.g. Site inspection, contractor work"
            placeholderTextColor={theme.textMuted}
          />

          <Text style={styles.label}>Host Name</Text>
          <TextInput
            style={styles.input}
            value={hostName}
            onChangeText={setHostName}
            placeholder="Name of person hosting the visit"
            placeholderTextColor={theme.textMuted}
          />

          <Text style={styles.label}>Visiting Organisation</Text>
          <TextInput
            style={styles.input}
            value={visitingOrganisation}
            onChangeText={setVisitingOrganisation}
            placeholder="Company or body they represent"
            placeholderTextColor={theme.textMuted}
          />

          <Text style={styles.label}>Approved Zones</Text>
          <TextInput
            style={styles.input}
            value={approvedZones}
            onChangeText={setApprovedZones}
            placeholder="e.g. Zone A, Processing Plant"
            placeholderTextColor={theme.textMuted}
          />

          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Visit Start (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={visitStart}
                onChangeText={setVisitStart}
                placeholder="2026-07-21"
                placeholderTextColor={theme.textMuted}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={{ width: spacing.sm }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Visit End (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={visitEnd}
                onChangeText={setVisitEnd}
                placeholder="2026-07-22"
                placeholderTextColor={theme.textMuted}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          <Text style={styles.label}>Emergency Contact Name</Text>
          <TextInput
            style={styles.input}
            value={emergencyContactName}
            onChangeText={setEmergencyContactName}
            placeholder="Full name"
            placeholderTextColor={theme.textMuted}
          />

          <Text style={styles.label}>Emergency Contact Phone</Text>
          <TextInput
            style={styles.input}
            value={emergencyContactPhone}
            onChangeText={setEmergencyContactPhone}
            placeholder="+233 XX XXX XXXX"
            placeholderTextColor={theme.textMuted}
            keyboardType="phone-pad"
          />

          <Pressable
            style={[styles.submitBtn, creating && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={creating}
          >
            <Text style={styles.submitBtnText}>{creating ? 'Creating…' : 'Create Visit Record'}</Text>
          </Pressable>
        </View>
      )}

      {/* ── Visit list ── */}
      {visits.length === 0 && !showForm ? (
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={40} color={theme.textMuted} style={{ marginBottom: 10 }} />
          <Text style={styles.emptyTitle}>No visits yet</Text>
          <Text style={styles.emptySub}>Tap "New Visit" to register an incoming visitor.</Text>
        </View>
      ) : null}

      {visits.map((v) => (
        <View key={v.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.passNum}>{v.visitorPassNumber ?? 'Pass pending'}</Text>
              <StatusBadge status={v.status} />
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
            {(v.status === 'CHECKED_IN' || v.status === 'OVERDUE') ? (
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
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
    title: { ...typography.h1, color: theme.text, marginBottom: 2 },
    sub: { color: theme.textSub, fontSize: 13, fontWeight: '600' },
    newBtn: { backgroundColor: theme.accent, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, marginTop: 4 },
    newBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },

    formCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.md },
    formTitle: { ...typography.h3, color: theme.text, marginBottom: spacing.md },
    label: { color: theme.textSub, fontSize: 12, fontWeight: '800', marginBottom: 4, marginTop: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.4 },
    input: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, marginBottom: 2, padding: 10 },
    dateRow: { flexDirection: 'row', alignItems: 'flex-start' },

    selectedGuestRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgInput, borderColor: theme.accent, borderRadius: 8, borderWidth: 1, padding: 10, gap: 8 },
    selectedGuestName: { color: theme.text, fontSize: 14, fontWeight: '800' },
    selectedGuestEmail: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },

    guestList: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, marginBottom: 4, overflow: 'hidden' },
    guestRow: { flexDirection: 'row', alignItems: 'center', borderBottomColor: theme.border, borderBottomWidth: 1, padding: 10 },
    guestName: { color: theme.text, fontSize: 14, fontWeight: '700' },
    guestEmail: { color: theme.textMuted, fontSize: 12, fontWeight: '500' },
    noGuests: { color: theme.textMuted, fontSize: 13, fontWeight: '600', padding: 10, textAlign: 'center' },

    submitBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 8, padding: 12, marginTop: spacing.md },
    submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },

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
