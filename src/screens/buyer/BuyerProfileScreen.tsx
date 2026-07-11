import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMyProfile, type UserProfile } from '../../services/api';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

const VERIF_STATUS: Record<string, { label: string; color: string }> = {
  VERIFIED: { label: 'Verified', color: '#1f6f5b' },
  PENDING: { label: 'Pending Review', color: '#a15c00' },
  REJECTED: { label: 'Rejected', color: '#b42318' },
};

function Row({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <View style={[styles.row, border && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function BuyerProfileScreen({ session }: Props) {
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
  const verif = VERIF_STATUS[verifKey] ?? (verifKey ? { label: verifKey, color: '#8fa3b8' } : null);

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
            <Row label="Full Name" value={profile?.fullName ?? session.user.fullName} />
            <Row label="Email" value={profile?.email ?? session.user.email} border />
            <Row label="Account Type" value="Mineral Buyer" border />
            {profile?.createdAt ? <Row label="Member Since" value={formatDate(profile.createdAt)} border /> : null}
          </View>

          <Text style={styles.sectionTitle}>Business Details</Text>
          <View style={styles.card}>
            <Row label="Business Name" value={profile?.businessName ?? 'Not provided'} />
            <Row label="GoldBod License No." value={profile?.goldbodLicenseNumber ?? 'Not provided'} border />
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

const styles = StyleSheet.create({
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  title: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 20 },
  sectionTitle: { color: '#5d6875', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8, marginTop: 20, textTransform: 'uppercase' },
  card: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  row: { paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderTopColor: '#f4f6f8', borderTopWidth: 1 },
  rowLabel: { color: '#8fa3b8', fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginBottom: 4, textTransform: 'uppercase' },
  rowValue: { color: '#17212b', fontSize: 15, fontWeight: '700' },
  meta: { color: '#8fa3b8', fontSize: 13, fontWeight: '600', padding: 16 },
  verifCard: { alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 16 },
  verifDot: { borderRadius: 6, height: 12, width: 12 },
  verifLabel: { fontSize: 15, fontWeight: '800' },
});
