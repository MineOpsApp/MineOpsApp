import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getWorkerProfileByEmail } from '../../services/api';
import type { UserProfile } from '../../services/api';
import type { AuthSession } from '../../types/auth';

type Props = { email: string; session: AuthSession };

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return iso; }
}

function roleLabel(role: string) {
  if (role === 'worker') return 'Worker';
  if (role === 'supervisor') return 'Supervisor';
  if (role === 'safetyOfficer') return 'Safety Officer';
  if (role === 'guest') return 'Guest';
  return role;
}

function idNumber(id: number) {
  return `WRK-${String(id).padStart(6, '0')}`;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function WorkerProfileViewScreen({ email, session: _ }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIdCard, setShowIdCard] = useState(false);

  useEffect(() => {
    setLoading(true);
    setProfile(null);
    getWorkerProfileByEmail(email)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [email]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#1f6f5b" size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load profile</Text>
      </View>
    );
  }

  // ── ID Card view ──────────────────────────────────────────────
  if (showIdCard) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => setShowIdCard(false)} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back to Profile</Text>
        </Pressable>

        <Text style={styles.pageTitle}>Digital ID Card</Text>

        <View style={styles.idCard}>
          <View style={styles.idCardHeader}>
            <Text style={styles.idCardHeaderIcon}>⛏</Text>
            <View>
              <Text style={styles.idCardOrgName}>MINEOPS OPERATIONS</Text>
              <Text style={styles.idCardSite}>{profile.assignedSite.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.idCardDivider} />

          <View style={styles.idCardBody}>
            <View style={styles.idCardPhotoWrap}>
              {profile.profilePhoto ? (
                <Image source={{ uri: profile.profilePhoto }} style={styles.idCardPhoto} />
              ) : (
                <View style={styles.idCardPhotoFallback}>
                  <Text style={styles.idCardPhotoInitials}>{getInitials(profile.fullName)}</Text>
                </View>
              )}
            </View>
            <View style={styles.idCardInfo}>
              <Text style={styles.idCardName}>{profile.fullName.toUpperCase()}</Text>
              <Text style={styles.idCardRole}>{roleLabel(profile.role)}</Text>
              <Text style={styles.idCardIdLabel}>EMPLOYEE ID</Text>
              <Text style={styles.idCardIdNumber}>{idNumber(profile.id)}</Text>
            </View>
          </View>

          <View style={styles.idCardDivider} />

          <View style={styles.idCardFooter}>
            <View style={[styles.statusDot, { backgroundColor: profile.active ? '#15803d' : '#b42318' }]} />
            <Text style={styles.idCardStatus}>
              {profile.active ? 'ACTIVE EMPLOYEE' : 'ACCOUNT SUSPENDED'}
            </Text>
          </View>
          {profile.createdAt ? (
            <Text style={styles.idCardSince}>Issued {formatDate(profile.createdAt)}</Text>
          ) : null}
        </View>
      </ScrollView>
    );
  }

  // ── Main profile view (read-only) ─────────────────────────────
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>{profile.fullName}</Text>
      <Text style={styles.pageSub}>{roleLabel(profile.role)} · {profile.assignedSite}</Text>

      {/* Photo */}
      <View style={styles.photoSection}>
        {profile.profilePhoto ? (
          <Image source={{ uri: profile.profilePhoto }} style={styles.photoCircle} />
        ) : (
          <View style={styles.photoCircle}>
            <Text style={styles.photoInitials}>{getInitials(profile.fullName)}</Text>
          </View>
        )}
        <View style={[styles.statusPill, { backgroundColor: profile.active ? '#dcfce7' : '#fff5f5', marginTop: 10 }]}>
          <Text style={[styles.statusPillText, { color: profile.active ? '#15803d' : '#b42318' }]}>
            {profile.active ? 'Active' : 'Suspended'}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.shiftLogCount}</Text>
          <Text style={styles.statLabel}>Shifts</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.certificationCount}</Text>
          <Text style={styles.statLabel}>Certs</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.emergencyContactCount}</Text>
          <Text style={styles.statLabel}>Contacts</Text>
        </View>
      </View>

      {/* ID card shortcut */}
      <Pressable onPress={() => setShowIdCard(true)} style={styles.idCardBtn}>
        <Text style={styles.idCardBtnIcon}>🪪</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.idCardBtnLabel}>View Digital ID Card</Text>
          <Text style={styles.idCardBtnSub}>ID: {idNumber(profile.id)}</Text>
        </View>
        <Text style={styles.idCardBtnChevron}>›</Text>
      </Pressable>

      {/* Bio */}
      {profile.bio ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bio</Text>
          <Text style={styles.bioText}>{profile.bio}</Text>
        </View>
      ) : null}

      {/* Account details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Name</Text>
          <Text style={styles.detailValue}>{profile.fullName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email</Text>
          <Text style={styles.detailValue}>{profile.email}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Role</Text>
          <Text style={styles.detailValue}>{roleLabel(profile.role)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Site</Text>
          <Text style={styles.detailValue}>{profile.assignedSite}</Text>
        </View>
        {profile.createdAt ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Member since</Text>
            <Text style={styles.detailValue}>{formatDate(profile.createdAt)}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', flex: 1, justifyContent: 'center', backgroundColor: '#f4f6f8' },
  container: { backgroundColor: '#f4f6f8', padding: 20, paddingBottom: 48 },
  errorText: { color: '#b42318', fontSize: 14, fontWeight: '700' },
  pageTitle: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 2 },
  pageSub: { color: '#5d6875', fontSize: 13, fontWeight: '700', marginBottom: 16 },
  backBtn: { marginBottom: 12 },
  backBtnText: { color: '#1f6f5b', fontSize: 14, fontWeight: '800' },

  photoSection: { alignItems: 'center', marginBottom: 18 },
  photoCircle: {
    alignItems: 'center',
    backgroundColor: '#17212b',
    borderRadius: 52,
    height: 104,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 104,
  },
  photoInitials: { color: '#ffffff', fontSize: 36, fontWeight: '900' },
  statusPill: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 12, fontWeight: '800' },

  statsRow: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 14, paddingVertical: 16 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { color: '#17212b', fontSize: 26, fontWeight: '900' },
  statLabel: { color: '#5d6875', fontSize: 10, fontWeight: '800', marginTop: 2, textTransform: 'uppercase' },
  statDivider: { backgroundColor: '#dde3ea', width: 1 },

  idCardBtn: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 14, padding: 14 },
  idCardBtnIcon: { fontSize: 24 },
  idCardBtnLabel: { color: '#17212b', fontSize: 14, fontWeight: '800' },
  idCardBtnSub: { color: '#5d6875', fontSize: 12, fontWeight: '700', marginTop: 1 },
  idCardBtnChevron: { color: '#5d6875', fontSize: 22 },

  section: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 10, borderWidth: 1, marginBottom: 14, padding: 16 },
  sectionTitle: { color: '#17212b', fontSize: 13, fontWeight: '900', letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' },
  bioText: { color: '#17212b', fontSize: 14, fontWeight: '600', lineHeight: 22 },

  detailRow: { alignItems: 'center', borderTopColor: '#f4f6f8', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
  detailLabel: { color: '#5d6875', fontSize: 13, fontWeight: '700' },
  detailValue: { color: '#17212b', fontSize: 13, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },

  idCard: {
    backgroundColor: '#17212b',
    borderRadius: 16,
    elevation: 6,
    marginBottom: 16,
    marginTop: 8,
    overflow: 'hidden',
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  idCardHeader: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 14 },
  idCardHeaderIcon: { fontSize: 28 },
  idCardOrgName: { color: '#ffffff', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  idCardSite: { color: '#6fcfae', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  idCardDivider: { backgroundColor: '#2e3f50', height: 1, marginBottom: 14 },
  idCardBody: { alignItems: 'flex-start', flexDirection: 'row', gap: 16, marginBottom: 14 },
  idCardPhotoWrap: { borderColor: '#2e3f50', borderRadius: 8, borderWidth: 2, height: 84, overflow: 'hidden', width: 72 },
  idCardPhoto: { height: '100%', width: '100%' },
  idCardPhotoFallback: { alignItems: 'center', backgroundColor: '#2e3f50', flex: 1, justifyContent: 'center' },
  idCardPhotoInitials: { color: '#6fcfae', fontSize: 26, fontWeight: '900' },
  idCardInfo: { flex: 1, justifyContent: 'center' },
  idCardName: { color: '#ffffff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5, marginBottom: 3 },
  idCardRole: { color: '#9cbdcf', fontSize: 12, fontWeight: '700', marginBottom: 10 },
  idCardIdLabel: { color: '#5d7a8c', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 2, textTransform: 'uppercase' },
  idCardIdNumber: { color: '#6fcfae', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  idCardFooter: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 6 },
  statusDot: { borderRadius: 5, height: 10, width: 10 },
  idCardStatus: { color: '#9cbdcf', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  idCardSince: { color: '#5d7a8c', fontSize: 11, fontWeight: '600' },
});
