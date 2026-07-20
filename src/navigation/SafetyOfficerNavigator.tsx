import { useEffect, useRef, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { SwipeBackView } from '../components/SwipeBackView';

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
import { SupervisorRosterScreen } from '../screens/supervisor/SupervisorRosterScreen';
import { SupervisorBlastScreen } from '../screens/supervisor/SupervisorBlastScreen';
import { SupervisorEquipmentRegistryScreen } from '../screens/supervisor/SupervisorEquipmentRegistryScreen';
import { SupervisorDrillScreen } from '../screens/supervisor/SupervisorDrillScreen';
import { SupervisorSafetyChecklistScreen } from '../screens/supervisor/SupervisorSafetyChecklistScreen';
import { SupervisorFirstAidKitScreen } from '../screens/supervisor/SupervisorFirstAidKitScreen';
import { SafetyLoneWorkerScreen } from '../screens/safety/SafetyLoneWorkerScreen';
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


type SafetyMoreSubScreen = 'menu' | 'audit' | 'incidents' | 'safetyIntelligence' | 'workerContacts' | 'workerProfile' | 'messages' | 'community' | 'search' | 'illegalReport' | 'reset' | 'roster' | 'blast' | 'equipment' | 'drills' | 'checklist' | 'firstAid' | 'loneWorker';

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
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
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
    <Pressable
      onPress={() => setScreen('menu')}
      style={{ alignItems: 'center', alignSelf: 'flex-start', backgroundColor: `${theme.accent}14`, borderRadius: 20, flexDirection: 'row', gap: 4, margin: 16, marginBottom: 0, paddingHorizontal: 12, paddingVertical: 6 }}
    >
      <Ionicons name="chevron-back" size={16} color={theme.accent} />
      <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '800' }}>Back</Text>
    </Pressable>
  );

  if (screen === 'incidents') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorIncidentScreen session={session} /></SwipeBackView>;
  if (screen === 'safetyIntelligence') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SafetyIntelligenceScreen session={session} /></SwipeBackView>;
  if (screen === 'audit') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SafetyAuditScreen session={session} /></SwipeBackView>;
  if (screen === 'reset') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorResetPasswordScreen session={session} /></SwipeBackView>;
  if (screen === 'workerContacts') return (
    <SwipeBackView onBack={() => setScreen('menu')}>
      {backBtn}
      <SupervisorWorkerContactsScreen
        session={session}
        onViewProfile={(email) => { setViewingWorkerEmail(email); setScreen('workerProfile'); }}
      />
    </SwipeBackView>
  );
  if (screen === 'workerProfile') return (
    <SwipeBackView onBack={() => setScreen('workerContacts')}>
      <Pressable
        onPress={() => setScreen('workerContacts')}
        style={{ alignItems: 'center', alignSelf: 'flex-start', backgroundColor: `${theme.accent}14`, borderRadius: 20, flexDirection: 'row', gap: 4, margin: 16, marginBottom: 0, paddingHorizontal: 12, paddingVertical: 6 }}
      >
        <Ionicons name="chevron-back" size={16} color={theme.accent} />
        <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '800' }}>Contacts</Text>
      </Pressable>
      <WorkerProfileViewScreen email={viewingWorkerEmail} session={session} />
    </SwipeBackView>
  );
  if (screen === 'messages') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorMessagesScreen session={session} /></SwipeBackView>;
  if (screen === 'community') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<CommunityScreen isSupervisor={false} userEmail={session.user.email} /></SwipeBackView>;
  if (screen === 'search') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SearchScreen session={session} /></SwipeBackView>;
  if (screen === 'illegalReport') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<IllegalMineReportScreen /></SwipeBackView>;
  if (screen === 'roster') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorRosterScreen session={session} /></SwipeBackView>;
  if (screen === 'blast') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorBlastScreen session={session} /></SwipeBackView>;
  if (screen === 'equipment') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorEquipmentRegistryScreen session={session} /></SwipeBackView>;
  if (screen === 'drills') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorDrillScreen session={session} /></SwipeBackView>;
  if (screen === 'checklist') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorSafetyChecklistScreen session={session} /></SwipeBackView>;
  if (screen === 'firstAid') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorFirstAidKitScreen session={session} /></SwipeBackView>;
  if (screen === 'loneWorker') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SafetyLoneWorkerScreen session={session} /></SwipeBackView>;

  return (
    <MoreScreen
      sections={[
        {
          title: 'Safety Ops',
          items: [
            { icon: '🧠', label: 'Safety Intelligence', description: 'Hotspots, trending hazard types, and recommendations from the last 30 days', onPress: () => setScreen('safetyIntelligence') },
            { icon: '🚑', label: 'Incident Reports', description: 'Review, investigate, and close incident reports for your site', onPress: () => setScreen('incidents') },
            { icon: '✅', label: 'Safety Checklists', description: "Today's shift checklist — who has and hasn't submitted", onPress: () => setScreen('checklist') },
            { icon: '🩺', label: 'First Aid Kits', description: 'Per-zone kit inventory and weekly check status', onPress: () => setScreen('firstAid') },
            { icon: '🛡', label: 'Lone Worker Monitoring', description: 'Live view of workers using the lone worker check-in timer', onPress: () => setScreen('loneWorker') },
            { icon: '🔍', label: 'Audit Log', description: 'Full tamper-proof activity trail', onPress: () => setScreen('audit') },
          ],
        },
        {
          title: 'Team',
          items: [
            { icon: '👷', label: 'Site Roster', description: 'Live headcount — who is on site now', onPress: () => setScreen('roster') },
            { icon: '📞', label: 'Worker Contacts', description: 'Emergency contacts and profiles for all site personnel', onPress: () => setScreen('workerContacts') },
            { icon: '💬', label: 'Worker Messages', description: 'Read and reply to messages from your site workers', onPress: () => setScreen('messages') },
            { icon: '🔑', label: 'Reset Password', description: 'Generate temporary password for a locked out worker', onPress: () => setScreen('reset') },
          ],
        },
        {
          title: 'Site Operations',
          items: [
            { icon: '🔧', label: 'Equipment Registry', description: 'Manage site equipment list and status', onPress: () => setScreen('equipment') },
            { icon: '⛏', label: 'Drill Operations', description: 'Active and completed drill sign-offs', onPress: () => setScreen('drills') },
            { icon: '💥', label: 'Blast Management', description: 'Schedule and notify blast operations', onPress: () => setScreen('blast') },
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
  const isDark = mode === 'dark';
  const moreSetterRef = useRef<((s: SafetyMoreSubScreen) => void) | null>(null);
  const pendingMoreScreenRef = useRef<SafetyMoreSubScreen | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader session={session} onLogout={onLogout} />
      <Tab.Navigator
        screenOptions={({ route }) => {
          const ICON_MAP: Record<string, [string, string]> = {
            Home: ['home', 'home-outline'],
            Hazards: ['warning', 'warning-outline'],
            Zones: ['map', 'map-outline'],
            Notices: ['megaphone', 'megaphone-outline'],
            More: ['grid', 'grid-outline'],
          };
          const [active, inactive] = ICON_MAP[route.name] ?? ['ellipse', 'ellipse-outline'];
          return {
            headerShown: false,
            tabBarActiveTintColor: theme.accent,
            tabBarInactiveTintColor: theme.textMuted,
            tabBarStyle: { backgroundColor: theme.tabBar, borderTopWidth: 0, elevation: 8, height: 64, paddingBottom: 10, paddingTop: 6, shadowColor: '#000', shadowOffset: { width: 0, height: -1 }, shadowOpacity: isDark ? 0.2 : 0.06, shadowRadius: 4 },
            tabBarLabel: ({ color }) => (
              <Text style={{ color, fontSize: 10, fontWeight: '800' }}>{route.name}</Text>
            ),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={(focused ? active : inactive) as ComponentProps<typeof Ionicons>['name']} size={22} color={color} />
            ),
          };
        }}
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
