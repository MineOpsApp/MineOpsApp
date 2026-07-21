import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import {
  createGuestCode,
  getGuestCodeRoster,
  getGuestCodes,
  revokeGuestCode,
  parseApiError,
  type GuestAccessCode,
  type GuestRosterEntry,
} from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };
type ScreenView = 'list' | 'generate' | 'detail';

const SUB_ROLES = [
  { id: 'visitor', label: 'Visitor', icon: '👤' },
];

const SESSION_OPTIONS = [
  { hours: 8,   label: '8 hours' },
  { hours: 24,  label: '24 hours' },
  { hours: 48,  label: '48 hours' },
  { hours: 168, label: '7 days' },
];

function fmtDate(d: string) {
  try { return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return d; }
}

function defaultExpiresAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16);
}

export function SupervisorGuestCodesScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const s = makeStyles(theme);

  const [view, setView]       = useState<ScreenView>('list');
  const [codes, setCodes]     = useState<GuestAccessCode[]>([]);
  const [detail, setDetail]   = useState<GuestAccessCode | null>(null);
  const [roster, setRoster]   = useState<GuestRosterEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]     = useState('');

  const [subRole, setSubRole]           = useState('visitor');
  const [sessionHours, setSessionHours] = useState(24);
  const [maxRed, setMaxRed]             = useState('1');
  const [expiresAt, setExpiresAt]       = useState(defaultExpiresAt());
  const [generating, setGenerating]     = useState(false);
  const [genError, setGenError]         = useState('');

  const loadCodes = useCallback(async () => {
    try { setCodes(await getGuestCodes()); } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadCodes(); }, [loadCodes]);

  const onRefresh = () => { setRefreshing(true); loadCodes(); };

  const openDetail = async (code: GuestAccessCode) => {
    setDetail(code);
    setRoster(null);
    setError('');
    setView('detail');
    try { setRoster(await getGuestCodeRoster(code.id)); }
    catch (e) { setError(parseApiError(e)); }
  };

  const generate = async () => {
    setGenError('');
    const n = parseInt(maxRed, 10);
    if (!maxRed || isNaN(n) || n < 1) { setGenError('Max guests must be a positive number.'); return; }
    if (!expiresAt) { setGenError('Expiry is required.'); return; }
    setGenerating(true);
    try {
      const created = await createGuestCode({ guestSubRole: subRole, sessionHours, maxRedemptions: n, expiresAt });
      await loadCodes();
      setDetail(created);
      setRoster([]);
      setView('detail');
    } catch (e) {
      setGenError(parseApiError(e));
    } finally {
      setGenerating(false);
    }
  };

  const doRevoke = (code: GuestAccessCode) => {
    Alert.alert('Revoke Code', `Revoke code ${code.code}? Active guests won't be logged out, but no new redemptions will be allowed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke', style: 'destructive',
        onPress: async () => {
          try {
            const updated = await revokeGuestCode(code.id);
            setDetail(updated);
            loadCodes();
          } catch (e) { setError(parseApiError(e)); }
        },
      },
    ]);
  };

  // ── DETAIL VIEW ─────────────────────────────────────────────────────────────
  if (view === 'detail' && detail) {
    const expired = new Date(detail.expiresAt) < new Date();
    const full    = detail.redemptionCount >= detail.maxRedemptions;

    return (
      <ScrollView contentContainerStyle={s.container}>
        <TouchableOpacity onPress={() => setView('list')} style={s.backBtn}>
          <Text style={s.backBtnText}>← Guest Codes</Text>
        </TouchableOpacity>

        <Text style={s.pageTitle}>Code Detail</Text>

        <View style={s.card}>
          <View style={s.qrWrap}>
            <QRCode value={detail.code} size={180} />
          </View>
          <Text style={s.pinLabel}>PIN</Text>
          <Text style={s.pin}>{detail.code}</Text>

          <Row label="Sub-role"    value={detail.guestSubRole} styles={s} />
          <Row label="Session"     value={`${detail.sessionHours}h per guest`} styles={s} />
          <Row label="Joined"      value={`${detail.redemptionCount} / ${detail.maxRedemptions}`} styles={s} />
          <Row label="Expires"     value={fmtDate(detail.expiresAt)} styles={s} />
          <Row label="Status"      value={!detail.active ? 'Revoked' : expired ? 'Expired' : full ? 'Full' : 'Active'} styles={s} />
          <Row label="Created by"  value={detail.createdBy} styles={s} />
        </View>

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        {detail.active && !expired && (
          <TouchableOpacity style={s.revokeBtn} onPress={() => doRevoke(detail)}>
            <Text style={s.revokeBtnText}>Revoke This Code</Text>
          </TouchableOpacity>
        )}

        <Text style={s.sectionHeader}>
          Roster ({roster == null ? '…' : roster.length})
        </Text>

        {roster == null ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 16 }} />
        ) : roster.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No one has joined yet.</Text>
          </View>
        ) : (
          roster.map(r => (
            <View key={r.id} style={s.card}>
              <Text style={s.workerName}>{r.fullName}</Text>
              <Row label="Phone"     value={r.phone} styles={s} />
              <Row label="Joined"    value={fmtDate(r.joinedAt)} styles={s} />
              <Row label="Induction" value={r.inductionCompleted ? '✓ Completed' : '✗ Not yet'} styles={s} />
              <Row label="Session"   value={r.sessionExpired ? 'Expired' : 'Active'} styles={s} />
            </View>
          ))
        )}
      </ScrollView>
    );
  }

  // ── GENERATE VIEW ────────────────────────────────────────────────────────────
  if (view === 'generate') {
    return (
      <ScrollView contentContainerStyle={s.container}>
        <TouchableOpacity onPress={() => setView('list')} style={s.backBtn}>
          <Text style={s.backBtnText}>← Guest Codes</Text>
        </TouchableOpacity>

        <Text style={s.pageTitle}>Generate Code</Text>

        <View style={s.card}>
          <Text style={s.inputLabel}>Guest Type</Text>
          <View style={s.chipRow}>
            {SUB_ROLES.map(r => (
              <TouchableOpacity key={r.id} style={[s.chip, subRole === r.id && s.chipActive]}
                onPress={() => setSubRole(r.id)}>
                <Text style={[s.chipText, subRole === r.id && s.chipTextActive]}>{r.icon} {r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.inputLabel}>Session Duration</Text>
          <View style={s.chipRow}>
            {SESSION_OPTIONS.map(o => (
              <TouchableOpacity key={o.hours} style={[s.chip, sessionHours === o.hours && s.chipActive]}
                onPress={() => setSessionHours(o.hours)}>
                <Text style={[s.chipText, sessionHours === o.hours && s.chipTextActive]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.inputLabel}>Max Guests</Text>
          <TextInput style={s.input} value={maxRed} onChangeText={setMaxRed}
            keyboardType="number-pad" placeholder="e.g. 1 for single, 50 for group tour"
            placeholderTextColor={theme.textMuted} />

          <Text style={s.inputLabel}>Code Expires At (YYYY-MM-DDTHH:mm)</Text>
          <TextInput style={s.input} value={expiresAt} onChangeText={setExpiresAt}
            placeholder="e.g. 2026-07-04T17:00" placeholderTextColor={theme.textMuted}
            autoCapitalize="none" />

          {genError ? <Text style={s.errorText}>{genError}</Text> : null}

          <TouchableOpacity style={[s.primaryBtn, { marginTop: 16 }]} onPress={generate} disabled={generating}>
            <Text style={s.primaryBtnText}>{generating ? 'Generating…' : 'Generate Code'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── LIST VIEW ────────────────────────────────────────────────────────────────
  if (loading) {
    return <View style={s.centered}><ActivityIndicator color={theme.accent} size="large" /></View>;
  }

  return (
    <ScrollView contentContainerStyle={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={s.pageTitle}>Guest Codes</Text>
      <Text style={s.pageSub}>QR / PIN codes for site visitors</Text>

      <TouchableOpacity style={s.primaryBtn} onPress={() => { setView('generate'); setGenError(''); }}>
        <Text style={s.primaryBtnText}>+ Generate Code</Text>
      </TouchableOpacity>

      {codes.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyIcon}>🪪</Text>
          <Text style={s.emptyText}>No codes yet.</Text>
          <Text style={s.emptySubText}>Tap "Generate Code" to create one for a visitor or group.</Text>
        </View>
      ) : (
        codes.map(c => {
          const expired = new Date(c.expiresAt) < new Date();
          const full    = c.redemptionCount >= c.maxRedemptions;
          const status  = !c.active ? 'Revoked' : expired ? 'Expired' : full ? 'Full' : 'Active';
          const statusColor = !c.active || expired ? theme.danger : full ? theme.amber : theme.success;
          return (
            <TouchableOpacity key={c.id} style={s.card} onPress={() => openDetail(c)} activeOpacity={0.75}>
              <View style={s.codeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.codePin}>{c.code}</Text>
                  <Text style={s.codeSub}>{c.guestSubRole} · {c.sessionHours}h · expires {fmtDate(c.expiresAt)}</Text>
                </View>
                <View>
                  <Text style={[s.statusBadge, { color: statusColor }]}>{status}</Text>
                  <Text style={s.redemptionCount}>{c.redemptionCount}/{c.maxRedemptions} joined</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

function Row({ label, value, styles: s }: { label: string; value: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 48 },
    pageTitle: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 2 },
    pageSub:   { color: theme.textSub, fontSize: 13, fontWeight: '700', marginBottom: 16 },

    backBtn:     { marginBottom: 12 },
    backBtnText: { color: theme.accent, fontSize: 14, fontWeight: '800' },

    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 14, padding: 16 },

    qrWrap:   { alignItems: 'center', marginBottom: 16 },
    pinLabel: { color: theme.textSub, fontSize: 11, fontWeight: '800', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 },
    pin:      { color: theme.text, fontSize: 36, fontWeight: '900', textAlign: 'center', letterSpacing: 6, marginBottom: 12 },

    row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopColor: theme.bgInput, borderTopWidth: 1 },
    label: { color: theme.textSub, fontSize: 13, fontWeight: '700', flex: 1 },
    value: { color: theme.text, fontSize: 13, fontWeight: '700', maxWidth: '55%', textAlign: 'right' },

    sectionHeader: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 10, marginTop: 4 },

    workerName: { color: theme.text, fontSize: 14, fontWeight: '800', marginBottom: 6 },

    codeRow:        { flexDirection: 'row', alignItems: 'center' },
    codePin:        { color: theme.text, fontSize: 22, fontWeight: '900', letterSpacing: 3, marginBottom: 2 },
    codeSub:        { color: theme.textSub, fontSize: 12, fontWeight: '600' },
    statusBadge:    { fontSize: 12, fontWeight: '800', textAlign: 'right', marginBottom: 2 },
    redemptionCount:{ color: theme.textSub, fontSize: 11, fontWeight: '700', textAlign: 'right' },

    primaryBtn:     { backgroundColor: theme.accent, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16 },
    primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },

    revokeBtn:     { backgroundColor: theme.dangerLight, borderColor: theme.danger, borderRadius: 10, borderWidth: 1, padding: 14, alignItems: 'center', marginBottom: 16 },
    revokeBtnText: { color: theme.danger, fontSize: 14, fontWeight: '900' },

    inputLabel: { color: theme.textSub, fontSize: 12, fontWeight: '800', marginTop: 10, marginBottom: 6, textTransform: 'uppercase' },
    input:      { borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, fontWeight: '700', padding: 10 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    chip:        { borderColor: theme.border, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
    chipActive:  { backgroundColor: theme.accent, borderColor: theme.accent },
    chipText:     { color: theme.textSub, fontSize: 13, fontWeight: '700' },
    chipTextActive: { color: '#fff' },

    errorText: { color: theme.danger, fontSize: 13, fontWeight: '700', marginBottom: 8 },

    emptyCard:    { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, alignItems: 'center', padding: 32 },
    emptyIcon:    { fontSize: 36, marginBottom: 10 },
    emptyText:    { color: theme.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
    emptySubText: { color: theme.textSub, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  });
}
