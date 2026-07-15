import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { SwipeBackView } from './SwipeBackView';

import { WorkerProfileScreen } from '../screens/worker/WorkerProfileScreen';
import { WorkerEmergencyContactsScreen } from '../screens/worker/WorkerEmergencyContactsScreen';
import { WorkerPayScreen } from '../screens/worker/WorkerPayScreen';
import { WorkerCertificationsScreen } from '../screens/worker/WorkerCertificationsScreen';
import { BuyerProfileScreen } from '../screens/buyer/BuyerProfileScreen';
import { ActiveSessionsScreen } from '../screens/shared/ActiveSessionsScreen';
import { ChangePasswordScreen } from '../screens/shared/ChangePasswordScreen';
import { NotificationPreferencesScreen } from '../screens/shared/NotificationPreferencesScreen';
import { DataPrivacyScreen } from '../screens/shared/DataPrivacyScreen';
import { HelpSupportScreen } from '../screens/shared/HelpSupportScreen';
import { TermsOfServiceScreen } from '../screens/legal/TermsOfServiceScreen';
import { PrivacyPolicyScreen } from '../screens/legal/PrivacyPolicyScreen';
import { getMyProfile, type UserProfile } from '../services/api';
import { useTheme, spacing, typography, type Theme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import type { AuthSession } from '../types/auth';

type Screen = 'menu' | 'profile' | 'emergencyContacts' | 'pay' | 'certifications' | 'buyerProfile' | 'sessions' | 'changePassword' | 'notifications' | 'terms' | 'privacy' | 'dataPrivacy' | 'help';

type IconSpec =
  | { lib: 'ionicons'; name: ComponentProps<typeof Ionicons>['name'] }
  | { lib: 'material'; name: ComponentProps<typeof MaterialCommunityIcons>['name'] };

type ProfileItem = { icon: IconSpec; label: string; description: string; onPress: () => void };

function RowIcon({ icon, color }: { icon: IconSpec; color: string }) {
  if (icon.lib === 'ionicons') return <Ionicons name={icon.name} size={20} color={color} />;
  return <MaterialCommunityIcons name={icon.name as ComponentProps<typeof MaterialCommunityIcons>['name']} size={20} color={color} />;
}

type Props = {
  visible: boolean;
  session: AuthSession;
  onClose: () => void;
  onLogout: () => void;
};

export function ProfileHubModal({ visible, session, onClose, onLogout }: Props) {
  const [screen, setScreen] = useState<Screen>('menu');
  const { mode, setMode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);
  const role = session.user.role;

  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (visible) {
      getMyProfile().then(setProfile).catch(() => {});
    }
  }, [visible]);

  const themeLabel = mode === 'dark' ? 'Dark' : mode === 'light' ? 'Light' : 'Auto';
  const themeIconName: ComponentProps<typeof Ionicons>['name'] =
    mode === 'dark' ? 'moon' : mode === 'light' ? 'sunny' : 'settings-outline';

  function cycleTheme() {
    if (mode === 'system') setMode('light');
    else if (mode === 'light') setMode('dark');
    else setMode('system');
  }

  function handleClose() {
    setScreen('menu');
    onClose();
  }

  const initials = session.user.fullName.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  const backBtn = (
    <Pressable onPress={() => setScreen('menu')} style={styles.backBtn}>
      <Text style={styles.backBtnText}>← Back</Text>
    </Pressable>
  );

  if (screen === 'profile') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>
          <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<WorkerProfileScreen session={session} /></SwipeBackView>
        </SafeAreaView>
      </Modal>
    );
  }
  if (screen === 'emergencyContacts') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>
          <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<WorkerEmergencyContactsScreen session={session} /></SwipeBackView>
        </SafeAreaView>
      </Modal>
    );
  }
  if (screen === 'pay') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>
          <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<WorkerPayScreen session={session} /></SwipeBackView>
        </SafeAreaView>
      </Modal>
    );
  }
  if (screen === 'certifications') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>
          <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<WorkerCertificationsScreen session={session} /></SwipeBackView>
        </SafeAreaView>
      </Modal>
    );
  }
  if (screen === 'buyerProfile') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>
          <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<BuyerProfileScreen session={session} /></SwipeBackView>
        </SafeAreaView>
      </Modal>
    );
  }
  if (screen === 'sessions') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>
          <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<ActiveSessionsScreen /></SwipeBackView>
        </SafeAreaView>
      </Modal>
    );
  }
  if (screen === 'changePassword') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>
          <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<ChangePasswordScreen onDone={() => setScreen('menu')} /></SwipeBackView>
        </SafeAreaView>
      </Modal>
    );
  }
  if (screen === 'notifications') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>
          <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<NotificationPreferencesScreen /></SwipeBackView>
        </SafeAreaView>
      </Modal>
    );
  }
  if (screen === 'terms') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>
          <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<TermsOfServiceScreen /></SwipeBackView>
        </SafeAreaView>
      </Modal>
    );
  }
  if (screen === 'privacy') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>
          <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<PrivacyPolicyScreen /></SwipeBackView>
        </SafeAreaView>
      </Modal>
    );
  }
  if (screen === 'dataPrivacy') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>
          <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<DataPrivacyScreen onAccountDeleted={() => { handleClose(); onLogout(); }} /></SwipeBackView>
        </SafeAreaView>
      </Modal>
    );
  }
  if (screen === 'help') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>
          <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<HelpSupportScreen /></SwipeBackView>
        </SafeAreaView>
      </Modal>
    );
  }

  const profileItems: ProfileItem[] = [];
  if (role === 'worker') {
    profileItems.push(
      { icon: { lib: 'ionicons', name: 'card-outline' },           label: 'My Profile & ID',      description: 'Digital ID card, photo, bio, and account info',              onPress: () => setScreen('profile') },
      { icon: { lib: 'ionicons', name: 'call-outline' },           label: 'Emergency Contacts',   description: 'Contacts for supervisors to reach in emergencies',            onPress: () => setScreen('emergencyContacts') },
      { icon: { lib: 'ionicons', name: 'cash-outline' },           label: 'My Pay',               description: 'Pay history and MoMo disbursement details',                  onPress: () => setScreen('pay') },
      { icon: { lib: 'material', name: 'certificate-outline' },    label: 'My Certifications',    description: 'Certifications, expiry dates, and renewal history',           onPress: () => setScreen('certifications') },
    );
  } else if (role === 'supervisor' || role === 'safetyOfficer') {
    profileItems.push(
      { icon: { lib: 'ionicons', name: 'card-outline' },           label: 'My Profile & ID',      description: 'Digital ID card, profile photo, bio, and account info',       onPress: () => setScreen('profile') },
    );
  } else if (role === 'buyer') {
    profileItems.push(
      { icon: { lib: 'ionicons', name: 'card-outline' },           label: 'My Profile',           description: 'Account details, business info, and verification status',     onPress: () => setScreen('buyerProfile') },
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Account</Text>
          <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.avatarCard}>
            <View style={styles.avatar}>
              {profile?.profilePhoto
                ? <Image source={{ uri: profile.profilePhoto }} style={styles.avatarImage} />
                : <Text style={styles.avatarInitials}>{initials}</Text>}
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.avatarName}>{session.user.fullName}</Text>
              {session.user.assignedSite ? <Text style={styles.avatarSite}>{session.user.assignedSite}</Text> : null}
            </View>
          </View>

          {profileItems.length > 0 && (
            <View style={[styles.list, { marginBottom: spacing.xxl }]}>
              {profileItems.map((item, i) => (
                <Pressable
                  key={item.label}
                  onPress={item.onPress}
                  style={[styles.row, i < profileItems.length - 1 && styles.rowBorder]}
                >
                  <View style={styles.iconWrap}><RowIcon icon={item.icon} color={theme.accent} /></View>
                  <View style={styles.body}>
                    <Text style={styles.label}>{item.label}</Text>
                    <Text style={styles.desc}>{item.description}</Text>
                  </View>
                  <Text style={styles.arrow}>›</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={styles.sectionLabel}>SETTINGS</Text>
          <View style={styles.list}>
            <Pressable onPress={() => setScreen('help')} style={[styles.row, styles.rowBorder]}>
              <View style={styles.iconWrap}><Ionicons name="help-circle-outline" size={20} color={theme.accent} /></View>
              <View style={styles.body}>
                <Text style={styles.label}>Help & Support</Text>
                <Text style={styles.desc}>Common questions about using MineOps</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
            <Pressable onPress={() => setScreen('sessions')} style={[styles.row, styles.rowBorder]}>
              <View style={styles.iconWrap}><Ionicons name="phone-portrait-outline" size={20} color={theme.accent} /></View>
              <View style={styles.body}>
                <Text style={styles.label}>Active Sessions</Text>
                <Text style={styles.desc}>Manage devices signed in to your account</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
            <Pressable onPress={() => setScreen('changePassword')} style={[styles.row, styles.rowBorder]}>
              <View style={styles.iconWrap}><Ionicons name="key-outline" size={20} color={theme.accent} /></View>
              <View style={styles.body}>
                <Text style={styles.label}>Change Password</Text>
                <Text style={styles.desc}>Update your account password</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
            <Pressable onPress={() => setScreen('notifications')} style={[styles.row, styles.rowBorder]}>
              <View style={styles.iconWrap}><Ionicons name="notifications-outline" size={20} color={theme.accent} /></View>
              <View style={styles.body}>
                <Text style={styles.label}>Notifications</Text>
                <Text style={styles.desc}>Choose which alerts you receive</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
            <Pressable onPress={cycleTheme} style={[styles.row, styles.rowBorder]}>
              <View style={styles.iconWrap}><Ionicons name={themeIconName} size={20} color={theme.accent} /></View>
              <View style={styles.body}>
                <Text style={styles.label}>Display Mode</Text>
                <Text style={styles.desc}>Tap to cycle: Auto → Light → Dark</Text>
              </View>
              <View style={styles.chip}><Text style={styles.chipText}>{themeLabel}</Text></View>
            </Pressable>
            <Pressable onPress={() => setScreen('terms')} style={[styles.row, styles.rowBorder]}>
              <View style={styles.iconWrap}><Ionicons name="document-text-outline" size={20} color={theme.accent} /></View>
              <View style={styles.body}>
                <Text style={styles.label}>Terms of Service</Text>
                <Text style={styles.desc}>Read the terms governing your use of MineOps</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
            <Pressable onPress={() => setScreen('privacy')} style={[styles.row, styles.rowBorder]}>
              <View style={styles.iconWrap}><Ionicons name="lock-closed-outline" size={20} color={theme.accent} /></View>
              <View style={styles.body}>
                <Text style={styles.label}>Privacy Policy</Text>
                <Text style={styles.desc}>See how your data is collected and used</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
            <Pressable onPress={() => setScreen('dataPrivacy')} style={[styles.row, styles.rowBorder]}>
              <View style={styles.iconWrap}><Ionicons name="trash-outline" size={20} color={theme.accent} /></View>
              <View style={styles.body}>
                <Text style={styles.label}>Data & Privacy</Text>
                <Text style={styles.desc}>Export your data or delete your account</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
            <Pressable onPress={() => { handleClose(); onLogout(); }} style={styles.row}>
              <View style={styles.iconWrap}><Ionicons name="log-out-outline" size={20} color={theme.danger} /></View>
              <View style={styles.body}>
                <Text style={[styles.label, styles.signOutLabel]}>Sign Out</Text>
                <Text style={styles.desc}>End your current session</Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
    safe: { backgroundColor: theme.bg, flex: 1 },
    header: {
      alignItems: 'center',
      backgroundColor: theme.bgHero,
      borderBottomColor: 'rgba(255,255,255,0.08)',
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    headerTitle: { ...typography.h2, color: '#ffffff' },
    closeBtn: { padding: spacing.xs },
    content: { padding: spacing.xl, paddingBottom: 40 },
    avatarCard: {
      alignItems: 'center',
      backgroundColor: theme.bgCard,
      borderRadius: 16,
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.xxl,
      padding: spacing.lg,
      ...cardShadow,
    },
    avatar: {
      alignItems: 'center',
      backgroundColor: theme.bgHero,
      borderColor: theme.accent,
      borderRadius: 28,
      borderWidth: 2,
      height: 56,
      justifyContent: 'center',
      overflow: 'hidden',
      width: 56,
    },
    avatarImage: { borderRadius: 28, height: 56, width: 56 },
    avatarInitials: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
    avatarInfo: { flex: 1 },
    avatarName: { ...typography.h3, color: theme.text, marginBottom: 3 },
    avatarSite: { ...typography.caption, color: theme.textMuted },
    sectionLabel: { ...typography.label, color: theme.textMuted, marginBottom: spacing.sm, marginLeft: spacing.xs },
    list: {
      backgroundColor: theme.bgCard,
      borderRadius: 12,
      overflow: 'hidden',
      ...cardShadow,
    },
    row: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    rowBorder: { borderBottomColor: theme.bgInput, borderBottomWidth: 1 },
    iconWrap: { alignItems: 'center', backgroundColor: theme.bgInput, borderRadius: 10, height: 40, justifyContent: 'center', marginRight: spacing.md, width: 40 },
    body: { flex: 1 },
    label: { ...typography.bodyBold, color: theme.text, marginBottom: 2 },
    signOutLabel: { color: theme.danger },
    desc: { ...typography.caption, color: theme.textMuted },
    arrow: { color: theme.textMuted, fontSize: 22 },
    chip: { backgroundColor: theme.bgInput, borderRadius: 8, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs },
    chipText: { ...typography.label, color: theme.textSub },
    backBtn: { padding: spacing.lg, paddingBottom: spacing.sm },
    backBtnText: { ...typography.bodyBold, color: theme.accent },
  });
}
