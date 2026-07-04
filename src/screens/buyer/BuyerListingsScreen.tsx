import { useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getMarketplaceListings, type MineralListing } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { BuyerListingDetailScreen } from './BuyerListingDetailScreen';

type Props = { session: AuthSession };

export function BuyerListingsScreen({ session }: Props) {
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
        <Text style={styles.gateIcon}>⏳</Text>
        <Text style={styles.gateTitle}>Verification Pending</Text>
        <Text style={styles.gateSub}>A supervisor is reviewing your account. You'll be able to browse listings once verified.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>Mineral Marketplace</Text>
      <Text style={styles.subtitle}>Active listings across all sites</Text>

      <TextInput
        style={styles.search}
        value={filter}
        onChangeText={setFilter}
        placeholder="Filter by mineral type…"
        placeholderTextColor="#8fa3b8"
      />

      {loading ? (
        <Text style={styles.loading}>Loading listings…</Text>
      ) : visible.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>No active listings</Text>
          <Text style={styles.emptySub}>Check back later for new mineral listings</Text>
        </View>
      ) : (
        visible.map((listing) => (
          <Pressable key={listing.id} style={styles.card} onPress={() => setSelected(listing)}>
            <View style={styles.cardTop}>
              {listing.photoData ? (
                <Image source={{ uri: listing.photoData }} style={styles.thumb} />
              ) : (
                <View style={styles.thumbPlaceholder}><Text style={{ fontSize: 24 }}>⛏</Text></View>
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
            {listing.location ? <Text style={styles.location}>📍 {listing.location}</Text> : null}
            <Text style={styles.viewLink}>View details →</Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f0f2f5' },
  title: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 2 },
  subtitle: { color: '#8fa3b8', fontSize: 11, fontWeight: '600', marginBottom: 16 },
  search: { backgroundColor: '#fff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, color: '#17212b', fontSize: 14, marginBottom: 16, paddingHorizontal: 14, paddingVertical: 10 },
  loading: { color: '#8fa3b8', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 40 },
  emptyCard: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, padding: 40 },
  emptyIcon: { fontSize: 32, marginBottom: 10 },
  emptyTitle: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  emptySub: { color: '#8fa3b8', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 12, padding: 14 },
  cardTop: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: 8 },
  thumb: { borderRadius: 8, height: 60, marginRight: 12, width: 60 },
  thumbPlaceholder: { alignItems: 'center', backgroundColor: '#f0f2f5', borderRadius: 8, height: 60, justifyContent: 'center', marginRight: 12, width: 60 },
  cardInfo: { flex: 1 },
  mineral: { color: '#17212b', fontSize: 16, fontWeight: '900', marginBottom: 2 },
  site: { color: '#1f6f5b', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  qty: { color: '#5d6875', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  grade: { color: '#8fa3b8', fontSize: 11, fontWeight: '600' },
  priceBlock: { alignItems: 'flex-end' },
  price: { color: '#17212b', fontSize: 15, fontWeight: '900' },
  priceLabel: { color: '#8fa3b8', fontSize: 10, fontWeight: '600' },
  location: { color: '#8fa3b8', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  viewLink: { color: '#1f6f5b', fontSize: 13, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#f0f2f5' },
  gateIcon: { fontSize: 40, marginBottom: 16 },
  gateTitle: { color: '#17212b', fontSize: 20, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  gateSub: { color: '#5d6875', fontSize: 14, fontWeight: '600', lineHeight: 22, textAlign: 'center' },
});
