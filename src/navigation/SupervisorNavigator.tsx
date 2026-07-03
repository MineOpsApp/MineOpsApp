import { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';

import { SupervisorHomeScreen } from '../screens/supervisor/SupervisorHomeScreen';
import { SupervisorHazardsScreen } from '../screens/supervisor/SupervisorHazardsScreen';
import { SupervisorSosScreen } from '../screens/supervisor/SupervisorSosScreen';
import { SupervisorNoticesScreen } from '../screens/supervisor/SupervisorNoticesScreen';
import { SupervisorShiftScreen } from '../screens/supervisor/SupervisorShiftScreen';
import { SupervisorAuditScreen } from '../screens/supervisor/SupervisorAuditScreen';
import { MoreScreen } from '../components/MoreScreen';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import { SupervisorRosterScreen } from '../screens/supervisor/SupervisorRosterScreen';
import { SupervisorBlastScreen } from '../screens/supervisor/SupervisorBlastScreen';
import { SupervisorEquipmentRegistryScreen } from '../screens/supervisor/SupervisorEquipmentRegistryScreen';

import { SupervisorDrillScreen } from '../screens/supervisor/SupervisorDrillScreen';
import { SupervisorGuestScreen } from '../screens/supervisor/SupervisorGuestScreen';
import { SupervisorIncidentScreen } from '../screens/supervisor/SupervisorIncidentScreen';
import { SupervisorResetPasswordScreen } from '../screens/supervisor/SupervisorResetPasswordScreen';
import { SupervisorPendingApprovalsScreen } from '../screens/supervisor/SupervisorPendingApprovalsScreen';
import { SupervisorWorkerContactsScreen } from '../screens/supervisor/SupervisorWorkerContactsScreen';
import { SupervisorSafetyChecklistScreen } from '../screens/supervisor/SupervisorSafetyChecklistScreen';
import { SupervisorFirstAidKitScreen } from '../screens/supervisor/SupervisorFirstAidKitScreen';
import { SupervisorMineralInventoryScreen } from '../screens/supervisor/SupervisorMineralInventoryScreen';
import { SupervisorCertificationsScreen } from '../screens/supervisor/SupervisorCertificationsScreen';
import { WorkerProfileScreen } from '../screens/worker/WorkerProfileScreen';
import { WorkerProfileViewScreen } from '../screens/supervisor/WorkerProfileViewScreen';
import { SupervisorMessagesScreen } from '../screens/supervisor/SupervisorMessagesScreen';
import { SupervisorAnnouncementsScreen } from '../screens/supervisor/SupervisorAnnouncementsScreen';
import { SupervisorPayRunsScreen } from '../screens/supervisor/SupervisorPayRunsScreen';
import { SupervisorGuestCodesScreen } from '../screens/supervisor/SupervisorGuestCodesScreen';
import { SupervisorSiteMapScreen } from '../screens/supervisor/SupervisorSiteMapScreen';
import type { AuthSession } from '../types/auth';

export type SupervisorTabParamList = {
  Home: undefined;
  Hazards: undefined;
  SOS: undefined;
  Notices: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<SupervisorTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Home: '⌂',
  Hazards: '⚠',
  SOS: '🚨',
  Notices: '📢',
  More: '☰',
};

type Props = { session: AuthSession; onLogout: () => void };

function SupervisorMoreStack({ session }: { session: AuthSession }) {
  const [screen, setScreen] = useState<'menu' | 'shifts' | 'audit' | 'drills' | 'guests' | 'guestCodes' | 'siteMap' | 'roster' | 'blast' | 'reset' | 'incidents' | 'equipment' | 'approvals' | 'workerContacts' | 'checklist' | 'firstAid' | 'mineralInventory' | 'certifications' | 'profile' | 'workerProfile' | 'messages' | 'announcements' | 'payRuns'>('menu');
  const [viewingWorkerEmail, setViewingWorkerEmail] = useState('');

  const backBtn = (
    <Pressable onPress={() => setScreen('menu')} style={{ padding: 16, paddingBottom: 0 }}>
      <Text style={{ color: '#1f6f5b', fontSize: 14, fontWeight: '800' }}>← Back</Text>
    </Pressable>
  );

  if (screen === 'shifts') return <View style={{ flex: 1 }}>{backBtn}<SupervisorShiftScreen session={session} /></View>;
  if (screen === 'audit') return <View style={{ flex: 1 }}>{backBtn}<SupervisorAuditScreen session={session} /></View>;
  if (screen === 'drills') return <View style={{ flex: 1 }}>{backBtn}<SupervisorDrillScreen session={session} /></View>;
  if (screen === 'guests') return <View style={{ flex: 1 }}>{backBtn}<SupervisorGuestScreen session={session} /></View>;
  if (screen === 'roster') return <View style={{ flex: 1 }}>{backBtn}<SupervisorRosterScreen session={session} /></View>;
  if (screen === 'blast') return <View style={{ flex: 1 }}>{backBtn}<SupervisorBlastScreen session={session} /></View>;
  if (screen === 'incidents') return <View style={{ flex: 1 }}>{backBtn}<SupervisorIncidentScreen session={session} /></View>;
  if (screen === 'reset') return <View style={{ flex: 1 }}>{backBtn}<SupervisorResetPasswordScreen session={session} /></View>;
  if (screen === 'equipment') return <View style={{ flex: 1 }}>{backBtn}<SupervisorEquipmentRegistryScreen session={session} /></View>;
  if (screen === 'approvals') return <View style={{ flex: 1 }}>{backBtn}<SupervisorPendingApprovalsScreen session={session} /></View>;
  if (screen === 'workerContacts') return (
    <View style={{ flex: 1 }}>
      {backBtn}
      <SupervisorWorkerContactsScreen
        session={session}
        onViewProfile={(email) => { setViewingWorkerEmail(email); setScreen('workerProfile'); }}
      />
    </View>
  );
  if (screen === 'checklist') return <View style={{ flex: 1 }}>{backBtn}<SupervisorSafetyChecklistScreen session={session} /></View>;
  if (screen === 'firstAid') return <View style={{ flex: 1 }}>{backBtn}<SupervisorFirstAidKitScreen session={session} /></View>;
  if (screen === 'mineralInventory') return <View style={{ flex: 1 }}>{backBtn}<SupervisorMineralInventoryScreen session={session} /></View>;
  if (screen === 'certifications') return <View style={{ flex: 1 }}>{backBtn}<SupervisorCertificationsScreen session={session} /></View>;
  if (screen === 'profile') return <View style={{ flex: 1 }}>{backBtn}<WorkerProfileScreen session={session} /></View>;
  if (screen === 'workerProfile') return (
    <View style={{ flex: 1 }}>
      <Pressable onPress={() => setScreen('workerContacts')} style={{ padding: 16, paddingBottom: 0 }}>
        <Text style={{ color: '#1f6f5b', fontSize: 14, fontWeight: '800' }}>← Back to Contacts</Text>
      </Pressable>
      <WorkerProfileViewScreen email={viewingWorkerEmail} session={session} />
    </View>
  );
  if (screen === 'messages') return (
    <View style={{ flex: 1 }}>
      {backBtn}
      <SupervisorMessagesScreen session={session} />
    </View>
  );
  if (screen === 'announcements') return <View style={{ flex: 1 }}>{backBtn}<SupervisorAnnouncementsScreen session={session} /></View>;
  if (screen === 'payRuns') return <View style={{ flex: 1 }}>{backBtn}<SupervisorPayRunsScreen session={session} /></View>;
  if (screen === 'guestCodes') return <View style={{ flex: 1 }}>{backBtn}<SupervisorGuestCodesScreen session={session} /></View>;
  if (screen === 'siteMap') return <View style={{ flex: 1 }}>{backBtn}<SupervisorSiteMapScreen session={session} /></View>;
  return (
    <MoreScreen
      items={[
        { icon: '📋', label: 'Shift Logs', description: 'View all site shift production logs', onPress: () => setScreen('shifts') },
        { icon: '🔍', label: 'Audit Log', description: 'Full tamper-proof activity trail', onPress: () => setScreen('audit') },
        { icon: '⛏', label: 'Drill Operations', description: 'Active and completed drill sign-offs', onPress: () => setScreen('drills') },
        { icon: '👤', label: 'Guest Access', description: 'Create and manage guest accounts', onPress: () => setScreen('guests') },
        { icon: '👷', label: 'Site Roster', description: 'Live headcount — who is on site now', onPress: () => setScreen('roster') },
        { icon: '💥', label: 'Blast Management', description: 'Schedule and notify blast operations', onPress: () => setScreen('blast') },
        { icon: '🚨', label: 'Incident Reports', description: 'View and manage site incident reports', onPress: () => setScreen('incidents') },
        { icon: '🔑', label: 'Reset Password', description: 'Generate temporary password for locked out worker', onPress: () => setScreen('reset') },
        { icon: '🔧', label: 'Equipment Registry', description: 'Manage site equipment list and status', onPress: () => setScreen('equipment') },
        { icon: '✅', label: 'Worker Approvals', description: 'Approve or reject new worker registrations', onPress: () => setScreen('approvals') },
        { icon: '📞', label: 'Worker Contacts', description: 'Emergency contacts for all site personnel', onPress: () => setScreen('workerContacts') },
        { icon: '✅', label: 'Safety Checklists', description: "Today's shift checklist — who has and hasn't submitted", onPress: () => setScreen('checklist') },
        { icon: '🩺', label: 'First Aid Kits', description: 'Per-zone kit inventory and weekly check status', onPress: () => setScreen('firstAid') },
        { icon: '⛏', label: 'Mineral Inventory', description: 'Live stock totals and transaction history from approved shift logs', onPress: () => setScreen('mineralInventory') },
        { icon: '🎓', label: 'Certifications', description: 'Track worker certifications, expiry dates, and renewal history', onPress: () => setScreen('certifications') },
        { icon: '🪪', label: 'My Profile & ID', description: 'Your digital ID card, profile photo, bio, and account info', onPress: () => setScreen('profile') },
        { icon: '💬', label: 'Worker Messages', description: 'Read and reply to messages from your site workers', onPress: () => setScreen('messages') },
        { icon: '📢', label: 'Announcements', description: 'Broadcast a quick update to all workers on site', onPress: () => setScreen('announcements') },
        { icon: '💰', label: 'Pay Runs', description: 'Generate, approve, and disburse worker pay cycles', onPress: () => setScreen('payRuns') },
        { icon: '🎟', label: 'Guest Codes', description: 'Generate QR / PIN codes for site visitors and inspectors', onPress: () => setScreen('guestCodes') },
        { icon: '🗺', label: 'Site Map', description: 'Upload the site floor plan for the interactive zone map', onPress: () => setScreen('siteMap') },
      ]}
    />
  );
}

export function SupervisorNavigator({ session, onLogout }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader session={session} onLogout={onLogout} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.textMuted,
          tabBarStyle: { backgroundColor: theme.tabBar, borderTopColor: theme.tabBarBorder, borderTopWidth: 1, height: 64, paddingBottom: 10, paddingTop: 6 },
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 10, fontWeight: '800' }}>{route.name}</Text>
          ),
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>{TAB_ICONS[route.name]}</Text>
          ),
        })}
      >
        <Tab.Screen name="Home" children={() => <SupervisorHomeScreen session={session} />} />
        <Tab.Screen name="Hazards" children={() => <SupervisorHazardsScreen session={session} />} />
        <Tab.Screen name="SOS" children={() => <SupervisorSosScreen session={session} />} />
        <Tab.Screen name="Notices" children={() => <SupervisorNoticesScreen session={session} />} />
        <Tab.Screen name="More" children={() => <SupervisorMoreStack session={session} />} />
      </Tab.Navigator>
    </View>
  );
}