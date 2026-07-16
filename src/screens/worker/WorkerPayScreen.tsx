import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  getMyPayHistory,
  getMyProfile,
  updateMyMomoDetails,
  parseApiError,
  type UserProfile,
  type WorkerPayRecord,
} from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

const NETWORKS = ['MTN', 'TELECEL', 'AIRTELTIGO'] as const;

const STATUS_COLOR: Record<string, string> = {
  SENT: '#15803d',
  PENDING: '#92400e',
  FAILED: '#b42318',
};

function fmt(amount: number) {
  return `GHS ${Number(amount).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return d; }
}

export function WorkerPayScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const s = makeStyles(theme);

  const [records, setRecords] = useState<WorkerPayRecord[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // MoMo edit state
  const [editingMomo, setEditingMomo] = useState(false);
  const [momoNumber, setMomoNumber] = useState('');
  const [momoNetwork, setMomoNetwork] = useState<string>('');
  const [momoSaving, setMomoSaving] = useState(false);
  const [momoError, setMomoError] = useState('');
  const [momoSuccess, setMomoSuccess] = useState(false);

  const load = useCallback(async () => {
    try {
      const [recs, prof] = await Promise.all([getMyPayHistory(), getMyProfile()]);
      setRecords(recs);
      setProfile(prof);
      setMomoNumber(prof.momoNumber ?? '');
      setMomoNetwork(prof.momoNetwork ?? '');
    } catch {
      setLoadError(true);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setLoadError(false); setRefreshing(true); load(); };

  const saveMomo = async () => {
    setMomoError('');
    setMomoSuccess(false);
    if (momoNumber && !/^\d{10,15}$/.test(momoNumber)) {
      setMomoError('Enter a valid 10–15 digit number.');
      return;
    }
    if (momoNumber && !momoNetwork) {
      setMomoError('Select a network for your MoMo number.');
      return;
    }
    setMomoSaving(true);
    try {
      await updateMyMomoDetails(momoNumber || null, momoNumber ? momoNetwork : null);
      setMomoSuccess(true);
      setEditingMomo(false);
    } catch (e) {
      setMomoError(parseApiError(e));
    } finally {
      setMomoSaving(false);
    }
  };

  if (loading) {
    return <View style={s.centered}><ActivityIndicator color={theme.accent} size="large" /></View>;
  }

  return (
    <ScrollView
      contentContainerStyle={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={s.pageTitle}>My Pay</Text>
      <Text style={s.pageSub}>Payment history and MoMo details</Text>
      {loadError ? (
        <View style={s.errorBanner}>
          <Text style={s.errorBannerText}>Could not load pay data. Pull to refresh.</Text>
        </View>
      ) : null}

      {/* MoMo section */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>MoMo Disbursement</Text>

        {!editingMomo ? (
          <>
            <View style={s.row}>
              <Text style={s.label}>Number</Text>
              <Text style={s.value}>{profile?.momoNumber ?? '—'}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.label}>Network</Text>
              <Text style={s.value}>{profile?.momoNetwork ?? '—'}</Text>
            </View>
            {momoSuccess && <Text style={s.successText}>MoMo details saved.</Text>}
            <TouchableOpacity style={s.editBtn} onPress={() => { setEditingMomo(true); setMomoSuccess(false); }}>
              <Text style={s.editBtnText}>Edit MoMo Details</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.inputLabel}>MoMo Number (10–15 digits)</Text>
            <TextInput
              style={s.input}
              value={momoNumber}
              onChangeText={setMomoNumber}
              keyboardType="numeric"
              maxLength={15}
              placeholder="e.g. 0241234567"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={s.inputLabel}>Network</Text>
            <View style={s.networkRow}>
              {NETWORKS.map(n => (
                <TouchableOpacity
                  key={n}
                  style={[s.networkBtn, momoNetwork === n && s.networkBtnActive]}
                  onPress={() => setMomoNetwork(n)}
                >
                  <Text style={[s.networkBtnText, momoNetwork === n && s.networkBtnTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {momoError ? <Text style={s.errorText}>{momoError}</Text> : null}

            <View style={s.actionRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setEditingMomo(false)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={saveMomo} disabled={momoSaving}>
                <Text style={s.saveBtnText}>{momoSaving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Pay history */}
      <Text style={s.sectionHeader}>Payment History</Text>
      {records.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="card-outline" size={40} color={theme.textMuted} style={{ marginBottom: 10 }} />
          <Text style={s.emptyText}>No payments yet.</Text>
          <Text style={s.emptySubText}>Pay records will appear here once a supervisor disburses a pay cycle.</Text>
        </View>
      ) : (
        records.map(r => (
          <View key={r.id} style={s.card}>
            <View style={s.recordHeader}>
              <Text style={s.recordDate}>{r.disbursedAt ? fmtDate(r.disbursedAt) : 'Pending'}</Text>
              <View style={[s.statusPill, { backgroundColor: (STATUS_COLOR[r.disbursementStatus] ?? '#374151') + '20' }]}>
                <Text style={[s.statusText, { color: STATUS_COLOR[r.disbursementStatus] ?? '#374151' }]}>
                  {r.disbursementStatus}
                </Text>
              </View>
            </View>

            <View style={s.row}>
              <Text style={s.label}>Gross Pay</Text>
              <Text style={s.value}>{fmt(r.grossShare)}</Text>
            </View>
            {r.insuranceDeduction > 0 && (
              <View style={s.row}>
                <Text style={s.label}>Insurance Deduction</Text>
                <Text style={[s.value, { color: theme.danger }]}>− {fmt(r.insuranceDeduction)}</Text>
              </View>
            )}
            <View style={[s.row, s.netRow]}>
              <Text style={s.netLabel}>Net Pay</Text>
              <Text style={s.netValue}>{fmt(r.netPay)}</Text>
            </View>

            {r.hoursWorked != null && (
              <View style={s.row}>
                <Text style={s.label}>Hours Worked</Text>
                <Text style={s.value}>{Number(r.hoursWorked).toFixed(1)} h</Text>
              </View>
            )}
            {r.momoTransactionRef && (
              <View style={s.row}>
                <Text style={s.label}>Ref</Text>
                <Text style={[s.value, { fontSize: 11, fontFamily: 'monospace' }]}>{r.momoTransactionRef}</Text>
              </View>
            )}
            {r.failureReason && (
              <Text style={s.failureReason}>Failed: {r.failureReason}</Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    centered: { alignItems: 'center', backgroundColor: theme.bg, flex: 1, justifyContent: 'center' },
    container: { backgroundColor: theme.bg, padding: spacing.xl, paddingBottom: 48 },
    pageTitle: { ...typography.h1, color: theme.text, marginBottom: 2 },
    pageSub: { ...typography.bodyBold, color: theme.textSub, marginBottom: spacing.xl },

    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 14, padding: spacing.lg },
    sectionTitle: { ...typography.label, color: theme.text, marginBottom: spacing.md },
    sectionHeader: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 10 },

    row: { alignItems: 'center', borderTopColor: theme.bgInput, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    label: { ...typography.bodyBold, color: theme.textSub, fontSize: 13 },
    value: { ...typography.bodyBold, color: theme.text, fontSize: 13 },

    netRow: { borderTopColor: theme.border, borderTopWidth: 1, marginTop: 4, paddingTop: 10 },
    netLabel: { color: theme.text, fontSize: 15, fontWeight: '900' },
    netValue: { color: theme.accent, fontSize: 17, fontWeight: '900' },

    recordHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    recordDate: { ...typography.bodyBold, color: theme.text },
    statusPill: { borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    statusText: { fontSize: 11, fontWeight: '800' },

    failureReason: { ...typography.caption, color: theme.danger, fontWeight: '700', marginTop: 6 },

    inputLabel: { ...typography.label, color: theme.textSub, marginBottom: 4, marginTop: 10 },
    input: { borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, fontWeight: '700', padding: 10 },

    networkRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: 4 },
    networkBtn: { borderColor: theme.border, borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: spacing.sm },
    networkBtnActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    networkBtnText: { ...typography.bodyBold, color: theme.textSub, fontSize: 13 },
    networkBtnTextActive: { color: '#fff' },

    actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    cancelBtn: { alignItems: 'center', borderColor: theme.border, borderRadius: 8, borderWidth: 1, flex: 1, padding: spacing.md },
    cancelBtnText: { ...typography.bodyBold, color: theme.textSub },
    saveBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 8, flex: 1, padding: spacing.md },
    saveBtnText: { ...typography.bodyBold, color: '#fff' },

    editBtn: { alignSelf: 'flex-start', borderColor: theme.accent, borderRadius: 8, borderWidth: 1, marginTop: spacing.md, paddingHorizontal: 14, paddingVertical: spacing.sm },
    editBtnText: { ...typography.bodyBold, color: theme.accent, fontSize: 13 },

    errorText: { ...typography.bodyBold, color: theme.danger, marginTop: spacing.sm },
    successText: { ...typography.bodyBold, color: theme.success, marginBottom: spacing.sm },

    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 14, padding: spacing.xxxl },
    emptyText: { color: theme.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
    emptySubText: { ...typography.caption, color: theme.textSub, textAlign: 'center' },
    errorBanner: { backgroundColor: theme.dangerLight, borderColor: '#fca5a5', borderRadius: 8, borderWidth: 1, marginBottom: 14, padding: 14 },
    errorBannerText: { ...typography.bodyBold, color: theme.danger, textAlign: 'center' },
  });
}
