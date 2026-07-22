import { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { getMarketplaceListings, createListing, withdrawListing, type MineralListing } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, spacing, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

const UNITS = ['tonnes', 'kg', 'oz', 'carats', 'barrels'];

export function SupervisorListingsScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

  const [listings, setListings] = useState<MineralListing[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [acting, setActing] = useState<number | null>(null);

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
    <FlatList
      data={listings}
      keyExtractor={(listing) => String(listing.id)}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListHeaderComponent={
        <>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Mineral Listings</Text>
            <Pressable onPress={() => setCreating((v) => !v)} style={styles.addBtn}>
              {creating ? (
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: 4 }}>
                  <Ionicons name="close" size={14} color="#fff" />
                  <Text style={styles.addBtnText}>Cancel</Text>
                </View>
              ) : (
                <Text style={styles.addBtnText}>+ New Listing</Text>
              )}
            </Pressable>
          </View>
          <Text style={styles.subtitle}>Your site's listings</Text>

          {creating ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>New Listing</Text>

              <Text style={styles.label}>Mineral Type *</Text>
              <TextInput style={styles.input} value={mineralType} onChangeText={setMineralType} placeholder="e.g. Gold, Bauxite" placeholderTextColor={theme.textMuted} />

              <Text style={styles.label}>Quantity *</Text>
              <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} placeholder="e.g. 500" placeholderTextColor={theme.textMuted} keyboardType="decimal-pad" />

              <Text style={styles.label}>Unit</Text>
              <View style={styles.unitRow}>
                {UNITS.map((u) => (
                  <Pressable key={u} onPress={() => setUnit(u)} style={[styles.unitPill, unit === u && styles.unitPillActive]}>
                    <Text style={[styles.unitPillText, unit === u && styles.unitPillTextActive]}>{u}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Asking Price (GHS) *</Text>
              <TextInput style={styles.input} value={askingPrice} onChangeText={setAskingPrice} placeholder="e.g. 250000" placeholderTextColor={theme.textMuted} keyboardType="decimal-pad" />

              <Text style={styles.label}>Grade</Text>
              <TextInput style={styles.input} value={grade} onChangeText={setGrade} placeholder="e.g. 22 carat" placeholderTextColor={theme.textMuted} />

              <Text style={styles.label}>Location</Text>
              <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="e.g. Northern Zone, Block 3" placeholderTextColor={theme.textMuted} />

              <Text style={styles.label}>Min. Order Quantity</Text>
              <TextInput style={styles.input} value={minOrderQty} onChangeText={setMinOrderQty} placeholder="Optional" placeholderTextColor={theme.textMuted} keyboardType="decimal-pad" />

              <Text style={styles.label}>Photo</Text>
              <Pressable onPress={pickPhoto} style={[styles.photoBtn, photo ? styles.photoBtnDone : null]}>
                {photo ? (
                  <>
                    <Image source={{ uri: photo }} style={styles.photoThumb} />
                    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
                      <Ionicons name="checkmark-circle" size={13} color={theme.accent} />
                      <Text style={styles.photoBtnText}>Photo attached — tap to change</Text>
                    </View>
                  </>
                ) : (
                  <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
                    <Ionicons name="camera-outline" size={13} color={theme.textMuted} />
                    <Text style={styles.photoBtnText}>Add photo</Text>
                  </View>
                )}
              </Pressable>

              <Pressable onPress={handleCreate} disabled={submitting} style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}>
                <Text style={styles.submitBtnText}>{submitting ? 'Creating…' : 'Create Listing →'}</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      }
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Ionicons name="clipboard-outline" size={32} color={theme.textMuted} style={{ marginBottom: 10 }} />
          <Text style={styles.emptyTitle}>No listings yet</Text>
          <Text style={styles.emptySub}>Create a listing to offer minerals to verified buyers</Text>
        </View>
      }
      renderItem={({ item: listing }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            {listing.photoData ? (
              <Image source={{ uri: listing.photoData }} style={styles.thumb} />
            ) : (
              <View style={styles.thumbPlaceholder}><Ionicons name="hammer-outline" size={20} color={theme.textMuted} /></View>
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
    container: { backgroundColor: theme.bg, padding: spacing.xl, paddingBottom: 40 },
    titleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
    title: { color: theme.text, fontSize: 22, fontWeight: '900' },
    addBtn: { backgroundColor: theme.accent, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: 7 },
    addBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    subtitle: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginBottom: spacing.lg },
    formCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.lg, ...cardShadow },
    formTitle: { color: theme.text, fontSize: 16, fontWeight: '900', marginBottom: spacing.lg },
    label: { color: theme.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
    input: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, marginBottom: 14, paddingHorizontal: spacing.md, paddingVertical: 10 },
    unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: 14 },
    unitPill: { borderColor: theme.border, borderRadius: 16, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 6 },
    unitPillActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    unitPillText: { color: theme.textMuted, fontSize: 12, fontWeight: '700' },
    unitPillTextActive: { color: '#fff' },
    photoBtn: { alignItems: 'center', backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderStyle: 'dashed', borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: spacing.lg, padding: spacing.md },
    photoBtnDone: { borderColor: theme.accent, borderStyle: 'solid' },
    photoBtnText: { color: theme.textMuted, fontSize: 13, fontWeight: '700' },
    photoThumb: { borderRadius: 6, height: 36, width: 36 },
    submitBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 10, paddingVertical: 14 },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 40, ...cardShadow },
    emptyTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
    emptySub: { color: theme.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.md, padding: 14, ...cardShadow },
    cardTop: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: 10 },
    thumb: { borderRadius: 8, height: 54, marginRight: spacing.md, width: 54 },
    thumbPlaceholder: { alignItems: 'center', backgroundColor: theme.bgInput, borderRadius: 8, height: 54, justifyContent: 'center', marginRight: spacing.md, width: 54 },
    cardInfo: { flex: 1 },
    mineral: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 2 },
    qty: { color: theme.textSub, fontSize: 13, fontWeight: '700', marginBottom: 2 },
    price: { color: theme.accent, fontSize: 13, fontWeight: '800' },
    statusBadge: { borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 4 },
    statusActive: { backgroundColor: theme.successLight },
    statusSold: { backgroundColor: theme.infoLight },
    statusWithdrawn: { backgroundColor: theme.bgInput },
    statusText: { color: theme.textSub, fontSize: 11, fontWeight: '800' },
    withdrawBtn: { alignItems: 'center', backgroundColor: theme.dangerLight, borderColor: theme.danger, borderRadius: 8, borderWidth: 1, paddingVertical: spacing.sm },
    withdrawBtnText: { color: theme.danger, fontSize: 13, fontWeight: '800' },
    btnDisabled: { opacity: 0.5 },
  });
}
