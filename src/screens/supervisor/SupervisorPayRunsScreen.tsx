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
import { Ionicons } from '@expo/vector-icons';

import {
  approvePayCycleManager,
  approvePayCycleSupervisor,
  getMarketPrices,
  getPayCycle,
  getPaySplitConfig,
  getSitePayCycles,
  previewPayCycle,
  updatePaySplitConfig,
  parseApiError,
  exportPayCycleCsv,
  type PayCycle,
  type PayCycleDetail,
  type PaySplitConfig,
} from '../../services/api';
import { exportAndShareCsv } from '../../utils/exportCsv';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

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

function defaultPeriodDates(): { periodStart: string; periodEnd: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  const fmtD = (d: Date) => d.toISOString().slice(0, 10);
  return { periodStart: fmtD(start), periodEnd: fmtD(end) };
}

export function SupervisorPayRunsScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const s = makeStyles(theme);

  const [view, setView] = useState<ScreenView>('list');
  const [cycles, setCycles] = useState<PayCycle[]>([]);
  const [detail, setDetail] = useState<PayCycleDetail | null>(null);
  const [config, setConfig] = useState<PaySplitConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  async function handleExport(cycleId: number) {
    setExporting(true);
    try {
      const csv = await exportPayCycleCsv(cycleId);
      await exportAndShareCsv(`pay-cycle-${cycleId}.csv`, csv);
    } catch (e: any) {
      setError(e.message ?? 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  const defaults = defaultPeriodDates();
  const [periodStart, setPeriodStart] = useState(defaults.periodStart);
  const [periodEnd, setPeriodEnd] = useState(defaults.periodEnd);
  const [mineralType, setMineralType] = useState('');
  const [unit, setUnit] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [priceFromMarket, setPriceFromMarket] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

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

  useEffect(() => {
    if (view !== 'generate') return;
    getMarketPrices().then(prices => {
      if (!mineralType) return;
      const match = prices.find(p => p.name?.toLowerCase() === mineralType.toLowerCase());
      if (match?.price) { setPricePerUnit(String(match.price)); setPriceFromMarket(true); }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    if (view !== 'generate' || !mineralType) return;
    getMarketPrices().then(prices => {
      const match = prices.find(p => p.name?.toLowerCase() === mineralType.toLowerCase());
      if (match?.price) { setPricePerUnit(String(match.price)); setPriceFromMarket(true); }
      else { setPriceFromMarket(false); }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mineralType]);

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
    if (!periodStart || !periodEnd || !mineralType || !unit || !pricePerUnit) {
      setGenerateError('All fields are required.'); return;
    }
    if (periodEnd < periodStart) {
      setGenerateError('Period end must be on or after period start.'); return;
    }
    const price = parseFloat(pricePerUnit);
    if (isNaN(price) || price <= 0) {
      setGenerateError('Price per unit must be a positive number.'); return;
    }
    setGenerating(true);
    try {
      const d = await previewPayCycle({ periodStart, periodEnd, mineralType, unit, pricePerUnit: price });
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

        <View style={{ alignItems: 'center', flexDirection: 'row', marginBottom: 8 }}>
          <Text style={[s.pageTitle, { flex: 1, marginBottom: 0 }]}>Pay Run Detail</Text>
          <TouchableOpacity style={s.exportBtn} onPress={() => handleExport(cycle.id)} disabled={exporting}>
            <Text style={s.exportBtnText}>{exporting ? '…' : '↓ CSV'}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <View style={s.detailHeaderRow}>
            <Text style={s.detailTitle}>{cycle.mineralType}</Text>
            <View style={[s.statusPill, { backgroundColor: (STATUS_COLOR[cycle.status] ?? '#374151') + '20' }]}>
              <Text style={[s.statusText, { color: STATUS_COLOR[cycle.status] ?? '#374151' }]}>
                {STATUS_LABEL[cycle.status] ?? cycle.status}
              </Text>
            </View>
          </View>
          <Row label="Period" value={`${fmtDate(cycle.periodStart)} – ${fmtDate(cycle.periodEnd)}`} theme={theme} />
          <Row label="Total Volume" value={`${cycle.totalVolume} ${cycle.unit}`} theme={theme} />
          <Row label="Price / Unit" value={fmt(cycle.pricePerUnit)} theme={theme} />
          <Row label="Gross Total" value={fmt(cycle.grossTotal)} bold theme={theme} />
          <Row label="Formula" value={cycle.formulaType === 'EQUAL_PER_HEAD' ? 'Equal per worker' : 'Weighted by hours'} theme={theme} />
          {cycle.managerApprovedBy && <Row label="1st Approved by" value={cycle.managerApprovedBy} theme={theme} />}
          {cycle.supervisorApprovedBy && <Row label="2nd Approved by" value={cycle.supervisorApprovedBy} theme={theme} />}
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
              <TouchableOpacity style={[s.approveBtn, { backgroundColor: theme.success }]} onPress={() => doApprove('supervisor')} disabled={actionLoading}>
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
            <Row label="Gross" value={fmt(r.grossShare)} theme={theme} />
            <Row label="Net Pay" value={fmt(r.netPay)} bold theme={theme} />
            {r.hoursWorked != null && <Row label="Hours" value={`${Number(r.hoursWorked).toFixed(1)} h`} theme={theme} />}
            <Row label="MoMo" value={r.momoNumber ? `${r.momoNumber} (${r.momoNetwork})` : 'No number on file'} theme={theme} />
            <Row label="Status" value={r.disbursementStatus} theme={theme} />
            {r.momoTransactionRef && <Row label="Ref" value={r.momoTransactionRef} mono theme={theme} />}
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
        <Text style={s.pageSub}>Pulls all approved, unpaid shift logs for the week and mineral you specify.</Text>

        <View style={s.card}>
          <Field label="Period Start (YYYY-MM-DD)" value={periodStart} onChange={setPeriodStart} placeholder="e.g. 2026-06-23" theme={theme} />
          <Field label="Period End (YYYY-MM-DD)" value={periodEnd} onChange={setPeriodEnd} placeholder="e.g. 2026-06-29" theme={theme} />
          <Field label="Mineral Type" value={mineralType} onChange={setMineralType} placeholder="e.g. Gold" theme={theme} />
          <Field label="Unit" value={unit} onChange={setUnit} placeholder="e.g. kg or oz" theme={theme} />

          <Text style={s.inputLabel}>Price Per Unit (GHS)</Text>
          <TextInput
            style={s.input}
            value={pricePerUnit}
            onChangeText={v => { setPricePerUnit(v); setPriceFromMarket(false); }}
            placeholder="e.g. 320.00"
            placeholderTextColor={theme.textMuted}
            keyboardType="decimal-pad"
          />
          {priceFromMarket && (
            <Text style={s.marketHint}>Pre-filled from live market rate — edit if needed.</Text>
          )}

          <Text style={[s.inputLabel, { marginTop: 14 }]}>Pay Split Formula</Text>
          <Text style={s.formulaNote}>
            Current: {config?.formulaType === 'WEIGHTED_BY_HOURS' ? 'Weighted by hours worked' : 'Equal per worker'}
            {' '}· <Text style={{ color: theme.accent }} onPress={() => setEditingFormula(true)}>Change</Text>
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
    return <View style={s.centered}><ActivityIndicator color={theme.accent} size="large" /></View>;
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
          <Ionicons name="cash-outline" size={32} color={s.emptyIcon.color} style={s.emptyIcon} />
          <Text style={s.emptyText}>No pay runs yet.</Text>
          <Text style={s.emptySubText}>Tap "Generate Pay Run" to create the first one.</Text>
        </View>
      ) : (
        cycles.map(c => (
          <TouchableOpacity key={c.id} style={s.card} onPress={() => openDetail(c.id)} activeOpacity={0.75}>
            <View style={s.detailHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.detailTitle}>{c.mineralType}</Text>
                <Text style={s.cycleDate}>{fmtDate(c.periodStart)} – {fmtDate(c.periodEnd)}</Text>
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

function Row({ label, value, bold, mono, theme }: { label: string; value: string; bold?: boolean; mono?: boolean; theme: Theme }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderTopColor: theme.bgInput, borderTopWidth: 1 }}>
      <Text style={{ color: theme.textSub, fontSize: 13, fontWeight: '700', flex: 1 }}>{label}</Text>
      <Text style={[{ color: theme.text, fontSize: 13, fontWeight: '700', maxWidth: '55%', textAlign: 'right' }, bold && { fontWeight: '900', color: theme.accent }, mono && { fontSize: 11, fontFamily: 'monospace' }]}>
        {value}
      </Text>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, theme }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; theme: Theme;
}) {
  return (
    <>
      <Text style={{ color: theme.textSub, fontSize: 12, fontWeight: '800', marginTop: 10, marginBottom: 4, textTransform: 'uppercase' }}>{label}</Text>
      <TextInput
        style={{ borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, fontWeight: '700', padding: 10 }}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
      />
    </>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 48 },
    pageTitle: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 2 },
    exportBtn: { backgroundColor: theme.bgHero, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    exportBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    pageSub: { color: theme.textSub, fontSize: 13, fontWeight: '700', marginBottom: 16 },
    backBtn: { marginBottom: 12 },
    backBtnText: { color: theme.accent, fontSize: 14, fontWeight: '800' },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 14, padding: 16 },
    sectionTitle: { color: theme.text, fontSize: 13, fontWeight: '900', letterSpacing: 0.5, marginBottom: 12, textTransform: 'uppercase' },
    sectionHeader: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 10 },
    detailHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    detailTitle: { color: theme.text, fontSize: 15, fontWeight: '900' },
    cycleDate: { color: theme.textSub, fontSize: 12, fontWeight: '700', marginTop: 2 },
    cycleGross: { color: theme.accent, fontSize: 18, fontWeight: '900', marginTop: 4 },
    cycleSub: { color: theme.textSub, fontSize: 12, fontWeight: '600', marginTop: 2 },
    statusPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontWeight: '800' },
    workerName: { color: theme.text, fontSize: 14, fontWeight: '800', marginBottom: 2 },
    workerEmail: { color: theme.textSub, fontSize: 12, fontWeight: '600', marginBottom: 6 },
    failureText: { color: theme.danger, fontSize: 12, fontWeight: '700', marginTop: 4 },
    approveBtn: { backgroundColor: theme.accent, borderRadius: 10, padding: 14, alignItems: 'center' },
    approveBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
    waitingText: { color: theme.amber, fontSize: 13, fontWeight: '700', textAlign: 'center', padding: 8 },
    generateBtn: { backgroundColor: theme.accent, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16 },
    generateBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
    inputLabel: { color: theme.textSub, fontSize: 12, fontWeight: '800', marginTop: 10, marginBottom: 4, textTransform: 'uppercase' },
    input: { borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, fontWeight: '700', padding: 10 },
    marketHint: { color: theme.accent, fontSize: 11, fontWeight: '700', marginTop: 4 },
    formulaNote: { color: theme.textSub, fontSize: 13, fontWeight: '600', marginBottom: 8 },
    formulaBtn: { borderColor: theme.border, borderRadius: 8, borderWidth: 1, padding: 12, marginBottom: 6 },
    formulaBtnActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    formulaBtnText: { color: theme.textSub, fontSize: 13, fontWeight: '800' },
    formulaBtnTextActive: { color: '#fff' },
    errorText: { color: theme.danger, fontSize: 13, fontWeight: '700', marginBottom: 10 },
    emptyCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, alignItems: 'center', padding: 32 },
    emptyIcon: { color: theme.textMuted, fontSize: 36, marginBottom: 10 },
    emptyText: { color: theme.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
    emptySubText: { color: theme.textSub, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  });
}
