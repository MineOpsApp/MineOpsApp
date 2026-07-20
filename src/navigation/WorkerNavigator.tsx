import { useEffect, useRef, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { SwipeBackView } from '../components/SwipeBackView';

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
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const [screen, setScreen] = useState<MoreSubScreen>(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    return pending ?? 'menu';
  });

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

  const subScreen =
    screen === 'shift' ? <WorkerShiftScreen session={session} /> :
    screen === 'handover' ? <WorkerHandoverScreen session={session} /> :
    screen === 'drill' ? <WorkerDrillScreen session={session} /> :
    screen === 'attendance' ? <WorkerAttendanceScreen session={session} /> :
    screen === 'incident' ? <WorkerIncidentScreen session={session} /> :
    screen === 'checklist' ? <WorkerSafetyChecklistScreen session={session} /> :
    screen === 'messages' ? <WorkerMessagesScreen session={session} /> :
    screen === 'loneWorker' ? <WorkerLoneWorkerScreen /> :
    screen === 'community' ? <CommunityScreen isSupervisor={false} userEmail={session.user.email} /> :
    screen === 'search' ? <SearchScreen session={session} /> :
    screen === 'illegalReport' ? <IllegalMineReportScreen /> :
    null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ flex: 1, display: screen === 'menu' ? 'flex' : 'none' }}>
        <MoreScreen
          sections={[
        {
          title: 'Work & Shifts',
          items: [
            { icon: { lib: 'ionicons', name: 'clipboard' }, label: 'Shift Production', description: 'Log minerals extracted this shift', onPress: () => setScreen('shift') },
            { icon: { lib: 'ionicons', name: 'sync' }, label: 'Shift Handover', description: 'View last 24h summary for handover', onPress: () => setScreen('handover') },
            { icon: { lib: 'material', name: 'pickaxe' }, label: 'Drill Operations', description: 'Step-by-step drill sign-off', onPress: () => setScreen('drill') },
            { icon: { lib: 'ionicons', name: 'time' }, label: 'Attendance', description: 'Clock in and out of site', onPress: () => setScreen('attendance') },
          ],
        },
        {
          title: 'Safety',
          items: [
            { icon: { lib: 'ionicons', name: 'alert-circle' }, label: 'Report Incident', description: 'Log injuries, near misses, equipment damage', onPress: () => setScreen('incident') },
            { icon: { lib: 'ionicons', name: 'checkmark-circle' }, label: 'Safety Checklist', description: 'Complete your shift safety check before starting work', onPress: () => setScreen('checklist') },
            { icon: { lib: 'material', name: 'shield-account' }, label: 'Lone Worker', description: 'Enable check-in timer when working alone or underground', onPress: () => setScreen('loneWorker') },
            { icon: { lib: 'ionicons', name: 'alert-circle' }, label: 'Report Illegal Mining', description: 'Submit a tip about unlicensed mining activity to GoldBod regulators', onPress: () => setScreen('illegalReport') },
          ],
        },
        {
          title: 'Connect',
          items: [
            { icon: { lib: 'ionicons', name: 'chatbubbles' }, label: 'Message Supervisor', description: 'Send a quick message to your site supervisor', onPress: () => setScreen('messages') },
            { icon: { lib: 'ionicons', name: 'globe' }, label: 'Community', description: 'Mine directory, forum, events, and job board', onPress: () => setScreen('community') },
          ],
        },
      ]}
        />
      </View>
      {subScreen !== null && (
        <View style={{ flex: 1 }}>
          <SwipeBackView onBack={() => setScreen('menu')}>
            <View style={{ flex: 1, backgroundColor: theme.bg }}>
              {backBtn}
              {subScreen}
            </View>
          </SwipeBackView>
        </View>
      )}
    </View>
  );
}

export function WorkerNavigator({ session, onLogout }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const moreSetterRef = useRef<((s: MoreSubScreen) => void) | null>(null);
  const pendingMoreScreenRef = useRef<MoreSubScreen | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader session={session} onLogout={onLogout} />
      <Tab.Navigator
        screenOptions={({ route }) => {
          const ICON_MAP: Record<string, [string, string]> = {
            Home: ['home', 'home-outline'],
            Hazards: ['warning', 'warning-outline'],
            Equipment: ['construct', 'construct-outline'],
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
