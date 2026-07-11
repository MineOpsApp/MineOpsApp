import { useEffect, useRef, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';

import { SafetyHomeScreen } from '../screens/safety/SafetyHomeScreen';
import { SafetyHazardsScreen } from '../screens/safety/SafetyHazardsScreen';
import { SafetyDangerZonesScreen } from '../screens/safety/SafetyDangerZonesScreen';
import { SafetyNoticesScreen } from '../screens/safety/SafetyNoticesScreen';
import { SafetyAuditScreen } from '../screens/safety/SafetyAuditScreen';
import { SupervisorWorkerContactsScreen } from '../screens/supervisor/SupervisorWorkerContactsScreen';
import { WorkerProfileViewScreen } from '../screens/supervisor/WorkerProfileViewScreen';
import { SupervisorMessagesScreen } from '../screens/supervisor/SupervisorMessagesScreen';
import { SupervisorIncidentScreen } from '../screens/supervisor/SupervisorIncidentScreen';
import { SupervisorResetPasswordScreen } from '../screens/supervisor/SupervisorResetPasswordScreen';
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

type SafetyMoreSubScreen = 'menu' | 'audit' | 'incidents' | 'safetyIntelligence' | 'workerContacts' | 'workerProfile' | 'messages' | 'community' | 'search' | 'illegalReport' | 'reset';

type Props = { session: AuthSession; onLogout: () => void };

function SafetyMoreStack({
  session,
  pendingRef,
  onRegisterSetter,
}: {
  session: AuthSession;
  pendingRef: React.MutableRefObject<SafetyMoreSubScreen | null>;
  onRegisterSetter: (setter: (s: SafetyMoreSubScreen) => void) => void;
}) {
  const [screen, setScreen] = useState<SafetyMoreSubScreen>(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    return pending ?? 'menu';
  });
  const [viewingWorkerEmail, setViewingWorkerEmail] = useState('');

  useEffect(() => {
    onRegisterSetter(setScreen);
  }, [onRegisterSetter]);

  const backBtn = (
    <Pressable onPress={() => setScreen('menu')} style={{ padding: 16, paddingBottom: 0 }}>
      <Text style={{ color: '#1f6f5b', fontSize: 14, fontWeight: '800' }}>← Back</Text>
    </Pressable>
  );

  if (screen === 'incidents') return <View style={{ flex: 1 }}>{backBtn}<SupervisorIncidentScreen session={session} /></View>;
  if (screen === 'safetyIntelligence') return <View style={{ flex: 1 }}>{backBtn}<SafetyIntelligenceScreen session={session} /></View>;
  if (screen === 'audit') return <View style={{ flex: 1 }}>{backBtn}<SafetyAuditScreen session={session} /></View>;
  if (screen === 'reset') return <View style={{ flex: 1 }}>{backBtn}<SupervisorResetPasswordScreen session={session} /></View>;
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
      sections={[
        {
          title: 'Safety Ops',
          items: [
            { icon: '🧠', label: 'Safety Intelligence', description: 'Hotspots, trending hazard types, and recommendations from the last 30 days', onPress: () => setScreen('safetyIntelligence') },
            { icon: '🚑', label: 'Incident Reports', description: 'Review, investigate, and close incident reports for your site', onPress: () => setScreen('incidents') },
            { icon: '🔍', label: 'Audit Log', description: 'Full tamper-proof activity trail', onPress: () => setScreen('audit') },
          ],
        },
        {
          title: 'Team',
          items: [
            { icon: '📞', label: 'Worker Contacts', description: 'Emergency contacts and profiles for all site personnel', onPress: () => setScreen('workerContacts') },
            { icon: '💬', label: 'Worker Messages', description: 'Read and reply to messages from your site workers', onPress: () => setScreen('messages') },
            { icon: '🔑', label: 'Reset Password', description: 'Generate temporary password for a locked out worker', onPress: () => setScreen('reset') },
          ],
        },
        {
          title: 'Connect',
          items: [
            { icon: '🌐', label: 'Community', description: 'Mine directory, forum, events, and job board', onPress: () => setScreen('community') },
            { icon: '🚨', label: 'Report Illegal Mining', description: 'Submit a tip about unlicensed mining activity to GoldBod regulators', onPress: () => setScreen('illegalReport') },
          ],
        },
      ]}
    />
  );
}

export function SafetyOfficerNavigator({ session, onLogout }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const moreSetterRef = useRef<((s: SafetyMoreSubScreen) => void) | null>(null);
  const pendingMoreScreenRef = useRef<SafetyMoreSubScreen | null>(null);

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
        <Tab.Screen name="Home">
          {({ navigation }) => (
            <SafetyHomeScreen
              session={session}
              onGoToSearch={() => {
                if (moreSetterRef.current) {
                  moreSetterRef.current('search');
                } else {
                  pendingMoreScreenRef.current = 'search';
                }
                navigation.navigate('More');
              }}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Hazards" children={() => <SafetyHazardsScreen session={session} />} />
        <Tab.Screen name="Zones" children={() => <SafetyDangerZonesScreen session={session} />} />
        <Tab.Screen name="Notices" children={() => <SafetyNoticesScreen session={session} />} />
        <Tab.Screen name="More">
          {() => (
            <SafetyMoreStack
              session={session}
              pendingRef={pendingMoreScreenRef}
              onRegisterSetter={(setter) => { moreSetterRef.current = setter; }}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
  );
}
