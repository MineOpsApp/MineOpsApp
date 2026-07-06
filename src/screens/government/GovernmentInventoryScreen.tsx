import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getGovernmentInventory, type MineralInventory } from '../../services/api';

export function GovernmentInventoryScreen() {
  const [inventory, setInventory] = useState<MineralInventory[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try { setInventory(await getGovernmentInventory()); } catch { /* best-effort */ }
  }

  useEffect(() => { load(); }, []);

  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  const bySite = inventory.reduce<Record<string, MineralInventory[]>>((acc, item) => {
    (acc[item.site] = acc[item.site] ?? []).push(item);
    return acc;
  }, {});

  return (
    <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text style={styles.title}>National Mineral Inventory</Text>
      <Text style={styles.sub}>Self-reported stock across all registered sites</Text>
      {Object.entries(bySite).map(([site, items]) => (
        <View key={site} style={styles.siteBlock}>
          <Text style={styles.siteName}>{site}</Text>
          {items.map(inv => (
            <View key={inv.id} style={styles.row}>
              <Text style={styles.mineral}>{inv.mineralType}</Text>
              <Text style={styles.volume}>{Number(inv.totalVolume).toLocaleString()} {inv.unit}</Text>
            </View>
          ))}
        </View>
      ))}
      {inventory.length === 0 && <Text style={styles.empty}>No inventory data available.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f0f2f5' },
  title: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 2 },
  sub: { color: '#8fa3b8', fontSize: 12, fontWeight: '600', marginBottom: 16 },
  siteBlock: { backgroundColor: '#fff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, marginBottom: 12, padding: 14 },
  siteName: { color: '#1f6f5b', fontSize: 14, fontWeight: '900', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  mineral: { color: '#17212b', fontSize: 13, fontWeight: '700' },
  volume: { color: '#5d6875', fontSize: 13, fontWeight: '700' },
  empty: { color: '#8fa3b8', fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 40 },
});
