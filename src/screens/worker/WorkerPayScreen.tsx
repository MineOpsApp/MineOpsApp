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
    return <View style={s.centered}><ActivityIndicator color="#1f6f5b" size="large" /></View>;
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
              placeholderTextColor="#9ca3af"
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
          <Text style={s.emptyIcon}>💳</Text>
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
                <Text style={[s.value, { color: '#b42318' }]}>− {fmt(r.insuranceDeduction)}</Text>
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

const s = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' },
  container: { backgroundColor: '#f4f6f8', padding: 20, paddingBottom: 48 },
  pageTitle: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 2 },
  pageSub: { color: '#5d6875', fontSize: 13, fontWeight: '700', marginBottom: 20 },

  card: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 12, borderWidth: 1, marginBottom: 14, padding: 16 },
  sectionTitle: { color: '#17212b', fontSize: 13, fontWeight: '900', letterSpacing: 0.5, marginBottom: 12, textTransform: 'uppercase' },
  sectionHeader: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 10 },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderTopColor: '#f4f6f8', borderTopWidth: 1 },
  label: { color: '#5d6875', fontSize: 13, fontWeight: '700' },
  value: { color: '#17212b', fontSize: 13, fontWeight: '700' },

  netRow: { borderTopColor: '#dde3ea', borderTopWidth: 1, marginTop: 4, paddingTop: 10 },
  netLabel: { color: '#17212b', fontSize: 15, fontWeight: '900' },
  netValue: { color: '#1f6f5b', fontSize: 17, fontWeight: '900' },

  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  recordDate: { color: '#17212b', fontSize: 14, fontWeight: '800' },
  statusPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '800' },

  failureReason: { color: '#b42318', fontSize: 12, fontWeight: '700', marginTop: 6 },

  inputLabel: { color: '#5d6875', fontSize: 12, fontWeight: '800', marginTop: 10, marginBottom: 4, textTransform: 'uppercase' },
  input: { borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 14, fontWeight: '700', padding: 10 },

  networkRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  networkBtn: { borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  networkBtnActive: { backgroundColor: '#1f6f5b', borderColor: '#1f6f5b' },
  networkBtnText: { color: '#5d6875', fontSize: 13, fontWeight: '800' },
  networkBtnTextActive: { color: '#fff' },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, alignItems: 'center', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, padding: 12 },
  cancelBtnText: { color: '#5d6875', fontSize: 14, fontWeight: '800' },
  saveBtn: { flex: 1, alignItems: 'center', backgroundColor: '#1f6f5b', borderRadius: 8, padding: 12 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  editBtn: { marginTop: 12, alignSelf: 'flex-start', borderColor: '#1f6f5b', borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  editBtnText: { color: '#1f6f5b', fontSize: 13, fontWeight: '800' },

  errorText: { color: '#b42318', fontSize: 13, fontWeight: '700', marginTop: 8 },
  successText: { color: '#15803d', fontSize: 13, fontWeight: '700', marginBottom: 8 },

  emptyCard: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 12, borderWidth: 1, alignItems: 'center', padding: 32, marginBottom: 14 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyText: { color: '#17212b', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  emptySubText: { color: '#5d6875', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  errorBanner: { backgroundColor: '#fff5f5', borderColor: '#fca5a5', borderRadius: 8, borderWidth: 1, marginBottom: 14, padding: 14 },
  errorBannerText: { color: '#b42318', fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
