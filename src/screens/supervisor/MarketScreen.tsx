import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMarketPrices } from '../../services/api';
import type { AuthSession } from '../../types/auth';

type CommodityPrice = {
  name: string;
  symbol: string;
  unit: string;
  price: number | null;
  change: number | null;
  available: boolean;
  note?: string;
  error?: string;
};

type Props = { session: AuthSession };

const COMMODITY_ICONS: Record<string, string> = {
  Gold: '🥇',
  Silver: '🥈',
  Copper: '🔶',
  Platinum: '⬜',
  Palladium: '🔷',
  'Crude Oil': '🛢',
  'Natural Gas': '🔥',
};

export function MarketScreen({ session: _ }: Props) {
  const [prices, setPrices] = useState<CommodityPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState(false);

  function load() {
    return getMarketPrices()
      .then((data) => {
        setPrices(data);
        setLastUpdated(new Date().toLocaleTimeString());
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
  }

  function formatPrice(price: number | null, symbol: string) {
    if (price === null) return '—';
    if (['XAU', 'XAG', 'XPT', 'XPD'].includes(symbol)) {
      return `$${price.toFixed(2)}`;
    }
    return `$${price.toFixed(2)}`;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1f6f5b" />}
    >
      {/* Header */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Market Prices</Text>
          {lastUpdated ? <Text style={styles.lastUpdated}>Updated {lastUpdated} · pull to refresh</Text> : null}
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>Fetching live prices...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠</Text>
          <Text style={styles.errorTitle}>Could not load prices</Text>
          <Text style={styles.errorSub}>Pull down to retry</Text>
        </View>
      ) : (
        <>
          {/* Highlight gold */}
          {prices.filter((p) => p.name === 'Gold').map((p) => (
            <View key={p.symbol} style={styles.highlightCard}>
              <View style={styles.highlightLeft}>
                <Text style={styles.highlightIcon}>{COMMODITY_ICONS[p.name] ?? '💰'}</Text>
                <View>
                  <Text style={styles.highlightName}>{p.name}</Text>
                  <Text style={styles.highlightUnit}>per {p.unit}</Text>
                </View>
              </View>
              <View style={styles.highlightRight}>
                <Text style={styles.highlightPrice}>{formatPrice(p.price, p.symbol)}</Text>
                {p.change !== null ? (
                  <Text style={[styles.highlightChange, { color: p.change >= 0 ? '#15803d' : '#b42318' }]}>
                    {p.change >= 0 ? '▲' : '▼'} {Math.abs(p.change).toFixed(2)}%
                  </Text>
                ) : null}
              </View>
            </View>
          ))}

          {/* Other commodities */}
          <Text style={styles.sectionLabel}>COMMODITIES</Text>
          <View style={styles.priceList}>
            {prices.filter((p) => p.name !== 'Gold').map((p, i) => (
              <View key={p.symbol} style={[styles.priceRow, i < prices.length - 2 && styles.priceRowBorder]}>
                <Text style={styles.priceIcon}>{COMMODITY_ICONS[p.name] ?? '💰'}</Text>
                <View style={styles.priceLeft}>
                  <Text style={styles.priceName}>{p.name}</Text>
                  <Text style={styles.priceUnit}>{p.symbol} · per {p.unit}</Text>
                </View>
                <View style={styles.priceRight}>
                  {!p.available ? (
                    <Text style={styles.priceUnavailable}>Free tier rotation</Text>
                        ) : (
                    <>
                      <Text style={styles.priceValue}>{formatPrice(p.price, p.symbol)}</Text>
                      {p.change !== null ? (
                        <Text style={[styles.priceChange, { color: p.change >= 0 ? '#15803d' : '#b42318' }]}>
                          {p.change >= 0 ? '▲' : '▼'} {Math.abs(p.change).toFixed(2)}%
                        </Text>
                      ) : null}
                    </>
                  )}
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.disclaimer}>Prices are indicative. Data provided by API Ninjas.</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  pageHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  pageTitle: { color: '#17212b', fontSize: 22, fontWeight: '900' },
  lastUpdated: { color: '#8fa3b8', fontSize: 11, fontWeight: '600', marginTop: 3 },
  liveBadge: { alignItems: 'center', backgroundColor: '#e7f6ef', borderRadius: 20, flexDirection: 'row', gap: 5, paddingHorizontal: 10, paddingVertical: 5 },
  liveDot: { backgroundColor: '#16a34a', borderRadius: 4, height: 7, width: 7 },
  liveText: { color: '#15803d', fontSize: 12, fontWeight: '800' },
  loadingCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, padding: 24, alignItems: 'center' },
  loadingText: { color: '#8fa3b8', fontSize: 14, fontWeight: '600' },
  errorCard: { alignItems: 'center', backgroundColor: '#fff5f5', borderColor: '#f5c6c6', borderRadius: 12, borderWidth: 1, padding: 32 },
  errorIcon: { color: '#b42318', fontSize: 28, marginBottom: 10 },
  errorTitle: { color: '#b42318', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  errorSub: { color: '#8fa3b8', fontSize: 13, fontWeight: '600' },
  highlightCard: { alignItems: 'center', backgroundColor: '#17212b', borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, padding: 20 },
  highlightLeft: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  highlightIcon: { fontSize: 32 },
  highlightName: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  highlightUnit: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  highlightRight: { alignItems: 'flex-end' },
  highlightPrice: { color: '#4ade80', fontSize: 24, fontWeight: '900' },
  highlightChange: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  sectionLabel: { color: '#8fa3b8', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  priceList: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  priceRow: { alignItems: 'center', flexDirection: 'row', padding: 14 },
  priceRowBorder: { borderBottomColor: '#f4f6f8', borderBottomWidth: 1 },
  priceIcon: { fontSize: 20, marginRight: 12 },
  priceLeft: { flex: 1 },
  priceName: { color: '#17212b', fontSize: 14, fontWeight: '800' },
  priceUnit: { color: '#8fa3b8', fontSize: 11, fontWeight: '600', marginTop: 1 },
  priceRight: { alignItems: 'flex-end' },
  priceValue: { color: '#17212b', fontSize: 15, fontWeight: '900' },
  priceChange: { fontSize: 11, fontWeight: '800', marginTop: 2 },
  priceUnavailable: { color: '#8fa3b8', fontSize: 12, fontWeight: '600' },
  disclaimer: { color: '#8fa3b8', fontSize: 11, fontWeight: '600', textAlign: 'center' },
});