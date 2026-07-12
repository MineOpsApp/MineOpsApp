import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMyProfile, type UserProfile } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

const VERIF_STATUS: Record<string, { label: string; color: string }> = {
  VERIFIED: { label: 'Verified', color: '#1f6f5b' },
  PENDING: { label: 'Pending Review', color: '#a15c00' },
  REJECTED: { label: 'Rejected', color: '#b42318' },
};

function Row({ label, value, border, theme }: { label: string; value: string; border?: boolean; theme: Theme }) {
  return (
    <View style={[{ paddingHorizontal: 16, paddingVertical: 14 }, border && { borderTopColor: theme.bgInput, borderTopWidth: 1 }]}>
      <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginBottom: 4, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

export function BuyerProfileScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const p = await getMyProfile();
      setProfile(p);
    } catch { /* best-effort */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  function formatDate(dateStr: string) {
    try { return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return dateStr; }
  }

  const verifKey = profile?.buyerVerificationStatus ?? '';
  const verif = VERIF_STATUS[verifKey] ?? (verifKey ? { label: verifKey, color: theme.textMuted } : null);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>My Profile</Text>

      {loading ? (
        <View style={styles.card}><Text style={styles.meta}>Loading...</Text></View>
      ) : (
        <>
          <View style={styles.card}>
            <Row label="Full Name" value={profile?.fullName ?? session.user.fullName} theme={theme} />
            <Row label="Email" value={profile?.email ?? session.user.email} border theme={theme} />
            <Row label="Account Type" value="Mineral Buyer" border theme={theme} />
            {profile?.createdAt ? <Row label="Member Since" value={formatDate(profile.createdAt)} border theme={theme} /> : null}
          </View>

          <Text style={styles.sectionTitle}>Business Details</Text>
          <View style={styles.card}>
            <Row label="Business Name" value={profile?.businessName ?? 'Not provided'} theme={theme} />
            <Row label="GoldBod License No." value={profile?.goldbodLicenseNumber ?? 'Not provided'} border theme={theme} />
          </View>

          {verif ? (
            <>
              <Text style={styles.sectionTitle}>Verification Status</Text>
              <View style={[styles.verifCard, { borderColor: verif.color + '55' }]}>
                <View style={[styles.verifDot, { backgroundColor: verif.color }]} />
                <Text style={[styles.verifLabel, { color: verif.color }]}>{verif.label}</Text>
              </View>
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 40 },
    title: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 20 },
    sectionTitle: { color: theme.textSub, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8, marginTop: 20, textTransform: 'uppercase' },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
    meta: { color: theme.textMuted, fontSize: 13, fontWeight: '600', padding: 16 },
    verifCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 16 },
    verifDot: { borderRadius: 6, height: 12, width: 12 },
    verifLabel: { fontSize: 15, fontWeight: '800' },
  });
}
