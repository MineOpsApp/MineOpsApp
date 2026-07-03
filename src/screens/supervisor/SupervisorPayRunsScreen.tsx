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
  approvePayCycleManager,
  approvePayCycleSupervisor,
  getPayCycle,
  getPaySplitConfig,
  getSitePayCycles,
  previewPayCycle,
  updatePaySplitConfig,
  parseApiError,
  type PayCycle,
  type PayCycleDetail,
  type PaySplitConfig,
} from '../../services/api';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

type ScreenView = 'list' | 'generate' | 'detail';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: '#374151',
  MANAGER_APPROVED: '#92400e',
  DISBURSED: '#15803d',
  FAILED: '#b42318',
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  MANAGER_APPROVED: '1st Approved',
  DISBURSED: 'Disbursed',
  FAILED: 'Failed',
};

const FORMULAS = [
  { value: 'EQUAL_PER_HEAD', label: 'Equal per worker' },
  { value: 'WEIGHTED_BY_HOURS', label: 'Weighted by hours worked' },
];

function fmt(amount: number) {
  return `GHS ${Number(amount).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return d; }
}

export function SupervisorPayRunsScreen({ session }: Props) {
  const [view, setView] = useState<ScreenView>('list');
  const [cycles, setCycles] = useState<PayCycle[]>([]);
  const [detail, setDetail] = useState<PayCycleDetail | null>(null);
  const [config, setConfig] = useState<PaySplitConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Generate form state
  const [payDate, setPayDate] = useState('');
  const [mineralType, setMineralType] = useState('');
  const [unit, setUnit] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  // Config edit state
  const [editingFormula, setEditingFormula] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState('EQUAL_PER_HEAD');

  const loadList = useCallback(async () => {
    try {
      const [c, cfg] = await Promise.all([getSitePayCycles(), getPaySplitConfig()]);
      setCycles(c);
      setConfig(cfg);
      setSelectedFormula(cfg.formulaType);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const onRefresh = () => { setRefreshing(true); loadList(); };

  const openDetail = async (id: number) => {
    setError('');
    setActionLoading(true);
    try {
      const d = await getPayCycle(id);
      setDetail(d);
      setView('detail');
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setActionLoading(false);
    }
  };

  const generate = async () => {
    setGenerateError('');
    if (!payDate || !mineralType || !unit || !pricePerUnit) {
      setGenerateError('All fields are required.');
      return;
    }
    const price = parseFloat(pricePerUnit);
    if (isNaN(price) || price <= 0) {
      setGenerateError('Price per unit must be a positive number.');
      return;
    }
    setGenerating(true);
    try {
      const d = await previewPayCycle({ payDate, mineralType, unit, pricePerUnit: price });
      setDetail(d);
      setView('detail');
      loadList();
    } catch (e) {
      setGenerateError(parseApiError(e));
    } finally {
      setGenerating(false);
    }
  };

  const doApprove = async (which: 'manager' | 'supervisor') => {
    if (!detail) return;
    setError('');
    setActionLoading(true);
    try {
      const updated = which === 'manager'
        ? await approvePayCycleManager(detail.cycle.id)
        : await approvePayCycleSupervisor(detail.cycle.id);
      setDetail(updated);
      loadList();
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setActionLoading(false);
    }
  };

  const saveFormula = async () => {
    try {
      const updated = await updatePaySplitConfig(selectedFormula);
      setConfig(updated);
      setEditingFormula(false);
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  // ── DETAIL VIEW ────────────────────────────────────────────────────────────
  if (view === 'detail' && detail) {
    const { cycle, records } = detail;
    const myEmail = session.user.email.toLowerCase();
    const canFirstApprove = cycle.status === 'DRAFT';
    const canSecondApprove = cycle.status === 'MANAGER_APPROVED'
      && cycle.managerApprovedBy?.toLowerCase() !== myEmail;
    const alreadyFirstApproved = cycle.managerApprovedBy?.toLowerCase() === myEmail;
    const isDone = cycle.status === 'DISBURSED' || cycle.status === 'FAILED';

    return (
      <ScrollView contentContainerStyle={s.container}>
        <TouchableOpacity onPress={() => setView('list')} style={s.backBtn}>
          <Text style={s.backBtnText}>← Pay Runs</Text>
        </TouchableOpacity>

        <Text style={s.pageTitle}>Pay Run Detail</Text>

        <View style={s.card}>
          <View style={s.detailHeaderRow}>
            <Text style={s.detailTitle}>{cycle.mineralType} · {cycle.payDate}</Text>
            <View style={[s.statusPill, { backgroundColor: (STATUS_COLOR[cycle.status] ?? '#374151') + '20' }]}>
              <Text style={[s.statusText, { color: STATUS_COLOR[cycle.status] ?? '#374151' }]}>
                {STATUS_LABEL[cycle.status] ?? cycle.status}
              </Text>
            </View>
          </View>
          <Row label="Total Volume" value={`${cycle.totalVolume} ${cycle.unit}`} />
          <Row label="Price / Unit" value={fmt(cycle.pricePerUnit)} />
          <Row label="Gross Total" value={fmt(cycle.grossTotal)} bold />
          <Row label="Formula" value={cycle.formulaType === 'EQUAL_PER_HEAD' ? 'Equal per worker' : 'Weighted by hours'} />
          {cycle.managerApprovedBy && <Row label="1st Approved by" value={cycle.managerApprovedBy} />}
          {cycle.supervisorApprovedBy && <Row label="2nd Approved by" value={cycle.supervisorApprovedBy} />}
        </View>

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        {!isDone && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Approvals</Text>
            {canFirstApprove && !alreadyFirstApproved && (
              <TouchableOpacity style={s.approveBtn} onPress={() => doApprove('manager')} disabled={actionLoading}>
                <Text style={s.approveBtnText}>{actionLoading ? 'Processing…' : 'Give First Approval'}</Text>
              </TouchableOpacity>
            )}
            {alreadyFirstApproved && cycle.status === 'DRAFT' && (
              <Text style={s.waitingText}>You gave first approval. Waiting for a second supervisor to co-sign.</Text>
            )}
            {canSecondApprove && (
              <TouchableOpacity style={[s.approveBtn, { backgroundColor: '#15803d' }]} onPress={() => doApprove('supervisor')} disabled={actionLoading}>
                <Text style={s.approveBtnText}>{actionLoading ? 'Disbursing…' : 'Give Second Approval & Disburse'}</Text>
              </TouchableOpacity>
            )}
            {cycle.status === 'MANAGER_APPROVED' && !canSecondApprove && (
              <Text style={s.waitingText}>You gave first approval. A different supervisor must give second approval.</Text>
            )}
          </View>
        )}

        <Text style={s.sectionHeader}>Worker Breakdown ({records.length})</Text>
        {records.map(r => (
          <View key={r.id} style={s.card}>
            <Text style={s.workerName}>{r.workerName}</Text>
            <Text style={s.workerEmail}>{r.workerEmail}</Text>
            <Row label="Gross" value={fmt(r.grossShare)} />
            <Row label="Net Pay" value={fmt(r.netPay)} bold />
            {r.hoursWorked != null && <Row label="Hours" value={`${Number(r.hoursWorked).toFixed(1)} h`} />}
            <Row label="MoMo" value={r.momoNumber ? `${r.momoNumber} (${r.momoNetwork})` : 'No number on file'} />
            <Row label="Status" value={r.disbursementStatus} />
            {r.momoTransactionRef && <Row label="Ref" value={r.momoTransactionRef} mono />}
            {r.failureReason && <Text style={s.failureText}>Failed: {r.failureReason}</Text>}
          </View>
        ))}
      </ScrollView>
    );
  }

  // ── GENERATE VIEW ──────────────────────────────────────────────────────────
  if (view === 'generate') {
    return (
      <ScrollView contentContainerStyle={s.container}>
        <TouchableOpacity onPress={() => setView('list')} style={s.backBtn}>
          <Text style={s.backBtnText}>← Pay Runs</Text>
        </TouchableOpacity>

        <Text style={s.pageTitle}>Generate Pay Run</Text>
        <Text style={s.pageSub}>Pulls all approved, unpaid shift logs for the date and mineral you specify.</Text>

        <View style={s.card}>
          <Field label="Pay Date (YYYY-MM-DD)" value={payDate} onChange={setPayDate} placeholder="e.g. 2026-07-03" />
          <Field label="Mineral Type" value={mineralType} onChange={setMineralType} placeholder="e.g. Gold" />
          <Field label="Unit" value={unit} onChange={setUnit} placeholder="e.g. kg or oz" />
          <Field label="Price Per Unit (GHS)" value={pricePerUnit} onChange={setPricePerUnit} placeholder="e.g. 320.00" keyboard="decimal-pad" />

          {/* Formula picker */}
          <Text style={[s.inputLabel, { marginTop: 14 }]}>Pay Split Formula</Text>
          <Text style={s.formulaNote}>
            Current: {config?.formulaType === 'WEIGHTED_BY_HOURS' ? 'Weighted by hours worked' : 'Equal per worker'}
            {' '}· <Text style={{ color: '#1f6f5b' }} onPress={() => setEditingFormula(true)}>Change</Text>
          </Text>

          {editingFormula && (
            <>
              {FORMULAS.map(f => (
                <TouchableOpacity key={f.value} style={[s.formulaBtn, selectedFormula === f.value && s.formulaBtnActive]}
                  onPress={() => setSelectedFormula(f.value)}>
                  <Text style={[s.formulaBtnText, selectedFormula === f.value && s.formulaBtnTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[s.approveBtn, { marginTop: 8 }]} onPress={saveFormula}>
                <Text style={s.approveBtnText}>Save Formula</Text>
              </TouchableOpacity>
            </>
          )}

          {generateError ? <Text style={s.errorText}>{generateError}</Text> : null}

          <TouchableOpacity style={[s.approveBtn, { marginTop: 16 }]} onPress={generate} disabled={generating}>
            <Text style={s.approveBtnText}>{generating ? 'Calculating…' : 'Preview Pay Run'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  if (loading) {
    return <View style={s.centered}><ActivityIndicator color="#1f6f5b" size="large" /></View>;
  }

  return (
    <ScrollView
      contentContainerStyle={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={s.pageTitle}>Pay Runs</Text>
      <Text style={s.pageSub}>Manage worker pay cycles for your site</Text>

      <TouchableOpacity style={s.generateBtn} onPress={() => { setView('generate'); setGenerateError(''); }}>
        <Text style={s.generateBtnText}>+ Generate Pay Run</Text>
      </TouchableOpacity>

      {cycles.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyIcon}>💰</Text>
          <Text style={s.emptyText}>No pay runs yet.</Text>
          <Text style={s.emptySubText}>Tap "Generate Pay Run" to create the first one.</Text>
        </View>
      ) : (
        cycles.map(c => (
          <TouchableOpacity key={c.id} style={s.card} onPress={() => openDetail(c.id)} activeOpacity={0.75}>
            <View style={s.detailHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.detailTitle}>{c.mineralType}</Text>
                <Text style={s.cycleDate}>{fmtDate(c.payDate)}</Text>
              </View>
              <View style={[s.statusPill, { backgroundColor: (STATUS_COLOR[c.status] ?? '#374151') + '20' }]}>
                <Text style={[s.statusText, { color: STATUS_COLOR[c.status] ?? '#374151' }]}>
                  {STATUS_LABEL[c.status] ?? c.status}
                </Text>
              </View>
            </View>
            <Text style={s.cycleGross}>{fmt(c.grossTotal)}</Text>
            <Text style={s.cycleSub}>{c.totalVolume} {c.unit} @ {fmt(c.pricePerUnit)}/{c.unit}</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

// Small shared sub-components
function Row({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={[s.value, bold && { fontWeight: '900', color: '#1f6f5b' }, mono && { fontSize: 11, fontFamily: 'monospace' }]}>
        {value}
      </Text>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, keyboard }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; keyboard?: any;
}) {
  return (
    <>
      <Text style={s.inputLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboard ?? 'default'}
      />
    </>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' },
  container: { backgroundColor: '#f4f6f8', padding: 20, paddingBottom: 48 },
  pageTitle: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 2 },
  pageSub: { color: '#5d6875', fontSize: 13, fontWeight: '700', marginBottom: 16 },

  backBtn: { marginBottom: 12 },
  backBtnText: { color: '#1f6f5b', fontSize: 14, fontWeight: '800' },

  card: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 12, borderWidth: 1, marginBottom: 14, padding: 16 },
  sectionTitle: { color: '#17212b', fontSize: 13, fontWeight: '900', letterSpacing: 0.5, marginBottom: 12, textTransform: 'uppercase' },
  sectionHeader: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 10 },

  detailHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  detailTitle: { color: '#17212b', fontSize: 15, fontWeight: '900' },
  cycleDate: { color: '#5d6875', fontSize: 12, fontWeight: '700', marginTop: 2 },
  cycleGross: { color: '#1f6f5b', fontSize: 18, fontWeight: '900', marginTop: 4 },
  cycleSub: { color: '#5d6875', fontSize: 12, fontWeight: '600', marginTop: 2 },

  statusPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '800' },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderTopColor: '#f4f6f8', borderTopWidth: 1 },
  label: { color: '#5d6875', fontSize: 13, fontWeight: '700', flex: 1 },
  value: { color: '#17212b', fontSize: 13, fontWeight: '700', maxWidth: '55%', textAlign: 'right' },

  workerName: { color: '#17212b', fontSize: 14, fontWeight: '800', marginBottom: 2 },
  workerEmail: { color: '#5d6875', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  failureText: { color: '#b42318', fontSize: 12, fontWeight: '700', marginTop: 4 },

  approveBtn: { backgroundColor: '#1f6f5b', borderRadius: 10, padding: 14, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },

  waitingText: { color: '#92400e', fontSize: 13, fontWeight: '700', textAlign: 'center', padding: 8 },

  generateBtn: { backgroundColor: '#1f6f5b', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16 },
  generateBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },

  inputLabel: { color: '#5d6875', fontSize: 12, fontWeight: '800', marginTop: 10, marginBottom: 4, textTransform: 'uppercase' },
  input: { borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 14, fontWeight: '700', padding: 10 },

  formulaNote: { color: '#5d6875', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  formulaBtn: { borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, padding: 12, marginBottom: 6 },
  formulaBtnActive: { backgroundColor: '#1f6f5b', borderColor: '#1f6f5b' },
  formulaBtnText: { color: '#5d6875', fontSize: 13, fontWeight: '800' },
  formulaBtnTextActive: { color: '#fff' },

  errorText: { color: '#b42318', fontSize: 13, fontWeight: '700', marginBottom: 10 },

  emptyCard: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 12, borderWidth: 1, alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyText: { color: '#17212b', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  emptySubText: { color: '#5d6875', fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
