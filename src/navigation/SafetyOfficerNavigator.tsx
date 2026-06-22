import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

import { SafetyHomeScreen } from '../screens/safety/SafetyHomeScreen';
import { SafetyHazardsScreen } from '../screens/safety/SafetyHazardsScreen';
import { SafetyDangerZonesScreen } from '../screens/safety/SafetyDangerZonesScreen';
import { SafetyNoticesScreen } from '../screens/safety/SafetyNoticesScreen';
import { SafetyAuditScreen } from '../screens/safety/SafetyAuditScreen';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import type { AuthSession } from '../types/auth';

export type SafetyOfficerTabParamList = {
  Home: undefined;
  Hazards: undefined;
  Zones: undefined;
  Notices: undefined;
  Audit: undefined;
};

const Tab = createBottomTabNavigator<SafetyOfficerTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Home: '⌂',
  Hazards: '⚠',
  Zones: '🗺',
  Notices: '📢',
  Audit: '🔍',
};

type SafetyOfficerNavigatorProps = {
  session: AuthSession;
  onLogout: () => void;
};

export function SafetyOfficerNavigator({ session, onLogout }: SafetyOfficerNavigatorProps) {
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
        <Tab.Screen name="Home" children={() => <SafetyHomeScreen session={session} />} />
        <Tab.Screen name="Hazards" children={() => <SafetyHazardsScreen session={session} />} />
        <Tab.Screen name="Zones" children={() => <SafetyDangerZonesScreen session={session} />} />
        <Tab.Screen name="Notices" children={() => <SafetyNoticesScreen session={session} />} />
        <Tab.Screen name="Audit" children={() => <SafetyAuditScreen session={session} />} />
      </Tab.Navigator>
    </View>
  );
}