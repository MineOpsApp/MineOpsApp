import { useEffect, useRef, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';

import { WorkerHomeScreen } from '../screens/worker/WorkerHomeScreen';
import { WorkerHazardsScreen } from '../screens/worker/WorkerHazardsScreen';
import { WorkerEquipmentScreen } from '../screens/worker/WorkerEquipmentScreen';
import { WorkerNoticesScreen } from '../screens/worker/WorkerNoticesScreen';
import { WorkerShiftScreen } from '../screens/worker/WorkerShiftScreen';
import { WorkerHandoverScreen } from '../screens/worker/WorkerHandoverScreen';
import { MoreScreen } from '../components/MoreScreen';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import { WorkerDrillScreen } from '../screens/worker/WorkerDrillScreen';
import { WorkerAttendanceScreen } from '../screens/worker/WorkerAttendanceScreen';
import { WorkerIncidentScreen } from '../screens/worker/WorkerIncidentScreen';
import { WorkerSafetyChecklistScreen } from '../screens/worker/WorkerSafetyChecklistScreen';
import { WorkerMessagesScreen } from '../screens/worker/WorkerMessagesScreen';
import { WorkerLoneWorkerScreen } from '../screens/worker/WorkerLoneWorkerScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { IllegalMineReportScreen } from '../screens/shared/IllegalMineReportScreen';

import type { AuthSession } from '../types/auth';

export type WorkerTabParamList = {
  Home: undefined;
  Hazards: undefined;
  Equipment: undefined;
  Notices: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<WorkerTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Home: '⌂',
  Hazards: '⚠',
  Equipment: '⚙',
  Notices: '📢',
  More: '☰',
};

type MoreSubScreen = 'menu' | 'shift' | 'handover' | 'drill' | 'attendance' | 'incident' | 'checklist' | 'messages' | 'loneWorker' | 'community' | 'search' | 'illegalReport';

type Props = { session: AuthSession; onLogout: () => void };

function WorkerMoreStack({
  session,
  pendingRef,
  onRegisterSetter,
}: {
  session: AuthSession;
  pendingRef: React.MutableRefObject<MoreSubScreen | null>;
  onRegisterSetter: (setter: (s: MoreSubScreen) => void) => void;
}) {
  const [screen, setScreen] = useState<MoreSubScreen>(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    return pending ?? 'menu';
  });

  useEffect(() => {
    onRegisterSetter(setScreen);
  }, [onRegisterSetter]);

  const backBtn = (
    <Pressable onPress={() => setScreen('menu')} style={{ padding: 16, paddingBottom: 0 }}>
      <Text style={{ color: '#1f6f5b', fontSize: 14, fontWeight: '800' }}>← Back</Text>
    </Pressable>
  );

  if (screen === 'shift') return <View style={{ flex: 1 }}>{backBtn}<WorkerShiftScreen session={session} /></View>;
  if (screen === 'handover') return <View style={{ flex: 1 }}>{backBtn}<WorkerHandoverScreen session={session} /></View>;
  if (screen === 'drill') return <View style={{ flex: 1 }}>{backBtn}<WorkerDrillScreen session={session} /></View>;
  if (screen === 'attendance') return <View style={{ flex: 1 }}>{backBtn}<WorkerAttendanceScreen session={session} /></View>;
  if (screen === 'incident') return <View style={{ flex: 1 }}>{backBtn}<WorkerIncidentScreen session={session} /></View>;
  if (screen === 'checklist') return <View style={{ flex: 1 }}>{backBtn}<WorkerSafetyChecklistScreen session={session} /></View>;
  if (screen === 'messages') return <View style={{ flex: 1 }}>{backBtn}<WorkerMessagesScreen session={session} /></View>;
  if (screen === 'loneWorker') return <View style={{ flex: 1 }}>{backBtn}<WorkerLoneWorkerScreen /></View>;
  if (screen === 'community') return <View style={{ flex: 1 }}>{backBtn}<CommunityScreen isSupervisor={false} userEmail={session.user.email} /></View>;
  if (screen === 'search') return <View style={{ flex: 1 }}>{backBtn}<SearchScreen session={session} /></View>;
  if (screen === 'illegalReport') return <View style={{ flex: 1 }}>{backBtn}<IllegalMineReportScreen /></View>;

  return (
    <MoreScreen
      sections={[
        {
          title: 'Work & Shifts',
          items: [
            { icon: '📋', label: 'Shift Production', description: 'Log minerals extracted this shift', onPress: () => setScreen('shift') },
            { icon: '🔄', label: 'Shift Handover', description: 'View last 24h summary for handover', onPress: () => setScreen('handover') },
            { icon: '⛏', label: 'Drill Operations', description: 'Step-by-step drill sign-off', onPress: () => setScreen('drill') },
            { icon: '🕐', label: 'Attendance', description: 'Clock in and out of site', onPress: () => setScreen('attendance') },
          ],
        },
        {
          title: 'Safety',
          items: [
            { icon: '🚨', label: 'Report Incident', description: 'Log injuries, near misses, equipment damage', onPress: () => setScreen('incident') },
            { icon: '✅', label: 'Safety Checklist', description: 'Complete your shift safety check before starting work', onPress: () => setScreen('checklist') },
            { icon: '🛡', label: 'Lone Worker', description: 'Enable check-in timer when working alone or underground', onPress: () => setScreen('loneWorker') },
            { icon: '🚨', label: 'Report Illegal Mining', description: 'Submit a tip about unlicensed mining activity to GoldBod regulators', onPress: () => setScreen('illegalReport') },
          ],
        },
        {
          title: 'Connect',
          items: [
            { icon: '💬', label: 'Message Supervisor', description: 'Send a quick message to your site supervisor', onPress: () => setScreen('messages') },
            { icon: '🌐', label: 'Community', description: 'Mine directory, forum, events, and job board', onPress: () => setScreen('community') },
          ],
        },
      ]}
    />
  );
}

export function WorkerNavigator({ session, onLogout }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const moreSetterRef = useRef<((s: MoreSubScreen) => void) | null>(null);
  const pendingMoreScreenRef = useRef<MoreSubScreen | null>(null);

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
            <WorkerHomeScreen
              session={session}
              onGoToLoneWorker={() => {
                if (moreSetterRef.current) {
                  moreSetterRef.current('loneWorker');
                } else {
                  pendingMoreScreenRef.current = 'loneWorker';
                }
                navigation.navigate('More');
              }}
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
        <Tab.Screen name="Hazards" children={() => <WorkerHazardsScreen session={session} />} />
        <Tab.Screen name="Equipment" children={() => <WorkerEquipmentScreen session={session} />} />
        <Tab.Screen name="Notices" children={() => <WorkerNoticesScreen session={session} />} />
        <Tab.Screen name="More">
          {() => (
            <WorkerMoreStack
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
