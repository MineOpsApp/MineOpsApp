import { useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMyOffers, withdrawOffer, type MarketplaceOffer } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#d29922',
  COUNTERED: '#1d5f99',
  ACCEPTED: '#1f6f5b',
  REJECTED: '#dc2626',
  WITHDRAWN: '#8fa3b8',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  COUNTERED: 'Countered by seller',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

export function BuyerOffersScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [offers, setOffers] = useState<MarketplaceOffer[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<number | null>(null);

  function load() {
    return getMyOffers().then(setOffers).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleWithdraw(offer: MarketplaceOffer) {
    Alert.alert(
      'Withdraw offer?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            setActing(offer.id);
            try {
              const updated = await withdrawOffer(offer.id);
              setOffers((prev) => prev.map((o) => (o.id === offer.id ? updated : o)));
            } catch {
              Alert.alert('Failed', 'Could not withdraw offer.');
            } finally {
              setActing(null);
            }
          },
        },
      ]
    );
  }

  function formatDate(s: string | null) {
    if (!s) return '';
    try { return new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return s; }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>My Offers</Text>
      <Text style={styles.subtitle}>Pull to refresh</Text>

      {offers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🤝</Text>
          <Text style={styles.emptyTitle}>No offers yet</Text>
          <Text style={styles.emptySub}>Browse listings and submit an offer to get started</Text>
        </View>
      ) : (
        offers.map((offer) => {
          const color = STATUS_COLORS[offer.status] ?? theme.textMuted;
          const isCounter = offer.parentOfferId != null;
          return (
            <View key={offer.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listingRef}>Listing #{offer.listingId}</Text>
                  {isCounter ? (
                    <View style={styles.counterBadge}><Text style={styles.counterBadgeText}>Counter-offer from seller</Text></View>
                  ) : null}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: color + '20', borderColor: color }]}>
                  <Text style={[styles.statusText, { color }]}>{STATUS_LABELS[offer.status] ?? offer.status}</Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Price</Text>
                  <Text style={styles.value}>GHS {Number(offer.offerPrice).toLocaleString()}</Text>
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Quantity</Text>
                  <Text style={styles.value}>{Number(offer.offerQuantity).toLocaleString()}</Text>
                </View>
              </View>

              {offer.message ? <Text style={styles.message}>"{offer.message}"</Text> : null}
              <Text style={styles.date}>{isCounter ? 'Counter received' : 'Submitted'} {formatDate(offer.createdAt)}</Text>
              {offer.respondedAt && offer.status !== 'WITHDRAWN' ? (
                <Text style={styles.date}>Responded {formatDate(offer.respondedAt)}</Text>
              ) : null}

              {offer.status === 'PENDING' && !isCounter ? (
                <Pressable
                  onPress={() => handleWithdraw(offer)}
                  disabled={acting === offer.id}
                  style={[styles.withdrawBtn, acting === offer.id && styles.btnDisabled]}
                >
                  <Text style={styles.withdrawBtnText}>{acting === offer.id ? '…' : 'Withdraw'}</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 40, backgroundColor: theme.bg },
    title: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 2 },
    subtitle: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 16 },
    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 40 },
    emptyIcon: { fontSize: 32, marginBottom: 10 },
    emptyTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
    emptySub: { color: theme.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 12, padding: 14 },
    cardHeader: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: 12 },
    listingRef: { color: theme.text, fontSize: 14, fontWeight: '900', marginBottom: 4 },
    counterBadge: { backgroundColor: theme.infoLight, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
    counterBadgeText: { color: theme.info, fontSize: 10, fontWeight: '800' },
    statusBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
    statusText: { fontSize: 11, fontWeight: '800' },
    row: { flexDirection: 'row', gap: 16, marginBottom: 8 },
    col: { flex: 1 },
    label: { color: theme.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 2, textTransform: 'uppercase' },
    value: { color: theme.text, fontSize: 14, fontWeight: '800' },
    message: { color: theme.textSub, fontSize: 12, fontStyle: 'italic', marginBottom: 6 },
    date: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 2 },
    withdrawBtn: { alignItems: 'center', backgroundColor: theme.dangerLight, borderColor: theme.danger, borderRadius: 8, borderWidth: 1, marginTop: 10, paddingVertical: 8 },
    withdrawBtnText: { color: theme.danger, fontSize: 13, fontWeight: '800' },
    btnDisabled: { opacity: 0.5 },
  });
}
