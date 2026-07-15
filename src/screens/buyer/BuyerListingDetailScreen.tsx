import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SwipeBackView } from '../../components/SwipeBackView';

import { createOffer, type MineralListing } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = {
  session: AuthSession;
  listing: MineralListing;
  onBack: () => void;
};

export function BuyerListingDetailScreen({ session, listing, onBack }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [offerPrice, setOfferPrice] = useState('');
  const [offerQty, setOfferQty] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isGoldListing = listing.mineralType?.toLowerCase() === 'gold';
  const hasGoldbodLicense = !!(session.user.goldbodLicenseNumber?.trim());

  async function handleSubmitOffer() {
    const price = parseFloat(offerPrice);
    const qty = parseFloat(offerQty);
    if (!price || price <= 0) { Alert.alert('Invalid offer', 'Enter a valid offer price.'); return; }
    if (!qty || qty <= 0) { Alert.alert('Invalid quantity', 'Enter a valid quantity.'); return; }
    if (listing.minOrderQuantity && qty < Number(listing.minOrderQuantity)) {
      Alert.alert('Below minimum', `Minimum order quantity is ${listing.minOrderQuantity} ${listing.unit}.`);
      return;
    }
    setSubmitting(true);
    try {
      await createOffer(listing.id, { offerPrice: price, offerQuantity: qty, message: message.trim() || null });
      setSubmitted(true);
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Could not submit offer.');
    } finally {
      setSubmitting(false);
    }
  }

  function fmt(val: number | string | null | undefined) {
    if (val == null) return '—';
    return Number(val).toLocaleString();
  }

  return (
    <SwipeBackView onBack={onBack}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back to listings</Text>
        </Pressable>

        {listing.photoData ? (
          <Image source={{ uri: listing.photoData }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}><Text style={{ fontSize: 48 }}>⛏</Text></View>
        )}

        <View style={styles.card}>
          <Text style={styles.mineral}>{listing.mineralType}</Text>
          <Text style={styles.site}>{listing.site}</Text>

          <View style={styles.grid}>
            <View style={styles.gridItem}><Text style={styles.gridLabel}>Quantity</Text><Text style={styles.gridValue}>{fmt(listing.quantity)} {listing.unit}</Text></View>
            <View style={styles.gridItem}><Text style={styles.gridLabel}>Asking Price</Text><Text style={styles.gridValue}>GHS {fmt(listing.askingPrice)}</Text></View>
            {listing.grade ? <View style={styles.gridItem}><Text style={styles.gridLabel}>Grade</Text><Text style={styles.gridValue}>{listing.grade}</Text></View> : null}
            {listing.location ? <View style={styles.gridItem}><Text style={styles.gridLabel}>Location</Text><Text style={styles.gridValue}>{listing.location}</Text></View> : null}
            {listing.availableFrom ? <View style={styles.gridItem}><Text style={styles.gridLabel}>Available From</Text><Text style={styles.gridValue}>{listing.availableFrom}</Text></View> : null}
            {listing.minOrderQuantity ? <View style={styles.gridItem}><Text style={styles.gridLabel}>Min. Order</Text><Text style={styles.gridValue}>{fmt(listing.minOrderQuantity)} {listing.unit}</Text></View> : null}
          </View>
        </View>

        {submitted ? (
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>Offer submitted</Text>
            <Text style={styles.successSub}>The site supervisor will review your offer. Track it under Offers.</Text>
            <Pressable onPress={onBack} style={styles.backListingBtn}>
              <Text style={styles.backListingBtnText}>Back to listings</Text>
            </Pressable>
          </View>
        ) : isGoldListing && !hasGoldbodLicense ? (
          <View style={styles.blockedCard}>
            <Text style={styles.blockedIcon}>🪪</Text>
            <Text style={styles.blockedTitle}>GoldBod License Required</Text>
            <Text style={styles.blockedBody}>
              Since 1 May 2025, a valid GoldBod license number is required to place offers on gold listings in Ghana. Add your license number in your profile to proceed.
            </Text>
          </View>
        ) : (
          <View style={styles.offerCard}>
            <Text style={styles.offerTitle}>Make an Offer</Text>

            <Text style={styles.fieldLabel}>Your Offer Price (GHS)</Text>
            <TextInput
              style={styles.input}
              value={offerPrice}
              onChangeText={setOfferPrice}
              placeholder={`Asking: GHS ${fmt(listing.askingPrice)}`}
              placeholderTextColor={theme.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Quantity ({listing.unit})</Text>
            <TextInput
              style={styles.input}
              value={offerQty}
              onChangeText={setOfferQty}
              placeholder={listing.minOrderQuantity ? `Min. ${listing.minOrderQuantity}` : `Up to ${listing.quantity}`}
              placeholderTextColor={theme.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Message (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={message}
              onChangeText={setMessage}
              placeholder="Any notes for the seller…"
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={3}
            />

            <Pressable onPress={handleSubmitOffer} disabled={submitting} style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}>
              <Text style={styles.submitBtnText}>{submitting ? 'Submitting…' : 'Submit Offer →'}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
    </SwipeBackView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 40, backgroundColor: theme.bg },
    backBtn: { marginBottom: 16 },
    backText: { color: theme.accent, fontSize: 14, fontWeight: '800' },
    photo: { borderRadius: 12, height: 200, marginBottom: 16, width: '100%' },
    photoPlaceholder: { alignItems: 'center', backgroundColor: theme.border, borderRadius: 12, height: 160, justifyContent: 'center', marginBottom: 16 },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 16 },
    mineral: { color: theme.text, fontSize: 20, fontWeight: '900', marginBottom: 4 },
    site: { color: theme.accent, fontSize: 13, fontWeight: '700', marginBottom: 14 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    gridItem: { minWidth: '45%' },
    gridLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 2, textTransform: 'uppercase' },
    gridValue: { color: theme.text, fontSize: 14, fontWeight: '800' },
    offerCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 16 },
    offerTitle: { color: theme.text, fontSize: 16, fontWeight: '900', marginBottom: 16 },
    fieldLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
    input: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 15, marginBottom: 14, paddingHorizontal: 12, paddingVertical: 10 },
    inputMulti: { height: 80, textAlignVertical: 'top' },
    submitBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 10, marginTop: 4, paddingVertical: 14 },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
    successCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 32 },
    successIcon: { color: theme.accent, fontSize: 36, fontWeight: '900', marginBottom: 12 },
    successTitle: { color: theme.text, fontSize: 18, fontWeight: '900', marginBottom: 8 },
    successSub: { color: theme.textSub, fontSize: 13, fontWeight: '600', lineHeight: 20, marginBottom: 20, textAlign: 'center' },
    backListingBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 10, paddingHorizontal: 28, paddingVertical: 12 },
    backListingBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
    blockedCard: { alignItems: 'center', backgroundColor: theme.amberLight, borderColor: theme.amber, borderRadius: 12, borderWidth: 1, padding: 28 },
    blockedIcon: { fontSize: 36, marginBottom: 12 },
    blockedTitle: { color: theme.amber, fontSize: 16, fontWeight: '900', marginBottom: 8 },
    blockedBody: { color: theme.amber, fontSize: 13, fontWeight: '600', lineHeight: 20, textAlign: 'center' },
  });
}
