import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  getSubscriptionTiers,
  getMySiteSubscription,
  recordSubscriptionPayment,
  type SubscriptionTier,
  type SiteSubscription,
  parseApiError,
} from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

const METHODS = ['MOMO', 'BANK_TRANSFER', 'OTHER'];

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  return iso.split('T')[0];
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const end = new Date(iso);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function SupervisorSubscriptionScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [sub, setSub] = useState<SiteSubscription | null>(null);
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = useState(true);

  const [amountGhs, setAmountGhs] = useState('');
  const [method, setMethod] = useState('MOMO');
  const [reference, setReference] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [selectedTierId, setSelectedTierId] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const [s, t] = await Promise.all([getMySiteSubscription(), getSubscriptionTiers()]);
      setSub(s);
      setTiers(t);
      if (s.tierId) setSelectedTierId(s.tierId);
    } catch { /* best-effort */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleRecordPayment() {
    if (!amountGhs.trim() || isNaN(parseFloat(amountGhs))) {
      Alert.alert('Required', 'Enter a valid amount in GHS.'); return;
    }
    if (!periodEnd.trim()) {
      Alert.alert('Required', 'Enter the period end date (YYYY-MM-DD).'); return;
    }
    setSubmitting(true);
    try {
      const result = await recordSubscriptionPayment({
        amountGhs: amountGhs.trim(),
        method,
        reference: reference.trim() || undefined,
        periodCoveredStart: periodStart.trim() || undefined,
        periodCoveredEnd: periodEnd.trim(),
        tierId: selectedTierId,
      });
      setSub(result.subscription);
      setAmountGhs('');
      setReference('');
      setPeriodStart('');
      setPeriodEnd('');
      Alert.alert('Recorded', 'Payment recorded. Subscription updated to Active.');
    } catch (e) {
      Alert.alert('Failed', parseApiError(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading subscription…</Text>
      </View>
    );
  }

  const status = sub?.status ?? 'TRIAL';
  const trialDays = daysUntil(sub?.trialEndsAt);
  const renewDays = daysUntil(sub?.currentPeriodEndsAt);
  const currentTier = tiers.find(t => t.id === sub?.tierId);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Subscription</Text>
      <Text style={styles.sub}>Manage your site's MineOps subscription and record payments.</Text>

      {status === 'TRIAL' && (
        <View style={[styles.banner, styles.bannerTrial]}>
          <Text style={styles.bannerTitle}>Free Trial</Text>
          <Text style={styles.bannerBody}>
            {sub?.trialEndsAt
              ? `Trial ends ${fmt(sub.trialEndsAt)}${trialDays !== null ? ` — ${trialDays} day${trialDays === 1 ? '' : 's'} remaining` : ''}`
              : 'Record a payment below to activate your subscription.'}
          </Text>
        </View>
      )}
      {status === 'PAST_DUE' && (
        <View style={[styles.banner, styles.bannerPastDue]}>
          <Text style={styles.bannerTitle}>Payment Overdue</Text>
          <Text style={styles.bannerBody}>Your subscription has lapsed. Record a payment to restore access.</Text>
        </View>
      )}
      {status === 'ACTIVE' && (
        <View style={[styles.banner, styles.bannerActive]}>
          <Text style={styles.bannerTitle}>Active</Text>
          <Text style={styles.bannerBody}>
            {sub?.currentPeriodEndsAt
              ? `Renews ${fmt(sub.currentPeriodEndsAt)}${renewDays !== null && renewDays <= 14 ? ` — ${renewDays} day${renewDays === 1 ? '' : 's'} remaining` : ''}`
              : 'Subscription is active.'}
          </Text>
        </View>
      )}
      {status === 'CANCELLED' && (
        <View style={[styles.banner, styles.bannerCancelled]}>
          <Text style={styles.bannerTitle}>Cancelled</Text>
          <Text style={styles.bannerBody}>This site's subscription has been cancelled.</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Current Plan</Text>
        <Text style={styles.cardValue}>
          {currentTier ? `${currentTier.name} — GHS ${Number(currentTier.monthlyPriceGhs).toLocaleString()}/mo` : 'No plan selected'}
        </Text>
        {currentTier?.description ? (
          <Text style={styles.cardMeta}>{currentTier.description}</Text>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Record a Payment</Text>
      <Text style={styles.hint}>
        Payments made outside the app (bank transfer, MoMo send-money) are recorded here manually.
        This updates your subscription status immediately.
      </Text>

      {tiers.length > 0 && (
        <>
          <Text style={styles.label}>Plan</Text>
          <View style={styles.pillRow}>
            {tiers.map(t => (
              <Pressable
                key={t.id}
                onPress={() => setSelectedTierId(t.id)}
                style={[styles.pill, selectedTierId === t.id && styles.pillActive]}
              >
                <Text style={[styles.pillText, selectedTierId === t.id && styles.pillActiveText]}>
                  {t.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Text style={styles.label}>Amount (GHS) *</Text>
      <TextInput
        style={styles.input}
        value={amountGhs}
        onChangeText={setAmountGhs}
        placeholder="e.g. 500.00"
        placeholderTextColor={theme.textMuted}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Payment Method *</Text>
      <View style={styles.pillRow}>
        {METHODS.map(m => (
          <Pressable
            key={m}
            onPress={() => setMethod(m)}
            style={[styles.pill, method === m && styles.pillActive]}
          >
            <Text style={[styles.pillText, method === m && styles.pillActiveText]}>
              {m === 'MOMO' ? 'MoMo' : m === 'BANK_TRANSFER' ? 'Bank Transfer' : 'Other'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>External Reference (optional)</Text>
      <TextInput
        style={styles.input}
        value={reference}
        onChangeText={setReference}
        placeholder="Transaction ID, receipt number, etc."
        placeholderTextColor={theme.textMuted}
      />

      <Text style={styles.label}>Period Start (YYYY-MM-DD, optional)</Text>
      <TextInput
        style={styles.input}
        value={periodStart}
        onChangeText={setPeriodStart}
        placeholder="2026-07-01"
        placeholderTextColor={theme.textMuted}
        keyboardType="numbers-and-punctuation"
      />

      <Text style={styles.label}>Period End (YYYY-MM-DD) *</Text>
      <TextInput
        style={styles.input}
        value={periodEnd}
        onChangeText={setPeriodEnd}
        placeholder="2026-07-31"
        placeholderTextColor={theme.textMuted}
        keyboardType="numbers-and-punctuation"
      />

      <Pressable
        onPress={handleRecordPayment}
        disabled={submitting}
        style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
      >
        <Text style={styles.submitBtnText}>{submitting ? 'Recording…' : 'Record Payment'}</Text>
      </Pressable>

      <Text style={styles.disclaimer}>
        Recording a payment does not verify a transaction with any payment provider. It is a
        self-reported record that will be reconciled by MineOps administrators.
      </Text>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48, backgroundColor: theme.bg },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
    loadingText: { color: theme.textMuted, fontSize: 14, fontWeight: '600' },
    title: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 4 },
    sub: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 16 },
    banner: { borderRadius: 10, padding: 14, marginBottom: 16 },
    bannerTrial: { backgroundColor: theme.amberLight, borderColor: theme.amber, borderWidth: 1 },
    bannerPastDue: { backgroundColor: theme.dangerLight, borderColor: theme.danger, borderWidth: 1 },
    bannerActive: { backgroundColor: theme.successLight, borderColor: theme.success, borderWidth: 1 },
    bannerCancelled: { backgroundColor: theme.bgInput, borderColor: theme.border, borderWidth: 1 },
    bannerTitle: { fontSize: 14, fontWeight: '900', color: theme.text, marginBottom: 2 },
    bannerBody: { fontSize: 13, fontWeight: '600', color: theme.textSub },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 20 },
    cardLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
    cardValue: { color: theme.text, fontSize: 15, fontWeight: '900' },
    cardMeta: { color: theme.textSub, fontSize: 12, fontWeight: '600', marginTop: 4 },
    sectionTitle: { color: theme.text, fontSize: 16, fontWeight: '900', marginBottom: 6 },
    hint: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 14, lineHeight: 18 },
    label: { color: theme.textSub, fontSize: 12, fontWeight: '800', marginBottom: 6, marginTop: 4 },
    input: {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.text,
      fontSize: 15,
      marginBottom: 12,
      minHeight: 48,
      paddingHorizontal: 14,
    },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    pill: { borderColor: theme.border, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
    pillActive: { backgroundColor: theme.bgHero, borderColor: theme.bgHero },
    pillText: { color: theme.textSub, fontSize: 13, fontWeight: '800' },
    pillActiveText: { color: '#fff' },
    submitBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 10, paddingVertical: 14, marginBottom: 12 },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
    disclaimer: { color: theme.textMuted, fontSize: 11, fontWeight: '600', lineHeight: 16, textAlign: 'center' },
  });
}
