import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { getMyProfile, getInsuranceStatus, applyForInsurance, parseApiError, updateMyProfile } from '../../services/api';
import type { UserProfile, InsuranceStatus } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

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

export function WorkerProfileScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [insurance, setInsurance] = useState<InsuranceStatus | null>(null);
  const [applyingInsurance, setApplyingInsurance] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then((p) => { setProfile(p); setBioText(p.bio ?? ''); })
      .catch(() => {})
      .finally(() => setLoading(false));
    getInsuranceStatus().then(setInsurance).catch(() => {});
  }, []);

  async function handleApplyInsurance() {
    setApplyingInsurance(true);
    try {
      const result = await applyForInsurance();
      setInsurance(result);
    } catch (e) {
      Alert.alert('Error', parseApiError(e));
    } finally {
      setApplyingInsurance(false);
    }
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to photos to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;

    const dataUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
    setUploading(true);
    try {
      const updated = await updateMyProfile({ photo: dataUri });
      setProfile(updated);
    } catch (e) {
      Alert.alert('Upload failed', parseApiError(e));
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto() {
    Alert.alert('Remove photo', 'Remove your profile picture?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setUploading(true);
          try {
            const updated = await updateMyProfile({ photo: null });
            setProfile(updated);
          } catch (e) {
            Alert.alert('Error', parseApiError(e));
          } finally {
            setUploading(false);
          }
        },
      },
    ]);
  }

  async function saveBio() {
    setSavingBio(true);
    try {
      const updated = await updateMyProfile({ bio: bioText.trim() || null });
      setProfile(updated);
      setEditingBio(false);
    } catch (e) {
      Alert.alert('Error', parseApiError(e));
    } finally {
      setSavingBio(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.accent} size="large" />
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
        <Text style={styles.pageSub}>Present this as your site identification</Text>

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
            <View style={[styles.statusDot, { backgroundColor: profile.active ? theme.success : theme.danger }]} />
            <Text style={styles.idCardStatus}>
              {profile.active ? 'ACTIVE EMPLOYEE' : 'ACCOUNT SUSPENDED'}
            </Text>
          </View>
          {profile.createdAt ? (
            <Text style={styles.idCardSince}>Issued {formatDate(profile.createdAt)}</Text>
          ) : null}
        </View>

        <Text style={styles.idCardNote}>
          This card is for identification purposes within the mine site only.
        </Text>
      </ScrollView>
    );
  }

  // ── Main profile view ─────────────────────────────────────────
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>My Profile</Text>

      {/* Photo section */}
      <View style={styles.photoSection}>
        {uploading ? (
          <View style={styles.photoCircle}>
            <ActivityIndicator color="#ffffff" size="large" />
          </View>
        ) : profile.profilePhoto ? (
          <Image source={{ uri: profile.profilePhoto }} style={styles.photoCircle} />
        ) : (
          <View style={styles.photoCircle}>
            <Text style={styles.photoInitials}>{getInitials(profile.fullName)}</Text>
          </View>
        )}

        <Text style={styles.profileName}>{profile.fullName}</Text>
        <Text style={styles.profileMeta}>{roleLabel(profile.role)} · {profile.assignedSite}</Text>

        <View style={styles.photoActions}>
          <Pressable onPress={pickPhoto} style={styles.photoBtn} disabled={uploading}>
            <Text style={styles.photoBtnText}>
              {profile.profilePhoto ? 'Change Photo' : 'Add Photo'}
            </Text>
          </Pressable>
          {profile.profilePhoto ? (
            <Pressable onPress={removePhoto} style={styles.photoBtnAlt} disabled={uploading}>
              <Text style={styles.photoBtnAltText}>Remove</Text>
            </Pressable>
          ) : null}
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
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Bio</Text>
          {!editingBio && (
            <Pressable onPress={() => { setBioText(profile.bio ?? ''); setEditingBio(true); }}>
              <Text style={styles.editLink}>{profile.bio ? 'Edit' : 'Add Bio'}</Text>
            </Pressable>
          )}
        </View>

        {editingBio ? (
          <>
            <TextInput
              style={styles.bioInput}
              value={bioText}
              onChangeText={setBioText}
              placeholder="Tell the team about yourself..."
              placeholderTextColor={theme.textMuted}
              multiline
              maxLength={500}
            />
            <Text style={styles.bioCount}>{bioText.length}/500</Text>
            <View style={styles.bioActions}>
              <Pressable
                onPress={saveBio}
                style={[styles.bioSaveBtn, savingBio && styles.btnDisabled]}
                disabled={savingBio}
              >
                <Text style={styles.bioSaveBtnText}>{savingBio ? 'Saving…' : 'Save'}</Text>
              </Pressable>
              <Pressable
                onPress={() => { setEditingBio(false); setBioText(profile.bio ?? ''); }}
                style={styles.bioCancelBtn}
              >
                <Text style={styles.bioCancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </>
        ) : profile.bio ? (
          <Text style={styles.bioText}>{profile.bio}</Text>
        ) : (
          <Text style={styles.bioEmpty}>No bio yet. Tap "Add Bio" to tell the team about yourself.</Text>
        )}
      </View>

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
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status</Text>
          <View style={[styles.statusPill, { backgroundColor: profile.active ? theme.successLight : theme.dangerLight }]}>
            <Text style={[styles.statusPillText, { color: profile.active ? theme.success : theme.danger }]}>
              {profile.active ? 'Active' : 'Suspended'}
            </Text>
          </View>
        </View>
        {profile.createdAt ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Member since</Text>
            <Text style={styles.detailValue}>{formatDate(profile.createdAt)}</Text>
          </View>
        ) : null}
      </View>

      {/* Insurance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Insurance</Text>
        {insurance === null ? (
          <Text style={styles.bioEmpty}>Loading…</Text>
        ) : insurance.status === 'NOT_AVAILABLE' ? (
          <Text style={styles.bioEmpty}>Not offered at this site</Text>
        ) : insurance.status === 'INSURED' ? (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={[styles.statusPill, { backgroundColor: theme.successLight }]}>
                <Text style={[styles.statusPillText, { color: theme.success }]}>Insured ✓</Text>
              </View>
            </View>
            {insurance.enrolledAt ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Since</Text>
                <Text style={styles.detailValue}>{formatDate(insurance.enrolledAt)}</Text>
              </View>
            ) : null}
          </>
        ) : (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>Not enrolled</Text>
            </View>
            <Pressable
              onPress={handleApplyInsurance}
              style={[styles.bioSaveBtn, applyingInsurance && styles.btnDisabled, { marginTop: 10 }]}
              disabled={applyingInsurance}
            >
              <Text style={styles.bioSaveBtnText}>
                {applyingInsurance ? 'Applying…' : 'Apply for Insurance'}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    centered: { alignItems: 'center', flex: 1, justifyContent: 'center', backgroundColor: theme.bg },
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 48 },
    errorText: { color: theme.danger, fontSize: 14, fontWeight: '700' },
    pageTitle: { color: theme.text, fontSize: 26, fontWeight: '900', marginBottom: 4 },
    pageSub: { color: theme.textSub, fontSize: 13, fontWeight: '600', marginBottom: 20 },
    backBtn: { marginBottom: 12 },
    backBtnText: { color: theme.accent, fontSize: 14, fontWeight: '800' },

    // Photo
    photoSection: { alignItems: 'center', marginBottom: 20, marginTop: 8 },
    photoCircle: {
      alignItems: 'center',
      backgroundColor: theme.bgHero,
      borderRadius: 52,
      height: 104,
      justifyContent: 'center',
      marginBottom: 12,
      overflow: 'hidden',
      width: 104,
    },
    photoInitials: { color: '#ffffff', fontSize: 36, fontWeight: '900' },
    profileName: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 2 },
    profileMeta: { color: theme.textSub, fontSize: 13, fontWeight: '700', marginBottom: 12 },
    photoActions: { flexDirection: 'row', gap: 10 },
    photoBtn: { backgroundColor: theme.bgHero, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 9 },
    photoBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
    photoBtnAlt: { backgroundColor: theme.dangerLight, borderColor: '#fca5a5', borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
    photoBtnAltText: { color: theme.danger, fontSize: 13, fontWeight: '800' },

    // Stats
    statsRow: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 14, paddingVertical: 16 },
    statItem: { alignItems: 'center', flex: 1 },
    statValue: { color: theme.text, fontSize: 26, fontWeight: '900' },
    statLabel: { color: theme.textSub, fontSize: 10, fontWeight: '800', marginTop: 2, textTransform: 'uppercase' },
    statDivider: { backgroundColor: theme.border, width: 1 },

    // ID card button
    idCardBtn: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 16, padding: 14 },
    idCardBtnIcon: { fontSize: 24 },
    idCardBtnLabel: { color: theme.text, fontSize: 14, fontWeight: '800' },
    idCardBtnSub: { color: theme.textSub, fontSize: 12, fontWeight: '700', marginTop: 1 },
    idCardBtnChevron: { color: theme.textSub, fontSize: 22 },

    // Section
    section: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, marginBottom: 14, padding: 16 },
    sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    sectionTitle: { color: theme.text, fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
    editLink: { color: theme.accent, fontSize: 13, fontWeight: '800' },

    // Bio
    bioText: { color: theme.text, fontSize: 14, fontWeight: '600', lineHeight: 22 },
    bioEmpty: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
    bioInput: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, minHeight: 90, padding: 12 },
    bioCount: { color: theme.textMuted, fontSize: 11, fontWeight: '700', marginTop: 4, textAlign: 'right' },
    bioActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
    bioSaveBtn: { backgroundColor: theme.accent, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 9 },
    bioSaveBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    bioCancelBtn: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 9 },
    bioCancelBtnText: { color: theme.textSub, fontSize: 13, fontWeight: '800' },
    btnDisabled: { opacity: 0.5 },

    // Detail rows
    detailRow: { alignItems: 'center', borderTopColor: theme.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
    detailLabel: { color: theme.textSub, fontSize: 13, fontWeight: '700' },
    detailValue: { color: theme.text, fontSize: 13, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
    statusPill: { borderRadius: 6, paddingHorizontal: 9, paddingVertical: 3 },
    statusPillText: { fontSize: 12, fontWeight: '800' },

    // ID card — intentionally always dark (brand design element)
    idCard: {
      backgroundColor: theme.bgHero,
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
    idCardPhotoWrap: {
      borderColor: '#2e3f50',
      borderRadius: 8,
      borderWidth: 2,
      height: 84,
      overflow: 'hidden',
      width: 72,
    },
    idCardPhoto: { height: '100%', width: '100%' },
    idCardPhotoFallback: { alignItems: 'center', backgroundColor: '#2e3f50', flex: 1, justifyContent: 'center' },
    idCardPhotoInitials: { color: '#6fcfae', fontSize: 26, fontWeight: '900' },
    idCardInfo: { flex: 1, justifyContent: 'center' },
    idCardName: { color: '#ffffff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5, marginBottom: 3 },
    idCardRole: { color: '#9cbdcf', fontSize: 12, fontWeight: '700', marginBottom: 10 },
    idCardIdLabel: { color: '#5d7a8c', fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
    idCardIdNumber: { color: '#6fcfae', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
    idCardFooter: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 6 },
    statusDot: { borderRadius: 5, height: 10, width: 10 },
    idCardStatus: { color: '#9cbdcf', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    idCardSince: { color: '#5d7a8c', fontSize: 11, fontWeight: '600' },
    idCardNote: { color: theme.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  });
}
