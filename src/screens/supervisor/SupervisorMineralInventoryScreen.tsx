import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

import { getSiteInventory, getSiteInventoryHistory, getSites, updateInventoryVisibility } from '../../services/api';
import type { InventoryTransaction, MineralInventory } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Tab = 'summary' | 'history';

type Props = { session: AuthSession };

export function SupervisorMineralInventoryScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [tab, setTab] = useState<Tab>('summary');
  const [inventory, setInventory] = useState<MineralInventory[]>([]);
  const [history, setHistory] = useState<InventoryTransaction[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visibilityOn, setVisibilityOn] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  async function loadInventory() {
    try {
      const data = await getSiteInventory();
      setInventory(data);
    } catch {}
  }

  async function loadHistory(page: number, replace: boolean) {
    setLoadingHistory(true);
    try {
      const data = await getSiteInventoryHistory(page, 20);
      setHistory((prev) => replace ? data.content : [...prev, ...data.content]);
      setTotalElements(data.totalElements);
    } catch {}
    setLoadingHistory(false);
  }

  useEffect(() => {
    Promise.all([loadInventory(), loadHistory(0, true)]).finally(() => setLoading(false));
    getSites().then((sites) => {
      const mine = sites.find((s) => s.name?.toLowerCase() === session.user.assignedSite?.toLowerCase());
      if (mine) setVisibilityOn(mine.inventoryVisibleToGuests ?? false);
    }).catch(() => {});
  }, []);

  async function toggleVisibility(value: boolean) {
    setTogglingVisibility(true);
    try {
      const updated = await updateInventoryVisibility(value);
      setVisibilityOn(updated.inventoryVisibleToGuests ?? value);
    } catch {
    } finally {
      setTogglingVisibility(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    setHistoryPage(0);
    await Promise.all([loadInventory(), loadHistory(0, true)]);
    setRefreshing(false);
  }

  function loadMore() {
    const next = historyPage + 1;
    setHistoryPage(next);
    loadHistory(next, false);
  }

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return dateStr; }
  }

  function formatRelative(dateStr: string) {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const hours = Math.floor(diff / 3600000);
      if (hours < 1) return 'just now';
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch { return dateStr; }
  }

  const todayVolume: Record<string, number> = {};
  const todayStr = new Date().toDateString();
  history.forEach((tx) => {
    if (new Date(tx.createdAt).toDateString() === todayStr) {
      const key = `${tx.mineralType} (${tx.unit})`;
      todayVolume[key] = (todayVolume[key] ?? 0) + Number(tx.volumeAdded);
    }
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={styles.header}>
        <Text style={styles.title}>Mineral Inventory</Text>
        <Text style={styles.subtitle}>Live inventory from approved shift logs</Text>
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, tab === 'summary' && styles.tabActive]}
            onPress={() => setTab('summary')}
          >
            <Text style={[styles.tabText, tab === 'summary' && styles.tabTextActive]}>Summary</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'history' && styles.tabActive]}
            onPress={() => setTab('history')}
          >
            <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>History</Text>
          </TouchableOpacity>
        </View>
      </View>

      {tab === 'summary' ? (
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        >
          <View style={styles.visibilityCard}>
            <View style={styles.visibilityRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.visibilityLabel}>Share inventory with investor guests</Text>
                <Text style={styles.visibilityHint}>Investor guests will see current stock levels</Text>
              </View>
              <Switch
                value={visibilityOn}
                onValueChange={toggleVisibility}
                disabled={togglingVisibility}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={styles.stripRow}>
            <View style={styles.stripCard}>
              <Text style={styles.stripValue}>{inventory.length}</Text>
              <Text style={styles.stripLabel}>Minerals Tracked</Text>
            </View>
            <View style={styles.stripCard}>
              <Text style={styles.stripValue}>{Object.keys(todayVolume).length > 0 ? '↑' : '—'}</Text>
              <Text style={styles.stripLabel}>Today's Production</Text>
            </View>
            <View style={styles.stripCard}>
              <Text style={styles.stripValue}>{totalElements}</Text>
              <Text style={styles.stripLabel}>Total Transactions</Text>
            </View>
          </View>

          {Object.keys(todayVolume).length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Today's Additions</Text>
              <View style={styles.todayCard}>
                {Object.entries(todayVolume).map(([key, vol]) => (
                  <View key={key} style={styles.todayRow}>
                    <Text style={styles.todayMineral}>{key}</Text>
                    <Text style={styles.todayVol}>+{vol.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Current Stock</Text>
          {inventory.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No inventory yet. Stock is built from approved shift logs.</Text>
            </View>
          ) : null}
          {inventory.map((item) => (
            <View key={item.id} style={styles.mineralCard}>
              <View style={styles.mineralHeader}>
                <Text style={styles.mineralName}>{item.mineralType}</Text>
                <View>
                  <Text style={styles.mineralVolume}>
                    {Number(item.totalVolume).toFixed(2)}
                    <Text style={styles.mineralUnit}> {item.unit}</Text>
                  </Text>
                </View>
              </View>
              {item.lastWorkerName ? (
                <Text style={styles.mineralMeta}>
                  Last: {item.lastWorkerName}{item.lastZone ? ` · ${item.lastZone}` : ''}
                </Text>
              ) : null}
              {item.lastUpdatedAt ? (
                <Text style={styles.mineralTime}>Updated {formatRelative(item.lastUpdatedAt)}</Text>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        >
          <Text style={styles.sectionTitle}>
            Transaction History · {totalElements} total
          </Text>
          {history.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No transactions yet.</Text>
            </View>
          ) : null}
          {history.map((tx) => (
            <View key={tx.id} style={styles.txCard}>
              <View style={styles.txHeader}>
                <Text style={styles.txMineral}>{tx.mineralType}</Text>
                <Text style={styles.txVolume}>+{Number(tx.volumeAdded).toFixed(2)} {tx.unit}</Text>
              </View>
              <Text style={styles.txMeta}>{tx.workerName} · {tx.zone}</Text>
              <Text style={styles.txMeta}>Approved by {tx.approvedBy}</Text>
              <Text style={styles.txTime}>{formatDate(tx.createdAt)}</Text>
            </View>
          ))}
          {history.length < totalElements ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingHistory}>
              {loadingHistory
                ? <ActivityIndicator size="small" color={theme.accent} />
                : <Text style={styles.loadMoreText}>Load more</Text>}
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
    header: { backgroundColor: theme.bgCard, borderBottomColor: theme.border, borderBottomWidth: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 0 },
    title: { color: theme.text, fontSize: 26, fontWeight: '800', marginBottom: 2 },
    subtitle: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 12 },
    tabRow: { flexDirection: 'row', gap: 0 },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: theme.accent },
    tabText: { color: theme.textMuted, fontSize: 14, fontWeight: '700' },
    tabTextActive: { color: theme.accent },
    container: { padding: 16, paddingBottom: 40 },
    stripRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    stripCard: { flex: 1, backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 8, borderWidth: 1, alignItems: 'center', padding: 12 },
    stripValue: { color: theme.text, fontSize: 20, fontWeight: '900', marginBottom: 2 },
    stripLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', textAlign: 'center' },
    sectionTitle: { color: theme.text, fontSize: 16, fontWeight: '800', marginBottom: 8, marginTop: 4 },
    todayCard: { backgroundColor: theme.successLight, borderColor: theme.successLight, borderRadius: 8, borderWidth: 1, marginBottom: 12, padding: 12 },
    todayRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    todayMineral: { color: theme.text, fontSize: 13, fontWeight: '700' },
    todayVol: { color: theme.success, fontSize: 13, fontWeight: '900' },
    emptyCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 16 },
    emptyText: { color: theme.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    mineralCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, marginBottom: 10, padding: 14 },
    mineralHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    mineralName: { color: theme.text, fontSize: 16, fontWeight: '900', flex: 1 },
    mineralVolume: { color: theme.accent, fontSize: 20, fontWeight: '900', textAlign: 'right' },
    mineralUnit: { color: theme.textSub, fontSize: 13, fontWeight: '700' },
    mineralMeta: { color: theme.textSub, fontSize: 12, fontWeight: '700', marginBottom: 2 },
    mineralTime: { color: theme.textMuted, fontSize: 11, fontWeight: '700', marginTop: 2 },
    txCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 8, borderWidth: 1, marginBottom: 8, padding: 12 },
    txHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    txMineral: { color: theme.text, fontSize: 14, fontWeight: '900' },
    txVolume: { color: theme.success, fontSize: 14, fontWeight: '900' },
    txMeta: { color: theme.textSub, fontSize: 12, fontWeight: '700', marginBottom: 1 },
    txTime: { color: theme.textMuted, fontSize: 11, fontWeight: '700', marginTop: 3 },
    loadMoreBtn: { alignItems: 'center', padding: 14, backgroundColor: theme.bgCard, borderRadius: 8, borderWidth: 1, borderColor: theme.border, marginTop: 4 },
    loadMoreText: { color: theme.accent, fontSize: 14, fontWeight: '800' },
    visibilityCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, marginBottom: 14, padding: 14 },
    visibilityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    visibilityLabel: { color: theme.text, fontSize: 14, fontWeight: '800', marginBottom: 2 },
    visibilityHint: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
  });
}
