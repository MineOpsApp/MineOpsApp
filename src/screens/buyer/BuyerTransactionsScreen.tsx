import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMyTransactions, type MarketplaceTransaction } from '../../services/api';
import type { AuthSession } from '../../types/auth';

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

const BATCH_ICONS: Record<string, string> = {
  PREPARING: '📦',
  DISPATCHED: '🚚',
  IN_TRANSIT: '🛣',
  DELIVERED: '✓',
};

export function BuyerTransactionsScreen({ session: _ }: Props) {
  const [transactions, setTransactions] = useState<MarketplaceTransaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  function load() {
    return getMyTransactions().then(setTransactions).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function formatDate(s: string | null) {
    if (!s) return '';
    try { return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return s; }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>My Purchases</Text>
      <Text style={styles.subtitle}>Pull to refresh</Text>

      {transactions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={styles.emptySub}>Accepted offers appear here with dispatch tracking</Text>
        </View>
      ) : (
        transactions.map((tx) => {
          const color = BATCH_COLORS[tx.batchStatus] ?? '#8fa3b8';
          const icon = BATCH_ICONS[tx.batchStatus] ?? '📦';
          return (
            <View key={tx.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mineral}>{tx.mineralType}</Text>
                  <Text style={styles.site}>{tx.site}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: color + '20', borderColor: color }]}>
                  <Text style={[styles.statusText, { color }]}>{icon} {BATCH_LABELS[tx.batchStatus] ?? tx.batchStatus}</Text>
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
            </View>
          );
        })
      )}
    </ScrollView>
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
  mineral: { color: '#17212b', fontSize: 16, fontWeight: '900', marginBottom: 2 },
  site: { color: '#1f6f5b', fontSize: 12, fontWeight: '700' },
  statusBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  col: { flex: 1 },
  label: { color: '#8fa3b8', fontSize: 10, fontWeight: '700', marginBottom: 2, textTransform: 'uppercase' },
  value: { color: '#17212b', fontSize: 14, fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  txId: { color: '#8fa3b8', fontSize: 11, fontWeight: '700' },
  date: { color: '#8fa3b8', fontSize: 11, fontWeight: '600' },
  updated: { color: '#8fa3b8', fontSize: 11, fontWeight: '600', marginTop: 2 },
});
