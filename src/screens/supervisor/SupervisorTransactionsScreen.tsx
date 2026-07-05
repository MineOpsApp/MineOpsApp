import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { getSiteTransactions, updateTransactionStatus, submitRating, raiseDispute, parseApiError, type MarketplaceTransaction } from '../../services/api';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

const BATCH_FLOW: string[] = ['PREPARING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED'];

const BATCH_COLORS: Record<string, string> = {
  PREPARING: '#d29922',
  DISPATCHED: '#1d5f99',
  IN_TRANSIT: '#7c3aed',
  DELIVERED: '#1f6f5b',
};

const BATCH_ICONS: Record<string, string> = {
  PREPARING: '📦',
  DISPATCHED: '🚚',
  IN_TRANSIT: '🛣',
  DELIVERED: '✓',
};

export function SupervisorTransactionsScreen({ session: _ }: Props) {
  const [transactions, setTransactions] = useState<MarketplaceTransaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<number | null>(null);
  const [ratingTx, setRatingTx] = useState<MarketplaceTransaction | null>(null);
  const [reliability, setReliability] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [disputeTx, setDisputeTx] = useState<MarketplaceTransaction | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);

  function load() {
    return getSiteTransactions().then(setTransactions).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleAdvance(tx: MarketplaceTransaction) {
    const idx = BATCH_FLOW.indexOf(tx.batchStatus);
    if (idx < 0 || idx >= BATCH_FLOW.length - 1) return;
    const next = BATCH_FLOW[idx + 1];
    Alert.alert(`Mark as ${next}?`, `Update batch status for ${tx.mineralType} (Txn #${tx.id}).`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Update',
        onPress: async () => {
          setActing(tx.id);
          try {
            const updated = await updateTransactionStatus(tx.id, next);
            setTransactions((prev) => prev.map((t) => (t.id === tx.id ? updated : t)));
          } catch {
            Alert.alert('Failed', 'Could not update status.');
          } finally {
            setActing(null);
          }
        },
      },
    ]);
  }

  async function handleSubmitRating() {
    if (!ratingTx) return;
    setSubmittingRating(true);
    try {
      await submitRating(ratingTx.id, { reliability, communication, comment: ratingComment.trim() || undefined });
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

  function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
    return (
      <View style={{ marginBottom: 10 }}>
        <Text style={{ color: '#8fa3b8', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>{label}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity key={n} onPress={() => onChange(n)}>
              <Text style={{ fontSize: 24, color: n <= value ? '#f59e0b' : '#d1d5db' }}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  function formatDate(s: string | null) {
    if (!s) return '';
    try { return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return s ?? ''; }
  }

  return (
    <>
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>Transactions</Text>
      <Text style={styles.subtitle}>Site transaction history — pull to refresh</Text>

      {transactions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={styles.emptySub}>Accepted offers create transaction records here</Text>
        </View>
      ) : (
        transactions.map((tx) => {
          const color = BATCH_COLORS[tx.batchStatus] ?? '#8fa3b8';
          const icon = BATCH_ICONS[tx.batchStatus] ?? '📦';
          const canAdvance = BATCH_FLOW.indexOf(tx.batchStatus) < BATCH_FLOW.length - 1;
          const idx = BATCH_FLOW.indexOf(tx.batchStatus);
          const nextStatus = idx >= 0 && idx < BATCH_FLOW.length - 1 ? BATCH_FLOW[idx + 1] : null;
          return (
            <View key={tx.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mineral}>{tx.mineralType}</Text>
                  <Text style={styles.buyer}>{tx.buyerName} · {tx.buyerEmail}</Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: color, backgroundColor: color + '20' }]}>
                  <Text style={[styles.statusText, { color }]}>{icon} {tx.batchStatus}</Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}><Text style={styles.label}>Quantity</Text><Text style={styles.value}>{Number(tx.quantity).toLocaleString()}</Text></View>
                <View style={styles.col}><Text style={styles.label}>Agreed Price</Text><Text style={styles.value}>GHS {Number(tx.agreedPrice).toLocaleString()}</Text></View>
              </View>

              <View style={styles.footer}>
                <Text style={styles.txId}>Txn #{tx.id}</Text>
                <Text style={styles.date}>{formatDate(tx.createdAt)}</Text>
              </View>

              {canAdvance ? (
                <Pressable
                  onPress={() => handleAdvance(tx)}
                  disabled={acting === tx.id}
                  style={[styles.advanceBtn, acting === tx.id && styles.btnDisabled]}
                >
                  <Text style={styles.advanceBtnText}>
                    {acting === tx.id ? '…' : `Mark as ${nextStatus} →`}
                  </Text>
                </Pressable>
              ) : (
                <View>
                  <View style={styles.deliveredBadge}>
                    <Text style={styles.deliveredText}>✓ Delivered</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <Pressable style={styles.rateBtn} onPress={() => setRatingTx(tx)}>
                      <Text style={styles.rateBtnText}>★ Rate Buyer</Text>
                    </Pressable>
                    <Pressable style={styles.disputeBtn} onPress={() => setDisputeTx(tx)}>
                      <Text style={styles.disputeBtnText}>⚑ Dispute</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>

    <Modal visible={ratingTx !== null} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Rate Buyer — Txn #{ratingTx?.id}</Text>
          <StarRow label="RELIABILITY" value={reliability} onChange={setReliability} />
          <StarRow label="COMMUNICATION" value={communication} onChange={setCommunication} />
          <TextInput
            style={styles.modalInput}
            placeholder="Comment (optional)"
            placeholderTextColor="#8fa3b8"
            value={ratingComment}
            onChangeText={setRatingComment}
            multiline
          />
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
          <Text style={styles.modalTitle}>Raise Dispute — Txn #{disputeTx?.id}</Text>
          <TextInput
            style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
            placeholder="Describe the issue..."
            placeholderTextColor="#8fa3b8"
            value={disputeReason}
            onChangeText={setDisputeReason}
            multiline
          />
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

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f0f2f5' },
  title: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 2 },
  subtitle: { color: '#8fa3b8', fontSize: 11, fontWeight: '600', marginBottom: 16 },
  emptyCard: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, padding: 40 },
  emptyIcon: { fontSize: 32, marginBottom: 10 },
  emptyTitle: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  emptySub: { color: '#8fa3b8', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 12, padding: 14 },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: 12 },
  mineral: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 2 },
  buyer: { color: '#5d6875', fontSize: 11, fontWeight: '600' },
  statusBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  col: { flex: 1 },
  label: { color: '#8fa3b8', fontSize: 10, fontWeight: '700', marginBottom: 2, textTransform: 'uppercase' },
  value: { color: '#17212b', fontSize: 14, fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  txId: { color: '#8fa3b8', fontSize: 11, fontWeight: '700' },
  date: { color: '#8fa3b8', fontSize: 11, fontWeight: '600' },
  advanceBtn: { alignItems: 'center', backgroundColor: '#1f6f5b', borderRadius: 8, paddingVertical: 10 },
  advanceBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  btnDisabled: { opacity: 0.5 },
  deliveredBadge: { alignItems: 'center', backgroundColor: '#dcfce7', borderRadius: 8, paddingVertical: 8 },
  deliveredText: { color: '#1f6f5b', fontSize: 13, fontWeight: '800' },
  rateBtn: { flex: 1, backgroundColor: '#f59e0b', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  rateBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 12 },
  disputeBtn: { flex: 1, backgroundColor: '#fee2e2', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  disputeBtnText: { color: '#dc2626', fontWeight: '800', fontSize: 12 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  modalTitle: { color: '#17212b', fontSize: 16, fontWeight: '900', marginBottom: 14 },
  modalInput: { backgroundColor: '#f0f2f5', borderRadius: 8, padding: 12, color: '#17212b', marginBottom: 10, fontSize: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 8 },
  cancelText: { color: '#8fa3b8', fontWeight: '700' },
  submitBtn: { backgroundColor: '#1f6f5b', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 10 },
  submitBtnText: { color: '#fff', fontWeight: '800' },
});
