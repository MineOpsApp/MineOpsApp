import { useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  getMarketplaceListings,
  getListingOffers,
  acceptOffer,
  rejectOffer,
  counterOffer,
  type MineralListing,
  type MarketplaceOffer,
} from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

type ListingWithOffers = { listing: MineralListing; offers: MarketplaceOffer[] };

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#d29922',
  COUNTERED: '#1d5f99',
  ACCEPTED: '#1f6f5b',
  REJECTED: '#dc2626',
  WITHDRAWN: '#8fa3b8',
};

export function SupervisorOffersScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [data, setData] = useState<ListingWithOffers[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<number | null>(null);
  const [counteringId, setCounteringId] = useState<number | null>(null);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterQty, setCounterQty] = useState('');
  const [counterMsg, setCounterMsg] = useState('');
  const [submittingCounter, setSubmittingCounter] = useState(false);

  async function load() {
    try {
      const listings = await getMarketplaceListings();
      const withOffers = await Promise.all(
        listings.map(async (listing) => {
          const offers = await getListingOffers(listing.id).catch(() => []);
          return { listing, offers };
        })
      );
      setData(withOffers.filter((lwo) => lwo.offers.length > 0));
    } catch {}
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleAccept(offer: MarketplaceOffer) {
    Alert.alert('Accept offer?', `GHS ${Number(offer.offerPrice).toLocaleString()} for ${Number(offer.offerQuantity).toLocaleString()} units. This will mark the listing SOLD.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          setActing(offer.id);
          try {
            await acceptOffer(offer.id);
            await load();
          } catch {
            Alert.alert('Failed', 'Could not accept offer.');
          } finally {
            setActing(null);
          }
        },
      },
    ]);
  }

  async function handleReject(offer: MarketplaceOffer) {
    Alert.alert('Reject offer?', `${offer.buyerName}'s offer will be marked rejected.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setActing(offer.id);
          try {
            await rejectOffer(offer.id);
            await load();
          } catch {
            Alert.alert('Failed', 'Could not reject offer.');
          } finally {
            setActing(null);
          }
        },
      },
    ]);
  }

  async function handleCounter(offer: MarketplaceOffer) {
    const price = parseFloat(counterPrice);
    const qty = parseFloat(counterQty);
    if (!price || price <= 0) { Alert.alert('Required', 'Enter a counter price.'); return; }
    if (!qty || qty <= 0) { Alert.alert('Required', 'Enter a counter quantity.'); return; }
    setSubmittingCounter(true);
    try {
      await counterOffer(offer.id, { offerPrice: price, offerQuantity: qty, message: counterMsg.trim() || null });
      setCounteringId(null);
      setCounterPrice(''); setCounterQty(''); setCounterMsg('');
      await load();
    } catch {
      Alert.alert('Failed', 'Could not send counter-offer.');
    } finally {
      setSubmittingCounter(false);
    }
  }

  function formatDate(s: string | null) {
    if (!s) return '';
    try { return new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return s ?? ''; }
  }

  const allPending = data.flatMap((lwo) => lwo.offers.filter((o) => o.status === 'PENDING')).length;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>Incoming Offers</Text>
      <Text style={styles.subtitle}>Pull to refresh</Text>

      {allPending > 0 ? (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>{allPending} offer{allPending !== 1 ? 's' : ''} awaiting your response</Text>
        </View>
      ) : null}

      {data.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="pricetag-outline" size={32} color={styles.emptyIcon.color} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No offers yet</Text>
          <Text style={styles.emptySub}>Buyer offers on your listings will appear here</Text>
        </View>
      ) : (
        data.map(({ listing, offers }) => (
          <View key={listing.id} style={styles.section}>
            <Text style={styles.listingHeader}>{listing.mineralType} — {Number(listing.quantity).toLocaleString()} {listing.unit}</Text>
            {offers.map((offer) => {
              const color = STATUS_COLORS[offer.status] ?? '#8fa3b8';
              const isPending = offer.status === 'PENDING';
              const isCountering = counteringId === offer.id;
              return (
                <View key={offer.id} style={styles.offerCard}>
                  <View style={styles.offerHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.buyerName}>{offer.buyerName}</Text>
                      <Text style={styles.buyerEmail}>{offer.buyerEmail}</Text>
                    </View>
                    <View style={[styles.statusBadge, { borderColor: color, backgroundColor: color + '20' }]}>
                      <Text style={[styles.statusText, { color }]}>{offer.status}</Text>
                    </View>
                  </View>
                  <View style={styles.row}>
                    <View style={styles.col}><Text style={styles.label}>Price</Text><Text style={styles.value}>GHS {Number(offer.offerPrice).toLocaleString()}</Text></View>
                    <View style={styles.col}><Text style={styles.label}>Quantity</Text><Text style={styles.value}>{Number(offer.offerQuantity).toLocaleString()}</Text></View>
                  </View>
                  {offer.message ? <Text style={styles.message}>"{offer.message}"</Text> : null}
                  <Text style={styles.date}>{formatDate(offer.createdAt)}</Text>

                  {isPending ? (
                    isCountering ? (
                      <View style={styles.counterForm}>
                        <Text style={styles.counterTitle}>Counter-offer</Text>
                        <TextInput style={styles.counterInput} value={counterPrice} onChangeText={setCounterPrice} placeholder="Counter price (GHS)" placeholderTextColor={theme.textMuted} keyboardType="decimal-pad" />
                        <TextInput style={styles.counterInput} value={counterQty} onChangeText={setCounterQty} placeholder="Counter quantity" placeholderTextColor={theme.textMuted} keyboardType="decimal-pad" />
                        <TextInput style={styles.counterInput} value={counterMsg} onChangeText={setCounterMsg} placeholder="Message (optional)" placeholderTextColor={theme.textMuted} />
                        <View style={styles.counterActions}>
                          <Pressable onPress={() => { setCounteringId(null); setCounterPrice(''); setCounterQty(''); setCounterMsg(''); }} style={styles.cancelBtn}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                          </Pressable>
                          <Pressable onPress={() => handleCounter(offer)} disabled={submittingCounter} style={[styles.sendCounterBtn, submittingCounter && styles.btnDisabled]}>
                            <Text style={styles.sendCounterBtnText}>{submittingCounter ? '…' : 'Send Counter'}</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.actions}>
                        <Pressable onPress={() => handleAccept(offer)} disabled={acting === offer.id} style={[styles.acceptBtn, acting === offer.id && styles.btnDisabled]}>
                          <Text style={styles.acceptBtnText}>{acting === offer.id ? '…' : 'Accept'}</Text>
                        </Pressable>
                        <Pressable onPress={() => { setCounteringId(offer.id); setCounterPrice(String(offer.offerPrice)); setCounterQty(String(offer.offerQuantity)); }} disabled={acting === offer.id} style={[styles.counterBtn, acting === offer.id && styles.btnDisabled]}>
                          <Text style={styles.counterBtnText}>Counter</Text>
                        </Pressable>
                        <Pressable onPress={() => handleReject(offer)} disabled={acting === offer.id} style={[styles.rejectBtn, acting === offer.id && styles.btnDisabled]}>
                          <Text style={styles.rejectBtnText}>{acting === offer.id ? '…' : 'Reject'}</Text>
                        </Pressable>
                      </View>
                    )
                  ) : null}
                </View>
              );
            })}
          </View>
        ))
      )}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 40, backgroundColor: theme.bg },
    title: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 2 },
    subtitle: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 16 },
    infoBox: { backgroundColor: theme.amberLight, borderColor: theme.amber, borderRadius: 8, borderWidth: 1, marginBottom: 14, padding: 12 },
    infoText: { color: theme.amber, fontSize: 13, fontWeight: '700' },
    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 40 },
    emptyIcon: { color: theme.textMuted, fontSize: 32, marginBottom: 10 },
    emptyTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
    emptySub: { color: theme.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    section: { marginBottom: 16 },
    listingHeader: { color: theme.text, fontSize: 14, fontWeight: '900', marginBottom: 8 },
    offerCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 8, padding: 14 },
    offerHeader: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: 10 },
    buyerName: { color: theme.text, fontSize: 14, fontWeight: '900', marginBottom: 1 },
    buyerEmail: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
    statusBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
    statusText: { fontSize: 10, fontWeight: '800' },
    row: { flexDirection: 'row', gap: 16, marginBottom: 8 },
    col: { flex: 1 },
    label: { color: theme.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 2, textTransform: 'uppercase' },
    value: { color: theme.text, fontSize: 14, fontWeight: '800' },
    message: { color: theme.textSub, fontSize: 12, fontStyle: 'italic', marginBottom: 6 },
    date: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 10 },
    actions: { flexDirection: 'row', gap: 8 },
    acceptBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 8, flex: 1, paddingVertical: 9 },
    acceptBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    counterBtn: { alignItems: 'center', backgroundColor: theme.infoLight, borderColor: theme.info, borderRadius: 8, borderWidth: 1, flex: 1, paddingVertical: 9 },
    counterBtnText: { color: theme.info, fontSize: 13, fontWeight: '800' },
    rejectBtn: { alignItems: 'center', backgroundColor: theme.dangerLight, borderColor: theme.danger, borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
    rejectBtnText: { color: theme.danger, fontSize: 13, fontWeight: '800' },
    btnDisabled: { opacity: 0.5 },
    counterForm: { borderColor: theme.border, borderRadius: 8, borderTopWidth: 1, marginTop: 10, paddingTop: 12 },
    counterTitle: { color: theme.text, fontSize: 13, fontWeight: '900', marginBottom: 10 },
    counterInput: { backgroundColor: theme.bg, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8 },
    counterActions: { flexDirection: 'row', gap: 8 },
    cancelBtn: { alignItems: 'center', backgroundColor: theme.bgInput, borderRadius: 8, flex: 1, paddingVertical: 9 },
    cancelBtnText: { color: theme.textSub, fontSize: 13, fontWeight: '800' },
    sendCounterBtn: { alignItems: 'center', backgroundColor: theme.info, borderRadius: 8, flex: 1, paddingVertical: 9 },
    sendCounterBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  });
}
