import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getGovernmentInventory, type MineralInventory } from '../../services/api';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

export function GovernmentInventoryScreen() {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

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

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 40, backgroundColor: theme.bg },
    title: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 2 },
    sub: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 16 },
    siteBlock: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, marginBottom: 12, padding: 14 },
    siteName: { color: theme.accent, fontSize: 14, fontWeight: '900', marginBottom: 8 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    mineral: { color: theme.text, fontSize: 13, fontWeight: '700' },
    volume: { color: theme.textSub, fontSize: 13, fontWeight: '700' },
    empty: { color: theme.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 40 },
  });
}
