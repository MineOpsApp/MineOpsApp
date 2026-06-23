import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

import { SupervisorHomeScreen } from '../screens/supervisor/SupervisorHomeScreen';
import { SupervisorHazardsScreen } from '../screens/supervisor/SupervisorHazardsScreen';
import { SupervisorSosScreen } from '../screens/supervisor/SupervisorSosScreen';
import { SupervisorNoticesScreen } from '../screens/supervisor/SupervisorNoticesScreen';
import { SupervisorShiftScreen } from '../screens/supervisor/SupervisorShiftScreen';
import { SupervisorAuditScreen } from '../screens/supervisor/SupervisorAuditScreen';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import { MarketScreen } from '../screens/supervisor/MarketScreen';
import type { AuthSession } from '../types/auth';

export type SupervisorTabParamList = {
  Home: undefined;
  Hazards: undefined;
  SOS: undefined;
  Notices: undefined;
  Shifts: undefined;
  Audit: undefined;
  Market: undefined;
};

const Tab = createBottomTabNavigator<SupervisorTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Home: '⌂',
  Hazards: '⚠',
  SOS: '🚨',
  Notices: '📢',
  Shifts: '📋',
  Audit: '🔍',
  Market: '📈',
};

type SupervisorNavigatorProps = {
  session: AuthSession;
  onLogout: () => void;
};

export function SupervisorNavigator({ session, onLogout }: SupervisorNavigatorProps) {
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
            <Text style={{ color, fontSize: 18 }}>{TAB_ICONS[route.name]}</Text>
          ),
        })}
      >
        <Tab.Screen name="Home" children={() => <SupervisorHomeScreen session={session} />} />
        <Tab.Screen name="Hazards" children={() => <SupervisorHazardsScreen session={session} />} />
        <Tab.Screen name="SOS" children={() => <SupervisorSosScreen session={session} />} />
        <Tab.Screen name="Notices" children={() => <SupervisorNoticesScreen session={session} />} />
        <Tab.Screen name="Shifts" children={() => <SupervisorShiftScreen session={session} />} />
        <Tab.Screen name="Market" children={() => <MarketScreen session={session} />} />
        <Tab.Screen name="Audit" children={() => <SupervisorAuditScreen session={session} />} />
      </Tab.Navigator>
    </View>
  );
}