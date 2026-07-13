import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WorkerProfileScreen } from '../screens/worker/WorkerProfileScreen';
import { WorkerEmergencyContactsScreen } from '../screens/worker/WorkerEmergencyContactsScreen';
import { WorkerPayScreen } from '../screens/worker/WorkerPayScreen';
import { WorkerCertificationsScreen } from '../screens/worker/WorkerCertificationsScreen';
import { BuyerProfileScreen } from '../screens/buyer/BuyerProfileScreen';
import { ActiveSessionsScreen } from '../screens/shared/ActiveSessionsScreen';
import { NotificationPreferencesScreen } from '../screens/shared/NotificationPreferencesScreen';
import { DataPrivacyScreen } from '../screens/shared/DataPrivacyScreen';
import { HelpSupportScreen } from '../screens/shared/HelpSupportScreen';
import { TermsOfServiceScreen } from '../screens/legal/TermsOfServiceScreen';
import { PrivacyPolicyScreen } from '../screens/legal/PrivacyPolicyScreen';
import { useTheme, type Theme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import type { AuthSession } from '../types/auth';

type Screen = 'menu' | 'profile' | 'emergencyContacts' | 'pay' | 'certifications' | 'buyerProfile' | 'sessions' | 'notifications' | 'terms' | 'privacy' | 'dataPrivacy' | 'help';

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
  const styles = makeStyles(theme);
  const role = session.user.role;

  const themeLabel = mode === 'dark' ? 'Dark' : mode === 'light' ? 'Light' : 'Auto';
  const themeIcon = mode === 'dark' ? '🌙' : mode === 'light' ? '☀️' : '⚙️';

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
        <SafeAreaView style={styles.safe}>{backBtn}<WorkerProfileScreen session={session} /></SafeAreaView>
      </Modal>
    );
  }
  if (screen === 'emergencyContacts') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>{backBtn}<WorkerEmergencyContactsScreen session={session} /></SafeAreaView>
      </Modal>
    );
  }
  if (screen === 'pay') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>{backBtn}<WorkerPayScreen session={session} /></SafeAreaView>
      </Modal>
    );
  }
  if (screen === 'certifications') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>{backBtn}<WorkerCertificationsScreen session={session} /></SafeAreaView>
      </Modal>
    );
  }
  if (screen === 'buyerProfile') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>{backBtn}<BuyerProfileScreen session={session} /></SafeAreaView>
      </Modal>
    );
  }
  if (screen === 'sessions') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>{backBtn}<ActiveSessionsScreen /></SafeAreaView>
      </Modal>
    );
  }
  if (screen === 'notifications') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>{backBtn}<NotificationPreferencesScreen /></SafeAreaView>
      </Modal>
    );
  }
  if (screen === 'terms') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>{backBtn}<TermsOfServiceScreen /></SafeAreaView>
      </Modal>
    );
  }
  if (screen === 'privacy') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>{backBtn}<PrivacyPolicyScreen /></SafeAreaView>
      </Modal>
    );
  }
  if (screen === 'dataPrivacy') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>{backBtn}<DataPrivacyScreen onAccountDeleted={() => { handleClose(); onLogout(); }} /></SafeAreaView>
      </Modal>
    );
  }
  if (screen === 'help') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safe}>{backBtn}<HelpSupportScreen /></SafeAreaView>
      </Modal>
    );
  }

  const profileItems: Array<{ icon: string; label: string; description: string; onPress: () => void }> = [];
  if (role === 'worker') {
    profileItems.push(
      { icon: '🪪', label: 'My Profile & ID', description: 'Digital ID card, photo, bio, and account info', onPress: () => setScreen('profile') },
      { icon: '📞', label: 'Emergency Contacts', description: 'Contacts for supervisors to reach in emergencies', onPress: () => setScreen('emergencyContacts') },
      { icon: '💰', label: 'My Pay', description: 'Pay history and MoMo disbursement details', onPress: () => setScreen('pay') },
      { icon: '🎓', label: 'My Certifications', description: 'Certifications, expiry dates, and renewal history', onPress: () => setScreen('certifications') },
    );
  } else if (role === 'supervisor' || role === 'safetyOfficer') {
    profileItems.push(
      { icon: '🪪', label: 'My Profile & ID', description: 'Digital ID card, profile photo, bio, and account info', onPress: () => setScreen('profile') },
    );
  } else if (role === 'buyer') {
    profileItems.push(
      { icon: '🪪', label: 'My Profile', description: 'Account details, business info, and verification status', onPress: () => setScreen('buyerProfile') },
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Account</Text>
          <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={12}>
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.avatarCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.avatarName}>{session.user.fullName}</Text>
              {session.user.assignedSite ? <Text style={styles.avatarSite}>{session.user.assignedSite}</Text> : null}
            </View>
          </View>

          {profileItems.length > 0 && (
            <View style={[styles.list, { marginBottom: 24 }]}>
              {profileItems.map((item, i) => (
                <Pressable
                  key={item.label}
                  onPress={item.onPress}
                  style={[styles.row, i < profileItems.length - 1 && styles.rowBorder]}
                >
                  <View style={styles.iconWrap}><Text style={styles.icon}>{item.icon}</Text></View>
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
              <View style={styles.iconWrap}><Text style={styles.icon}>❓</Text></View>
              <View style={styles.body}>
                <Text style={styles.label}>Help & Support</Text>
                <Text style={styles.desc}>Common questions about using MineOps</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
            <Pressable onPress={() => setScreen('sessions')} style={[styles.row, styles.rowBorder]}>
              <View style={styles.iconWrap}><Text style={styles.icon}>🔐</Text></View>
              <View style={styles.body}>
                <Text style={styles.label}>Active Sessions</Text>
                <Text style={styles.desc}>Manage devices signed in to your account</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
            <Pressable onPress={() => setScreen('notifications')} style={[styles.row, styles.rowBorder]}>
              <View style={styles.iconWrap}><Text style={styles.icon}>🔔</Text></View>
              <View style={styles.body}>
                <Text style={styles.label}>Notifications</Text>
                <Text style={styles.desc}>Choose which alerts you receive</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
            <Pressable onPress={cycleTheme} style={[styles.row, styles.rowBorder]}>
              <View style={styles.iconWrap}><Text style={styles.icon}>{themeIcon}</Text></View>
              <View style={styles.body}>
                <Text style={styles.label}>Display Mode</Text>
                <Text style={styles.desc}>Tap to cycle: Auto → Light → Dark</Text>
              </View>
              <View style={styles.chip}><Text style={styles.chipText}>{themeLabel}</Text></View>
            </Pressable>
            <Pressable onPress={() => setScreen('terms')} style={[styles.row, styles.rowBorder]}>
              <View style={styles.iconWrap}><Text style={styles.icon}>📜</Text></View>
              <View style={styles.body}>
                <Text style={styles.label}>Terms of Service</Text>
                <Text style={styles.desc}>Read the terms governing your use of MineOps</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
            <Pressable onPress={() => setScreen('privacy')} style={[styles.row, styles.rowBorder]}>
              <View style={styles.iconWrap}><Text style={styles.icon}>🔏</Text></View>
              <View style={styles.body}>
                <Text style={styles.label}>Privacy Policy</Text>
                <Text style={styles.desc}>See how your data is collected and used</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
            <Pressable onPress={() => setScreen('dataPrivacy')} style={[styles.row, styles.rowBorder]}>
              <View style={styles.iconWrap}><Text style={styles.icon}>🗑️</Text></View>
              <View style={styles.body}>
                <Text style={styles.label}>Data & Privacy</Text>
                <Text style={styles.desc}>Export your data or delete your account</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
            <Pressable onPress={() => { handleClose(); onLogout(); }} style={styles.row}>
              <View style={styles.iconWrap}><Text style={styles.icon}>↩</Text></View>
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

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { backgroundColor: theme.bg, flex: 1 },
    header: {
      alignItems: 'center',
      backgroundColor: theme.bgHero,
      borderBottomColor: 'rgba(255,255,255,0.08)',
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
    closeBtn: { padding: 4 },
    closeIcon: { color: 'rgba(255,255,255,0.6)', fontSize: 18, fontWeight: '700' },
    content: { padding: 20, paddingBottom: 40 },
    avatarCard: {
      alignItems: 'center',
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 14,
      marginBottom: 24,
      padding: 18,
    },
    avatar: { alignItems: 'center', backgroundColor: theme.bgHero, borderRadius: 24, height: 48, justifyContent: 'center', width: 48 },
    avatarInitials: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
    avatarInfo: { flex: 1 },
    avatarName: { color: theme.text, fontSize: 16, fontWeight: '900', marginBottom: 3 },
    avatarSite: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
    sectionLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
    list: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
    row: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14 },
    rowBorder: { borderBottomColor: theme.bgInput, borderBottomWidth: 1 },
    iconWrap: { alignItems: 'center', backgroundColor: theme.bgInput, borderRadius: 10, height: 40, justifyContent: 'center', marginRight: 14, width: 40 },
    icon: { fontSize: 20 },
    body: { flex: 1 },
    label: { color: theme.text, fontSize: 15, fontWeight: '800', marginBottom: 2 },
    signOutLabel: { color: theme.danger },
    desc: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
    arrow: { color: theme.textMuted, fontSize: 22 },
    chip: { backgroundColor: theme.bgInput, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    chipText: { color: theme.textSub, fontSize: 12, fontWeight: '800' },
    backBtn: { padding: 16, paddingBottom: 8 },
    backBtnText: { color: theme.accent, fontSize: 14, fontWeight: '800' },
  });
}
