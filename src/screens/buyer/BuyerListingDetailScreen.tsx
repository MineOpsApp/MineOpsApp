import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SwipeBackView } from '../../components/SwipeBackView';

import { createOffer, type MineralListing } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = {
  session: AuthSession;
  listing: MineralListing;
  onBack: () => void;
};

export function BuyerListingDetailScreen({ session, listing, onBack }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

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
          <View style={styles.photoPlaceholder}><Ionicons name="hammer-outline" size={48} color={theme.textMuted} /></View>
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
            <Ionicons name="checkmark-circle" size={48} color={theme.accent} style={{ marginBottom: 12 }} />
            <Text style={styles.successTitle}>Offer submitted</Text>
            <Text style={styles.successSub}>The site supervisor will review your offer. Track it under Offers.</Text>
            <Pressable onPress={onBack} style={styles.backListingBtn}>
              <Text style={styles.backListingBtnText}>Back to listings</Text>
            </Pressable>
          </View>
        ) : isGoldListing && !hasGoldbodLicense ? (
          <View style={styles.blockedCard}>
            <Ionicons name="card-outline" size={48} color={theme.amber} style={{ marginBottom: 12 }} />
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
    backBtn: { marginBottom: spacing.lg },
    backText: { color: theme.accent, fontSize: 14, fontWeight: '800' },
    photo: { borderRadius: 12, height: 200, marginBottom: spacing.lg, width: '100%' },
    photoPlaceholder: { alignItems: 'center', backgroundColor: theme.border, borderRadius: 12, height: 160, justifyContent: 'center', marginBottom: spacing.lg },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.lg, ...cardShadow },
    mineral: { ...typography.h2, color: theme.text, marginBottom: 4 },
    site: { color: theme.accent, fontSize: 13, fontWeight: '700', marginBottom: 14 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    gridItem: { minWidth: '45%' },
    gridLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 2, textTransform: 'uppercase' },
    gridValue: { color: theme.text, fontSize: 14, fontWeight: '800' },
    offerCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: spacing.lg, ...cardShadow },
    offerTitle: { color: theme.text, fontSize: 16, fontWeight: '900', marginBottom: spacing.lg },
    fieldLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
    input: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 15, marginBottom: 14, paddingHorizontal: spacing.md, paddingVertical: 10 },
    inputMulti: { height: 80, textAlignVertical: 'top' },
    submitBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 10, marginTop: 4, paddingVertical: 14 },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
    successCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 32, ...cardShadow },
    successTitle: { color: theme.text, fontSize: 18, fontWeight: '900', marginBottom: spacing.sm },
    successSub: { color: theme.textSub, fontSize: 13, fontWeight: '600', lineHeight: 20, marginBottom: spacing.xl, textAlign: 'center' },
    backListingBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 10, paddingHorizontal: 28, paddingVertical: spacing.md },
    backListingBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
    blockedCard: { alignItems: 'center', backgroundColor: theme.amberLight, borderColor: theme.amber, borderRadius: 12, borderWidth: 1, padding: 28, ...cardShadow },
    blockedTitle: { color: theme.amber, fontSize: 16, fontWeight: '900', marginBottom: spacing.sm },
    blockedBody: { color: theme.amber, fontSize: 13, fontWeight: '600', lineHeight: 20, textAlign: 'center' },
  });
}
