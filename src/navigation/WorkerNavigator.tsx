import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

import { WorkerHomeScreen } from '../screens/worker/WorkerHomeScreen';
import { WorkerHazardsScreen } from '../screens/worker/WorkerHazardsScreen';
import { WorkerEquipmentScreen } from '../screens/worker/WorkerEquipmentScreen';
import { WorkerShiftScreen } from '../screens/worker/WorkerShiftScreen';
import { WorkerNoticesScreen } from '../screens/worker/WorkerNoticesScreen';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import type { AuthSession } from '../types/auth';

export type WorkerTabParamList = {
  Home: undefined;
  Hazards: undefined;
  Equipment: undefined;
  Shift: undefined;
  Notices: undefined;
};

const Tab = createBottomTabNavigator<WorkerTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Home: '⌂',
  Hazards: '⚠',
  Equipment: '⚙',
  Shift: '📋',
  Notices: '📢',
};

type WorkerNavigatorProps = {
  session: AuthSession;
  onLogout: () => void;
};

export function WorkerNavigator({ session, onLogout }: WorkerNavigatorProps) {
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
          tabBarStyle: {
            backgroundColor: theme.tabBar,
            borderTopColor: theme.tabBarBorder,
            borderTopWidth: 1,
            height: 64,
            paddingBottom: 10,
            paddingTop: 6,
          },
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
        <Tab.Screen name="Shift" children={() => <WorkerShiftScreen session={session} />} />
        <Tab.Screen name="Notices" children={() => <WorkerNoticesScreen session={session} />} />
      </Tab.Navigator>
    </View>
  );
}
