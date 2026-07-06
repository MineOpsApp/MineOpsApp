import { useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getGovernmentBulkPurchaseRequests, fulfillBulkPurchaseRequest, type BulkPurchaseRequest, parseApiError } from '../../services/api';

export function GovernmentBulkPurchaseScreen() {
  const [requests, setRequests] = useState<BulkPurchaseRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<number | null>(null);

  async function load() {
    try { setRequests(await getGovernmentBulkPurchaseRequests()); } catch { /* best-effort */ }
  }

  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function handleFulfill(req: BulkPurchaseRequest) {
    Alert.alert('Mark as fulfilled?', `${req.site} — ${req.quantityAvailable} ${req.unit} of ${req.mineralType}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Fulfilled',
        onPress: async () => {
          setActing(req.id);
          try {
            const updated = await fulfillBulkPurchaseRequest(req.id);
            setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
          } catch (e) { Alert.alert('Failed', parseApiError(e)); }
          setActing(null);
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
    <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text style={styles.title}>Bulk Purchase Requests</Text>
      <Text style={styles.sub}>Sites flagging inventory for GoldBod acquisition</Text>
      {requests.length === 0 && <Text style={styles.empty}>No requests yet.</Text>}
      {requests.map(req => (
        <View key={req.id} style={styles.card}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mineral}>{req.mineralType}</Text>
              <Text style={styles.site}>{req.site}</Text>
              <Text style={styles.qty}>{Number(req.quantityAvailable).toLocaleString()} {req.unit}</Text>
              <Text style={styles.meta}>Flagged by {req.flaggedByEmail}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <Text style={[styles.status, { color: statusColor(req.status) }]}>{req.status}</Text>
              {req.status === 'AVAILABLE' && (
                <Pressable onPress={() => handleFulfill(req)} disabled={acting === req.id} style={styles.fulfillBtn}>
                  <Text style={styles.fulfillBtnText}>{acting === req.id ? '...' : 'Fulfill'}</Text>
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
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f0f2f5' },
  title: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 2 },
  sub: { color: '#8fa3b8', fontSize: 12, fontWeight: '600', marginBottom: 16 },
  empty: { color: '#8fa3b8', fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#fff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, marginBottom: 10, padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  mineral: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 2 },
  site: { color: '#1f6f5b', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  qty: { color: '#17212b', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  meta: { color: '#8fa3b8', fontSize: 11, fontWeight: '600' },
  status: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  fulfillBtn: { backgroundColor: '#1f6f5b', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  fulfillBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
