import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { getMarketplaceListings, createListing, withdrawListing, type MineralListing } from '../../services/api';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

const UNITS = ['tonnes', 'kg', 'oz', 'carats', 'barrels'];

export function SupervisorListingsScreen({ session: _ }: Props) {
  const [listings, setListings] = useState<MineralListing[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [acting, setActing] = useState<number | null>(null);

  // form state
  const [mineralType, setMineralType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('tonnes');
  const [grade, setGrade] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [location, setLocation] = useState('');
  const [minOrderQty, setMinOrderQty] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    return getMarketplaceListings().then(setListings).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleCreate() {
    if (!mineralType.trim()) { Alert.alert('Required', 'Enter mineral type.'); return; }
    if (!quantity || isNaN(parseFloat(quantity))) { Alert.alert('Required', 'Enter a valid quantity.'); return; }
    if (!askingPrice || isNaN(parseFloat(askingPrice))) { Alert.alert('Required', 'Enter a valid asking price.'); return; }
    setSubmitting(true);
    try {
      const listing = await createListing({
        mineralType: mineralType.trim(),
        quantity: parseFloat(quantity),
        unit,
        grade: grade.trim() || null,
        askingPrice: parseFloat(askingPrice),
        location: location.trim() || null,
        minOrderQuantity: minOrderQty ? parseFloat(minOrderQty) : null,
        photoData: photo,
      });
      setListings((prev) => [listing, ...prev]);
      setCreating(false);
      setMineralType(''); setQuantity(''); setGrade(''); setAskingPrice(''); setLocation(''); setMinOrderQty(''); setPhoto(null);
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Could not create listing.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdraw(listing: MineralListing) {
    Alert.alert('Withdraw listing?', `${listing.mineralType} will no longer be visible to buyers.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          setActing(listing.id);
          try {
            const updated = await withdrawListing(listing.id);
            setListings((prev) => prev.map((l) => (l.id === listing.id ? updated : l)));
          } catch {
            Alert.alert('Failed', 'Could not withdraw listing.');
          } finally {
            setActing(null);
          }
        },
      },
    ]);
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required', 'Allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });
    if (!result.canceled && result.assets[0].base64) {
      setPhoto('data:image/jpeg;base64,' + result.assets[0].base64);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View style={styles.titleRow}>
        <Text style={styles.title}>Mineral Listings</Text>
        <Pressable onPress={() => setCreating((v) => !v)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>{creating ? '✕ Cancel' : '+ New Listing'}</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>Your site's listings</Text>

      {creating ? (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>New Listing</Text>

          <Text style={styles.label}>Mineral Type *</Text>
          <TextInput style={styles.input} value={mineralType} onChangeText={setMineralType} placeholder="e.g. Gold, Bauxite" placeholderTextColor="#8fa3b8" />

          <Text style={styles.label}>Quantity *</Text>
          <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} placeholder="e.g. 500" placeholderTextColor="#8fa3b8" keyboardType="decimal-pad" />

          <Text style={styles.label}>Unit</Text>
          <View style={styles.unitRow}>
            {UNITS.map((u) => (
              <Pressable key={u} onPress={() => setUnit(u)} style={[styles.unitPill, unit === u && styles.unitPillActive]}>
                <Text style={[styles.unitPillText, unit === u && styles.unitPillTextActive]}>{u}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Asking Price (GHS) *</Text>
          <TextInput style={styles.input} value={askingPrice} onChangeText={setAskingPrice} placeholder="e.g. 250000" placeholderTextColor="#8fa3b8" keyboardType="decimal-pad" />

          <Text style={styles.label}>Grade</Text>
          <TextInput style={styles.input} value={grade} onChangeText={setGrade} placeholder="e.g. 22 carat" placeholderTextColor="#8fa3b8" />

          <Text style={styles.label}>Location</Text>
          <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="e.g. Northern Zone, Block 3" placeholderTextColor="#8fa3b8" />

          <Text style={styles.label}>Min. Order Quantity</Text>
          <TextInput style={styles.input} value={minOrderQty} onChangeText={setMinOrderQty} placeholder="Optional" placeholderTextColor="#8fa3b8" keyboardType="decimal-pad" />

          <Text style={styles.label}>Photo</Text>
          <Pressable onPress={pickPhoto} style={[styles.photoBtn, photo ? styles.photoBtnDone : null]}>
            {photo ? <Image source={{ uri: photo }} style={styles.photoThumb} /> : null}
            <Text style={styles.photoBtnText}>{photo ? '✓ Photo attached — tap to change' : '📷 Add photo'}</Text>
          </Pressable>

          <Pressable onPress={handleCreate} disabled={submitting} style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}>
            <Text style={styles.submitBtnText}>{submitting ? 'Creating…' : 'Create Listing →'}</Text>
          </Pressable>
        </View>
      ) : null}

      {listings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No listings yet</Text>
          <Text style={styles.emptySub}>Create a listing to offer minerals to verified buyers</Text>
        </View>
      ) : (
        listings.map((listing) => (
          <View key={listing.id} style={styles.card}>
            <View style={styles.cardTop}>
              {listing.photoData ? (
                <Image source={{ uri: listing.photoData }} style={styles.thumb} />
              ) : (
                <View style={styles.thumbPlaceholder}><Text style={{ fontSize: 20 }}>⛏</Text></View>
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.mineral}>{listing.mineralType}</Text>
                <Text style={styles.qty}>{Number(listing.quantity).toLocaleString()} {listing.unit}</Text>
                <Text style={styles.price}>GHS {Number(listing.askingPrice).toLocaleString()}</Text>
              </View>
              <View style={[styles.statusBadge, listing.status === 'ACTIVE' ? styles.statusActive : listing.status === 'SOLD' ? styles.statusSold : styles.statusWithdrawn]}>
                <Text style={styles.statusText}>{listing.status}</Text>
              </View>
            </View>
            {listing.status === 'ACTIVE' ? (
              <Pressable
                onPress={() => handleWithdraw(listing)}
                disabled={acting === listing.id}
                style={[styles.withdrawBtn, acting === listing.id && styles.btnDisabled]}
              >
                <Text style={styles.withdrawBtnText}>{acting === listing.id ? '…' : 'Withdraw'}</Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f0f2f5' },
  titleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  title: { color: '#17212b', fontSize: 22, fontWeight: '900' },
  addBtn: { backgroundColor: '#1f6f5b', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  subtitle: { color: '#8fa3b8', fontSize: 11, fontWeight: '600', marginBottom: 16 },
  formCard: { backgroundColor: '#fff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 16 },
  formTitle: { color: '#17212b', fontSize: 16, fontWeight: '900', marginBottom: 16 },
  label: { color: '#8fa3b8', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: '#f0f2f5', borderColor: '#e5e9ef', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 14, marginBottom: 14, paddingHorizontal: 12, paddingVertical: 10 },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  unitPill: { borderColor: '#e5e9ef', borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  unitPillActive: { backgroundColor: '#1f6f5b', borderColor: '#1f6f5b' },
  unitPillText: { color: '#8fa3b8', fontSize: 12, fontWeight: '700' },
  unitPillTextActive: { color: '#fff' },
  photoBtn: { alignItems: 'center', backgroundColor: '#f0f2f5', borderColor: '#e5e9ef', borderRadius: 8, borderStyle: 'dashed', borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 16, padding: 12 },
  photoBtnDone: { borderColor: '#1f6f5b', borderStyle: 'solid' },
  photoBtnText: { color: '#8fa3b8', fontSize: 13, fontWeight: '700' },
  photoThumb: { borderRadius: 6, height: 36, width: 36 },
  submitBtn: { alignItems: 'center', backgroundColor: '#1f6f5b', borderRadius: 10, paddingVertical: 14 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  emptyCard: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, padding: 40 },
  emptyIcon: { fontSize: 32, marginBottom: 10 },
  emptyTitle: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  emptySub: { color: '#8fa3b8', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 12, padding: 14 },
  cardTop: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: 10 },
  thumb: { borderRadius: 8, height: 54, marginRight: 12, width: 54 },
  thumbPlaceholder: { alignItems: 'center', backgroundColor: '#f0f2f5', borderRadius: 8, height: 54, justifyContent: 'center', marginRight: 12, width: 54 },
  cardInfo: { flex: 1 },
  mineral: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 2 },
  qty: { color: '#5d6875', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  price: { color: '#1f6f5b', fontSize: 13, fontWeight: '800' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  statusActive: { backgroundColor: '#dcfce7' },
  statusSold: { backgroundColor: '#e0f2fe' },
  statusWithdrawn: { backgroundColor: '#f3f4f6' },
  statusText: { fontSize: 11, fontWeight: '800', color: '#374151' },
  withdrawBtn: { alignItems: 'center', backgroundColor: '#fff5f5', borderColor: '#fca5a5', borderRadius: 8, borderWidth: 1, paddingVertical: 8 },
  withdrawBtnText: { color: '#dc2626', fontSize: 13, fontWeight: '800' },
  btnDisabled: { opacity: 0.5 },
});
