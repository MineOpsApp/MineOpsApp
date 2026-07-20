import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { getMines, getVerifiedBuyers, type MineProfile, type BuyerProfile } from '../../services/api';
import { useTheme, spacing, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Tab = 'mines' | 'buyers';

export default function DirectoryScreen() {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

  const [tab, setTab] = useState<Tab>('mines');
  const [mines, setMines] = useState<MineProfile[]>([]);
  const [buyers, setBuyers] = useState<BuyerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const [minesData, buyersData] = await Promise.all([getMines(), getVerifiedBuyers()]);
      setMines(minesData);
      setBuyers(buyersData);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load directory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredMines = mines.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.mineralsProduced.toLowerCase().includes(search.toLowerCase())
  );
  const filteredBuyers = buyers.filter(b =>
    b.fullName.toLowerCase().includes(search.toLowerCase()) ||
    b.companyName.toLowerCase().includes(search.toLowerCase())
  );

  function scoreColor(score: number) {
    if (score >= 80) return '#22c55e';
    if (score >= 50) return theme.accent;
    return '#ef4444';
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'mines' && styles.activeTab]}
          onPress={() => setTab('mines')}
        >
          <Text style={[styles.tabText, tab === 'mines' && styles.activeTabText]}>Mine Sites</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'buyers' && styles.activeTab]}
          onPress={() => setTab('buyers')}
        >
          <Text style={[styles.tabText, tab === 'buyers' && styles.activeTabText]}>Verified Buyers</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search..."
        placeholderTextColor={theme.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      {tab === 'mines' ? (
        <FlatList
          data={filteredMines}
          keyExtractor={item => item.name}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
          ListEmptyComponent={<Text style={styles.empty}>No mine sites found.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <View style={[styles.scoreBadge, { backgroundColor: scoreColor(item.safetyScore) }]}>
                  <Text style={styles.scoreText}>Safety {item.safetyScore}</Text>
                </View>
              </View>
              {item.mineralsProduced ? (
                <Text style={styles.cardMeta}>Minerals: {item.mineralsProduced}</Text>
              ) : null}
              {item.productionCapacity ? (
                <Text style={styles.cardMeta}>Capacity: {item.productionCapacity}</Text>
              ) : null}
              {item.establishedYear > 0 ? (
                <Text style={styles.cardMeta}>Est. {item.establishedYear}</Text>
              ) : null}
              {item.profileDescription ? (
                <Text style={styles.cardDesc}>{item.profileDescription}</Text>
              ) : null}
              {item.contactEmail ? (
                <Text style={styles.cardContact}>{item.contactEmail}</Text>
              ) : null}
            </View>
          )}
        />
      ) : (
        <FlatList
          data={filteredBuyers}
          keyExtractor={item => item.email}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
          ListEmptyComponent={<Text style={styles.empty}>No verified buyers found.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.fullName}</Text>
              {item.companyName ? <Text style={styles.cardMeta}>{item.companyName}</Text> : null}
              <Text style={styles.cardContact}>{item.email}</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
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
    container: { flex: 1, backgroundColor: theme.bg },
    center: { flex: 1, alignItems: 'center', backgroundColor: theme.bg, justifyContent: 'center' },
    tabs: { backgroundColor: theme.bgCard, flexDirection: 'row' },
    tab: { alignItems: 'center', flex: 1, padding: 14 },
    activeTab: { borderBottomColor: theme.accent, borderBottomWidth: 2 },
    tabText: { color: theme.textSub, fontWeight: '600' },
    activeTabText: { color: theme.accent },
    search: { backgroundColor: theme.bgInput, borderRadius: 8, color: theme.text, fontSize: 14, margin: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 10 },
    error: { color: theme.danger, margin: spacing.md, textAlign: 'center' },
    empty: { color: theme.textMuted, marginTop: 40, textAlign: 'center' },
    card: { backgroundColor: theme.bgCard, borderRadius: 10, margin: spacing.sm, marginHorizontal: spacing.md, padding: 14, ...cardShadow },
    cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    cardTitle: { color: theme.text, flex: 1, fontSize: 16, fontWeight: '700' },
    cardMeta: { color: theme.textSub, fontSize: 13, marginTop: 2 },
    cardDesc: { color: theme.textSub, fontSize: 13, marginTop: 6 },
    cardContact: { color: '#60a5fa', fontSize: 12, marginTop: 4 },
    scoreBadge: { borderRadius: 12, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    scoreText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    verifiedBadge: { alignSelf: 'flex-start', backgroundColor: '#22c55e', borderRadius: 10, marginTop: 6, paddingHorizontal: spacing.sm, paddingVertical: 2 },
    verifiedText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  });
}
