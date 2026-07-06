import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getSiteBulkPurchaseRequests, flagForBulkPurchase, withdrawBulkPurchaseRequest, type BulkPurchaseRequest, parseApiError } from '../../services/api';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

const MINERALS = ['Gold', 'Silver', 'Copper', 'Cobalt', 'Lithium', 'Manganese', 'Bauxite'];
const UNITS = ['kg', 'tonnes', 'oz', 'g'];

export function SupervisorBulkPurchaseScreen({ session: _ }: Props) {
  const [requests, setRequests] = useState<BulkPurchaseRequest[]>([]);
  const [mineral, setMineral] = useState('Gold');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('kg');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try { setRequests(await getSiteBulkPurchaseRequests()); } catch { /* best-effort */ }
  }

  useEffect(() => { load(); }, []);

  async function handleFlag() {
    const q = parseFloat(qty);
    if (!q || q <= 0) { Alert.alert('Invalid', 'Enter a valid quantity.'); return; }
    setSubmitting(true);
    try {
      await flagForBulkPurchase({ mineralType: mineral, quantityAvailable: q, unit });
      setQty('');
      await load();
      Alert.alert('Flagged', `${q} ${unit} of ${mineral} flagged for GoldBod bulk purchase.`);
    } catch (e) { Alert.alert('Failed', parseApiError(e)); }
    setSubmitting(false);
  }

  async function handleWithdraw(req: BulkPurchaseRequest) {
    Alert.alert('Withdraw request?', `Remove the ${req.mineralType} request?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw', style: 'destructive',
        onPress: async () => {
          try {
            await withdrawBulkPurchaseRequest(req.id);
            await load();
          } catch (e) { Alert.alert('Failed', parseApiError(e)); }
        },
      },
    ]);
  }

  function statusColor(s: string) {
    if (s === 'FULFILLED') return '#15803d';
    if (s === 'WITHDRAWN') return '#6b7280';
    return '#1d5f99';
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>GoldBod Bulk Purchase</Text>
      <Text style={styles.sub}>Flag site inventory as available for GoldBod acquisition</Text>

      <Text style={styles.sectionTitle}>Flag Inventory</Text>
      <Text style={styles.label}>Mineral</Text>
      <View style={styles.pillRow}>
        {MINERALS.map(m => (
          <Pressable key={m} onPress={() => setMineral(m)} style={[styles.pill, mineral === m && styles.pillActive]}>
            <Text style={[styles.pillText, mineral === m && styles.pillActiveText]}>{m}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Unit</Text>
      <View style={styles.pillRow}>
        {UNITS.map(u => (
          <Pressable key={u} onPress={() => setUnit(u)} style={[styles.pill, unit === u && styles.pillActive]}>
            <Text style={[styles.pillText, unit === u && styles.pillActiveText]}>{u}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Quantity Available</Text>
      <TextInput
        style={styles.input}
        value={qty}
        onChangeText={setQty}
        placeholder="0.000"
        placeholderTextColor="#9aa5b1"
        keyboardType="decimal-pad"
      />
      <Pressable onPress={handleFlag} disabled={submitting} style={[styles.flagBtn, submitting && { opacity: 0.6 }]}>
        <Text style={styles.flagBtnText}>{submitting ? 'Flagging…' : 'Flag for Bulk Purchase'}</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Site Requests</Text>
      {requests.length === 0 && <Text style={styles.meta}>No requests yet.</Text>}
      {requests.map(req => (
        <View key={req.id} style={styles.card}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardMineral}>{req.mineralType}</Text>
              <Text style={styles.cardQty}>{Number(req.quantityAvailable).toLocaleString()} {req.unit}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={[styles.cardStatus, { color: statusColor(req.status) }]}>{req.status}</Text>
              {req.status === 'AVAILABLE' && (
                <Pressable onPress={() => handleWithdraw(req)} style={styles.withdrawBtn}>
                  <Text style={styles.withdrawBtnText}>Withdraw</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f4f6f8' },
  title: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 2 },
  sub: { color: '#8fa3b8', fontSize: 12, fontWeight: '600', marginBottom: 16 },
  sectionTitle: { color: '#17212b', fontSize: 16, fontWeight: '900', marginTop: 12, marginBottom: 8 },
  label: { color: '#5d6875', fontSize: 12, fontWeight: '800', marginBottom: 6, marginTop: 4 },
  meta: { color: '#8fa3b8', fontSize: 13, fontWeight: '600' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  pill: { borderColor: '#dde3ea', borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  pillActive: { backgroundColor: '#17212b', borderColor: '#17212b' },
  pillText: { color: '#5d6875', fontSize: 12, fontWeight: '800' },
  pillActiveText: { color: '#fff' },
  input: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 16, fontWeight: '800', marginBottom: 12, minHeight: 48, paddingHorizontal: 14 },
  flagBtn: { alignItems: 'center', backgroundColor: '#1f6f5b', borderRadius: 10, paddingVertical: 14, marginBottom: 4 },
  flagBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  card: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 8, padding: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardMineral: { color: '#17212b', fontSize: 14, fontWeight: '900', marginBottom: 2 },
  cardQty: { color: '#5d6875', fontSize: 13, fontWeight: '700' },
  cardStatus: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  withdrawBtn: { backgroundColor: '#fff5f5', borderColor: '#fca5a5', borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  withdrawBtnText: { color: '#dc2626', fontSize: 11, fontWeight: '800' },
});
