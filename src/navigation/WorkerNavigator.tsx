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
import { WorkerEmergencyContactsScreen } from '../screens/worker/WorkerEmergencyContactsScreen';
import { WorkerSafetyChecklistScreen } from '../screens/worker/WorkerSafetyChecklistScreen';
import { WorkerCertificationsScreen } from '../screens/worker/WorkerCertificationsScreen';

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

type MoreSubScreen = 'menu' | 'shift' | 'handover' | 'drill' | 'attendance' | 'incident' | 'emergencyContacts' | 'checklist' | 'certifications';

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

  if (screen === 'shift') return (
    <View style={{ flex: 1 }}>
      <Pressable onPress={() => setScreen('menu')} style={{ padding: 16, paddingBottom: 0 }}>
        <Text style={{ color: '#1f6f5b', fontSize: 14, fontWeight: '800' }}>← Back</Text>
      </Pressable>
      <WorkerShiftScreen session={session} />
    </View>
  );

  if (screen === 'handover') return (
    <View style={{ flex: 1 }}>
      <Pressable onPress={() => setScreen('menu')} style={{ padding: 16, paddingBottom: 0 }}>
        <Text style={{ color: '#1f6f5b', fontSize: 14, fontWeight: '800' }}>← Back</Text>
      </Pressable>
      <WorkerHandoverScreen session={session} />
    </View>
  );

  if (screen === 'drill') return (
    <View style={{ flex: 1 }}>
      <Pressable onPress={() => setScreen('menu')} style={{ padding: 16, paddingBottom: 0 }}>
        <Text style={{ color: '#1f6f5b', fontSize: 14, fontWeight: '800' }}>← Back</Text>
      </Pressable>
      <WorkerDrillScreen session={session} />
    </View>
  );

  if (screen === 'attendance') return (
    <View style={{ flex: 1 }}>
      <Pressable onPress={() => setScreen('menu')} style={{ padding: 16, paddingBottom: 0 }}>
        <Text style={{ color: '#1f6f5b', fontSize: 14, fontWeight: '800' }}>← Back</Text>
      </Pressable>
      <WorkerAttendanceScreen session={session} />
    </View>
  );

  if (screen === 'incident') return (
    <View style={{ flex: 1 }}>
      <Pressable onPress={() => setScreen('menu')} style={{ padding: 16, paddingBottom: 0 }}>
        <Text style={{ color: '#1f6f5b', fontSize: 14, fontWeight: '800' }}>← Back</Text>
      </Pressable>
      <WorkerIncidentScreen session={session} />
    </View>
  );

  if (screen === 'emergencyContacts') return (
    <View style={{ flex: 1 }}>
      <Pressable onPress={() => setScreen('menu')} style={{ padding: 16, paddingBottom: 0 }}>
        <Text style={{ color: '#1f6f5b', fontSize: 14, fontWeight: '800' }}>← Back</Text>
      </Pressable>
      <WorkerEmergencyContactsScreen session={session} />
    </View>
  );

  if (screen === 'checklist') return (
    <View style={{ flex: 1 }}>
      <Pressable onPress={() => setScreen('menu')} style={{ padding: 16, paddingBottom: 0 }}>
        <Text style={{ color: '#1f6f5b', fontSize: 14, fontWeight: '800' }}>← Back</Text>
      </Pressable>
      <WorkerSafetyChecklistScreen session={session} />
    </View>
  );

  if (screen === 'certifications') return (
    <View style={{ flex: 1 }}>
      <Pressable onPress={() => setScreen('menu')} style={{ padding: 16, paddingBottom: 0 }}>
        <Text style={{ color: '#1f6f5b', fontSize: 14, fontWeight: '800' }}>← Back</Text>
      </Pressable>
      <WorkerCertificationsScreen session={session} />
    </View>
  );

  return (
    <MoreScreen
      items={[
        { icon: '📋', label: 'Shift Production', description: 'Log minerals extracted this shift', onPress: () => setScreen('shift') },
        { icon: '🔄', label: 'Shift Handover', description: 'View last 24h summary for handover', onPress: () => setScreen('handover') },
        { icon: '⛏', label: 'Drill Operations', description: 'Step-by-step drill sign-off', onPress: () => setScreen('drill') },
        { icon: '🕐', label: 'Attendance', description: 'Clock in and out of site', onPress: () => setScreen('attendance') },
        { icon: '🚨', label: 'Report Incident', description: 'Log injuries, near misses, equipment damage', onPress: () => setScreen('incident') },
        { icon: '📞', label: 'Emergency Contacts', description: 'Add contacts for supervisors to reach in emergencies', onPress: () => setScreen('emergencyContacts') },
        { icon: '✅', label: 'Safety Checklist', description: 'Complete your shift safety check before starting work', onPress: () => setScreen('checklist') },
        { icon: '🎓', label: 'My Certifications', description: 'View your certifications, expiry dates, and renewal history', onPress: () => setScreen('certifications') },
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
              onGoToEmergencyContacts={() => {
                if (moreSetterRef.current) {
                  moreSetterRef.current('emergencyContacts');
                } else {
                  pendingMoreScreenRef.current = 'emergencyContacts';
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
