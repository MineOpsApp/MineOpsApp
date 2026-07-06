import { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';

import { SafetyHomeScreen } from '../screens/safety/SafetyHomeScreen';
import { SafetyHazardsScreen } from '../screens/safety/SafetyHazardsScreen';
import { SafetyDangerZonesScreen } from '../screens/safety/SafetyDangerZonesScreen';
import { SafetyNoticesScreen } from '../screens/safety/SafetyNoticesScreen';
import { SafetyAuditScreen } from '../screens/safety/SafetyAuditScreen';
import { SupervisorWorkerContactsScreen } from '../screens/supervisor/SupervisorWorkerContactsScreen';
import { WorkerProfileScreen } from '../screens/worker/WorkerProfileScreen';
import { WorkerProfileViewScreen } from '../screens/supervisor/WorkerProfileViewScreen';
import { SupervisorMessagesScreen } from '../screens/supervisor/SupervisorMessagesScreen';
import { SafetyIntelligenceScreen } from '../screens/supervisor/SafetyIntelligenceScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { IllegalMineReportScreen } from '../screens/shared/IllegalMineReportScreen';
import { MoreScreen } from '../components/MoreScreen';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import type { AuthSession } from '../types/auth';

export type SafetyOfficerTabParamList = {
  Home: undefined;
  Hazards: undefined;
  Zones: undefined;
  Notices: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<SafetyOfficerTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Home: '⌂',
  Hazards: '⚠',
  Zones: '🗺',
  Notices: '📢',
  More: '☰',
};

type Props = { session: AuthSession; onLogout: () => void };

function SafetyMoreStack({ session }: { session: AuthSession }) {
  const [screen, setScreen] = useState<'menu' | 'audit' | 'profile' | 'workerContacts' | 'workerProfile' | 'messages' | 'safetyIntelligence' | 'community' | 'search' | 'illegalReport'>('menu');
  const [viewingWorkerEmail, setViewingWorkerEmail] = useState('');

  const backBtn = (
    <Pressable onPress={() => setScreen('menu')} style={{ padding: 16, paddingBottom: 0 }}>
      <Text style={{ color: '#1f6f5b', fontSize: 14, fontWeight: '800' }}>← Back</Text>
    </Pressable>
  );

  if (screen === 'safetyIntelligence') return <View style={{ flex: 1 }}>{backBtn}<SafetyIntelligenceScreen session={session} /></View>;
  if (screen === 'audit') return <View style={{ flex: 1 }}>{backBtn}<SafetyAuditScreen session={session} /></View>;
  if (screen === 'profile') return <View style={{ flex: 1 }}>{backBtn}<WorkerProfileScreen session={session} /></View>;
  if (screen === 'workerContacts') return (
    <View style={{ flex: 1 }}>
      {backBtn}
      <SupervisorWorkerContactsScreen
        session={session}
        onViewProfile={(email) => { setViewingWorkerEmail(email); setScreen('workerProfile'); }}
      />
    </View>
  );
  if (screen === 'workerProfile') return (
    <View style={{ flex: 1 }}>
      <Pressable onPress={() => setScreen('workerContacts')} style={{ padding: 16, paddingBottom: 0 }}>
        <Text style={{ color: '#1f6f5b', fontSize: 14, fontWeight: '800' }}>← Back to Contacts</Text>
      </Pressable>
      <WorkerProfileViewScreen email={viewingWorkerEmail} session={session} />
    </View>
  );
  if (screen === 'messages') return <View style={{ flex: 1 }}>{backBtn}<SupervisorMessagesScreen session={session} /></View>;
  if (screen === 'community') return <View style={{ flex: 1 }}>{backBtn}<CommunityScreen isSupervisor={false} userEmail={session.user.email} /></View>;
  if (screen === 'search') return <View style={{ flex: 1 }}>{backBtn}<SearchScreen session={session} /></View>;
  if (screen === 'illegalReport') return <View style={{ flex: 1 }}>{backBtn}<IllegalMineReportScreen /></View>;

  return (
    <MoreScreen
      items={[
        { icon: '🧠', label: 'Safety Intelligence', description: 'Hotspots, trending hazard types, and recommendations from the last 30 days', onPress: () => setScreen('safetyIntelligence') },
        { icon: '🔍', label: 'Audit Log', description: 'Full tamper-proof activity trail', onPress: () => setScreen('audit') },
        { icon: '📞', label: 'Worker Contacts', description: 'Emergency contacts and profiles for all site personnel', onPress: () => setScreen('workerContacts') },
        { icon: '🪪', label: 'My Profile & ID', description: 'Your digital ID card, profile photo, bio, and account info', onPress: () => setScreen('profile') },
        { icon: '💬', label: 'Worker Messages', description: 'Read and reply to messages from your site workers', onPress: () => setScreen('messages') },
        { icon: '🌐', label: 'Community', description: 'Mine directory, forum, events, and job board', onPress: () => setScreen('community') },
        { icon: '🔍', label: 'Search', description: 'Find hazards, incidents, workers, listings, and forum posts', onPress: () => setScreen('search') },
        { icon: '🚨', label: 'Report Illegal Mining', description: 'Submit a tip about unlicensed mining activity to GoldBod regulators', onPress: () => setScreen('illegalReport') },
      ]}
    />
  );
}

export function SafetyOfficerNavigator({ session, onLogout }: Props) {
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
        <Tab.Screen name="Home" children={() => <SafetyHomeScreen session={session} />} />
        <Tab.Screen name="Hazards" children={() => <SafetyHazardsScreen session={session} />} />
        <Tab.Screen name="Zones" children={() => <SafetyDangerZonesScreen session={session} />} />
        <Tab.Screen name="Notices" children={() => <SafetyNoticesScreen session={session} />} />
        <Tab.Screen name="More" children={() => <SafetyMoreStack session={session} />} />
      </Tab.Navigator>
    </View>
  );
}