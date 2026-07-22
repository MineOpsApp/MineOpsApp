import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { getMarketplaceListings, type MineralListing } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, typography, spacing, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';
import { BuyerListingDetailScreen } from './BuyerListingDetailScreen';

type Props = { session: AuthSession };

export function BuyerListingsScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

  const [listings, setListings] = useState<MineralListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<MineralListing | null>(null);
  const [notVerified, setNotVerified] = useState(false);

  function load() {
    return getMarketplaceListings()
      .then(setListings)
      .catch((e: any) => {
        if (e?.message?.includes('403')) setNotVerified(true);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (selected) {
    return (
      <BuyerListingDetailScreen
        session={session}
        listing={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  const visible = filter.trim()
    ? listings.filter((l) => l.mineralType.toLowerCase().includes(filter.toLowerCase()))
    : listings;

  if (notVerified) {
    return (
      <View style={styles.center}>
        <Ionicons name="hourglass-outline" size={40} color={theme.textMuted} style={{ marginBottom: 16 }} />
        <Text style={styles.gateTitle}>Verification Pending</Text>
        <Text style={styles.gateSub}>A supervisor is reviewing your account. You'll be able to browse listings once verified.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={visible}
      keyExtractor={(listing) => String(listing.id)}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListHeaderComponent={
        <>
          <Text style={styles.title}>Mineral Marketplace</Text>
          <Text style={styles.subtitle}>Active listings across all sites</Text>

          <TextInput
            style={styles.search}
            value={filter}
            onChangeText={setFilter}
            placeholder="Filter by mineral type…"
            placeholderTextColor={theme.textMuted}
          />

          {loading ? <Text style={styles.loading}>Loading listings…</Text> : null}
        </>
      }
      ListEmptyComponent={
        loading ? null : (
          <View style={styles.emptyCard}>
            <Ionicons name="cart-outline" size={32} color={theme.textMuted} style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>No active listings</Text>
            <Text style={styles.emptySub}>Check back later for new mineral listings</Text>
          </View>
        )
      }
      renderItem={({ item: listing }) => (
        <Pressable style={styles.card} onPress={() => setSelected(listing)}>
          <View style={styles.cardTop}>
            {listing.photoData ? (
              <Image source={{ uri: listing.photoData }} style={styles.thumb} />
            ) : (
              <View style={styles.thumbPlaceholder}><Ionicons name="hammer-outline" size={24} color={theme.textMuted} /></View>
            )}
            <View style={styles.cardInfo}>
              <Text style={styles.mineral}>{listing.mineralType}</Text>
              <Text style={styles.site}>{listing.site}</Text>
              <Text style={styles.qty}>{listing.quantity} {listing.unit}</Text>
              {listing.grade ? <Text style={styles.grade}>Grade: {listing.grade}</Text> : null}
            </View>
            <View style={styles.priceBlock}>
              <Text style={styles.price}>GHS {Number(listing.askingPrice).toLocaleString()}</Text>
              <Text style={styles.priceLabel}>asking</Text>
            </View>
          </View>
          {listing.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={theme.textMuted} />
              <Text style={styles.location}>{listing.location}</Text>
            </View>
          ) : null}
          <Text style={styles.viewLink}>View details →</Text>
        </Pressable>
      )}
    />
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
    search: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, color: theme.text, fontSize: 14, marginBottom: spacing.lg, paddingHorizontal: 14, paddingVertical: 10 },
    loading: { color: theme.textMuted, fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 40 },
    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 40, ...cardShadow },
    emptyTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
    emptySub: { color: theme.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.md, padding: 14, ...cardShadow },
    cardTop: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: spacing.sm },
    thumb: { borderRadius: 8, height: 60, marginRight: spacing.md, width: 60 },
    thumbPlaceholder: { alignItems: 'center', backgroundColor: theme.bg, borderRadius: 8, height: 60, justifyContent: 'center', marginRight: spacing.md, width: 60 },
    cardInfo: { flex: 1 },
    mineral: { color: theme.text, fontSize: 16, fontWeight: '900', marginBottom: 2 },
    site: { color: theme.accent, fontSize: 12, fontWeight: '700', marginBottom: 2 },
    qty: { color: theme.textSub, fontSize: 13, fontWeight: '700', marginBottom: 2 },
    grade: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
    priceBlock: { alignItems: 'flex-end' },
    price: { color: theme.text, fontSize: 15, fontWeight: '900' },
    priceLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '600' },
    locationRow: { alignItems: 'center', flexDirection: 'row', gap: 4, marginBottom: spacing.sm },
    location: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
    viewLink: { color: theme.accent, fontSize: 13, fontWeight: '800' },
    center: { flex: 1, alignItems: 'center', backgroundColor: theme.bg, justifyContent: 'center', padding: 32 },
    gateTitle: { color: theme.text, fontSize: 20, fontWeight: '900', marginBottom: spacing.sm, textAlign: 'center' },
    gateSub: { color: theme.textSub, fontSize: 14, fontWeight: '600', lineHeight: 22, textAlign: 'center' },
  });
}
