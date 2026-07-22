import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { getMyTransactions, submitRating, raiseDispute, parseApiError, type MarketplaceTransaction } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, typography, spacing, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

const BATCH_COLORS: Record<string, string> = {
  PREPARING: '#d29922',
  DISPATCHED: '#1d5f99',
  IN_TRANSIT: '#7c3aed',
  DELIVERED: '#1f6f5b',
};

const BATCH_LABELS: Record<string, string> = {
  PREPARING: 'Preparing',
  DISPATCHED: 'Dispatched',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
};

const BATCH_ICON_NAMES: Record<string, string> = {
  PREPARING: 'cube-outline',
  DISPATCHED: 'car-outline',
  IN_TRANSIT: 'trail-sign-outline',
  DELIVERED: 'checkmark-circle-outline',
};

function StarRow({ label, value, onChange, theme }: { label: string; value: number; onChange: (v: number) => void; theme: Theme }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity key={n} onPress={() => onChange(n)}>
            <Text style={{ fontSize: 24, color: n <= value ? theme.accent : theme.border }}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export function BuyerTransactionsScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

  const [transactions, setTransactions] = useState<MarketplaceTransaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [ratingTx, setRatingTx] = useState<MarketplaceTransaction | null>(null);
  const [reliability, setReliability] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [listingAccuracy, setListingAccuracy] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [disputeTx, setDisputeTx] = useState<MarketplaceTransaction | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);

  function load() {
    return getMyTransactions().then(setTransactions).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleSubmitRating() {
    if (!ratingTx) return;
    setSubmittingRating(true);
    try {
      await submitRating(ratingTx.id, { reliability, communication, listingAccuracy, comment: ratingComment.trim() || undefined });
      Alert.alert('Thanks!', 'Rating submitted.');
      setRatingTx(null); setRatingComment('');
    } catch (e: any) {
      Alert.alert('Error', parseApiError(e));
    } finally {
      setSubmittingRating(false);
    }
  }

  async function handleSubmitDispute() {
    if (!disputeTx || !disputeReason.trim()) { Alert.alert('Required', 'Please provide a reason.'); return; }
    setSubmittingDispute(true);
    try {
      await raiseDispute(disputeTx.id, disputeReason.trim());
      Alert.alert('Dispute raised', 'A supervisor will review and resolve it.');
      setDisputeTx(null); setDisputeReason('');
    } catch (e: any) {
      Alert.alert('Error', parseApiError(e));
    } finally {
      setSubmittingDispute(false);
    }
  }

  function formatDate(s: string | null) {
    if (!s) return '';
    try { return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return s; }
  }

  return (
    <>
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>My Purchases</Text>
      <Text style={styles.subtitle}>Pull to refresh</Text>

      {transactions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="cube-outline" size={32} color={theme.textMuted} style={{ marginBottom: 10 }} />
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={styles.emptySub}>Accepted offers appear here with dispatch tracking</Text>
        </View>
      ) : (
        transactions.map((tx) => {
          const color = BATCH_COLORS[tx.batchStatus] ?? theme.textMuted;
          const iconName = (BATCH_ICON_NAMES[tx.batchStatus] ?? 'cube-outline') as any;
          return (
            <View key={tx.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mineral}>{tx.mineralType}</Text>
                  <Text style={styles.site}>{tx.site}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: color + '20', borderColor: color }]}>
                  <Ionicons name={iconName} size={12} color={color} />
                  <Text style={[styles.statusText, { color }]}>{BATCH_LABELS[tx.batchStatus] ?? tx.batchStatus}</Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Quantity</Text>
                  <Text style={styles.value}>{Number(tx.quantity).toLocaleString()}</Text>
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Agreed Price</Text>
                  <Text style={styles.value}>GHS {Number(tx.agreedPrice).toLocaleString()}</Text>
                </View>
              </View>

              <View style={styles.footer}>
                <Text style={styles.txId}>Txn #{tx.id}</Text>
                <Text style={styles.date}>{formatDate(tx.createdAt)}</Text>
              </View>
              {tx.updatedAt ? (
                <Text style={styles.updated}>Last updated {formatDate(tx.updatedAt)}</Text>
              ) : null}
              {tx.batchStatus === 'DELIVERED' ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <Pressable style={styles.rateBtn} onPress={() => setRatingTx(tx)}>
                    <Text style={styles.rateBtnText}>★ Rate</Text>
                  </Pressable>
                  <Pressable style={styles.disputeBtn} onPress={() => setDisputeTx(tx)}>
                    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 4 }}>
                      <Ionicons name="flag-outline" size={13} color={theme.danger} />
                      <Text style={styles.disputeBtnText}>Dispute</Text>
                    </View>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>

    <Modal visible={ratingTx !== null} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Rate Transaction #{ratingTx?.id}</Text>
            <StarRow label="RELIABILITY" value={reliability} onChange={setReliability} theme={theme} />
            <StarRow label="COMMUNICATION" value={communication} onChange={setCommunication} theme={theme} />
            <StarRow label="LISTING ACCURACY" value={listingAccuracy} onChange={setListingAccuracy} theme={theme} />
            <TextInput
              style={styles.modalInput}
              placeholder="Comment (optional)"
              placeholderTextColor={theme.textMuted}
              value={ratingComment}
              onChangeText={setRatingComment}
              multiline
            />
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable onPress={() => setRatingTx(null)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Pressable style={[styles.submitBtn, submittingRating && { opacity: 0.5 }]} onPress={handleSubmitRating} disabled={submittingRating}>
              <Text style={styles.submitBtnText}>{submittingRating ? 'Submitting…' : 'Submit'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>

    <Modal visible={disputeTx !== null} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Raise Dispute — Txn #{disputeTx?.id}</Text>
            <TextInput
              style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Describe the issue..."
              placeholderTextColor={theme.textMuted}
              value={disputeReason}
              onChangeText={setDisputeReason}
              multiline
            />
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable onPress={() => setDisputeTx(null)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Pressable style={[styles.submitBtn, submittingDispute && { opacity: 0.5 }]} onPress={handleSubmitDispute} disabled={submittingDispute}>
              <Text style={styles.submitBtnText}>{submittingDispute ? 'Submitting…' : 'Raise Dispute'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

function makeStyles(theme: Theme, isDark: boolean) {
  const cardShadow = {
    shadowColor: '#000' as const,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 4,
    elevation: 2,
  };
  return StyleSheet.create({
    container: { padding: spacing.xl, paddingBottom: 40, backgroundColor: theme.bg },
    title: { ...typography.h1, color: theme.text, marginBottom: spacing.xl },
    subtitle: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginBottom: spacing.lg },
    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 40, ...cardShadow },
    emptyTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
    emptySub: { color: theme.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.md, padding: 14, ...cardShadow },
    cardHeader: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: spacing.md },
    mineral: { color: theme.text, fontSize: 16, fontWeight: '900', marginBottom: 2 },
    site: { color: theme.accent, fontSize: 12, fontWeight: '700' },
    statusBadge: { alignItems: 'center', borderRadius: 6, borderWidth: 1, flexDirection: 'row', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4 },
    statusText: { fontSize: 11, fontWeight: '800' },
    row: { flexDirection: 'row', gap: spacing.lg, marginBottom: 10 },
    col: { flex: 1 },
    label: { color: theme.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 2, textTransform: 'uppercase' },
    value: { color: theme.text, fontSize: 14, fontWeight: '800' },
    footer: { flexDirection: 'row', justifyContent: 'space-between' },
    txId: { color: theme.textMuted, fontSize: 11, fontWeight: '700' },
    date: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
    updated: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
    rateBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 8, flex: 1, paddingVertical: spacing.sm },
    rateBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 13 },
    disputeBtn: { alignItems: 'center', backgroundColor: theme.dangerLight, borderRadius: 8, flex: 1, paddingVertical: spacing.sm },
    disputeBtnText: { color: theme.danger, fontWeight: '800', fontSize: 13 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalSheet: { backgroundColor: theme.bgCard, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.xl, maxHeight: '85%' },
    modalTitle: { color: theme.text, fontSize: 16, fontWeight: '900', marginBottom: 14 },
    modalInput: { backgroundColor: theme.bg, borderRadius: 8, color: theme.text, fontSize: 14, marginBottom: 10, padding: spacing.md },
    modalActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg, justifyContent: 'flex-end', marginTop: spacing.sm },
    cancelText: { color: theme.textMuted, fontWeight: '700' },
    submitBtn: { backgroundColor: theme.accent, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 10 },
    submitBtnText: { color: '#fff', fontWeight: '800' },
  });
}
