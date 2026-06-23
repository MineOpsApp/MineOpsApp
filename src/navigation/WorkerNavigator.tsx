import { useState } from 'react';
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

type Props = { session: AuthSession; onLogout: () => void };

function WorkerMoreStack({ session }: { session: AuthSession }) {
  const [screen, setScreen] = useState<'menu' | 'shift' | 'handover' | 'drill'>('menu');
  console.log('screens:', { WorkerShiftScreen, WorkerHandoverScreen, WorkerDrillScreen, MoreScreen });

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

  return (
    <MoreScreen
      items={[
        { icon: '📋', label: 'Shift Production', description: 'Log minerals extracted this shift', onPress: () => setScreen('shift') },
        { icon: '🔄', label: 'Shift Handover', description: 'View last 24h summary for handover', onPress: () => setScreen('handover') },
        { icon: '⛏', label: 'Drill Operations', description: 'Step-by-step drill sign-off', onPress: () => setScreen('drill') },
      ]}
    />
  );
}


export function WorkerNavigator({ session, onLogout }: Props) {
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
        <Tab.Screen name="Home" children={() => <WorkerHomeScreen session={session} />} />
        <Tab.Screen name="Hazards" children={() => <WorkerHazardsScreen session={session} />} />
        <Tab.Screen name="Equipment" children={() => <WorkerEquipmentScreen session={session} />} />
        <Tab.Screen name="Notices" children={() => <WorkerNoticesScreen session={session} />} />
        <Tab.Screen name="More" children={() => <WorkerMoreStack session={session} />} />
      </Tab.Navigator>
    </View>
  );
}