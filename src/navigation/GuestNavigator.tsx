import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { GuestHomeScreen } from '../screens/guest/GuestHomeScreen';
import { GuestNoticesScreen } from '../screens/guest/GuestNoticesScreen';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import type { AuthSession } from '../types/auth';

export type GuestSubRole = 'visitor';

export type GuestTabParamList = {
  Home: undefined;
  Notices: undefined;
};

const Tab = createBottomTabNavigator<GuestTabParamList>();

const TAB_ICON_NAMES: Record<string, { outline: string; solid: string }> = {
  Home: { outline: 'home-outline', solid: 'home' },
  Notices: { outline: 'megaphone-outline', solid: 'megaphone' },
};

type GuestNavigatorProps = {
  session: AuthSession;
  onLogout: () => void;
};

export function GuestNavigator({ session, onLogout }: GuestNavigatorProps) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader session={session} onLogout={onLogout} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.textMuted,
          tabBarStyle: { backgroundColor: theme.tabBar, borderTopWidth: 0, elevation: 8, height: 64, paddingBottom: 10, paddingTop: 6, shadowColor: '#000', shadowOffset: { width: 0, height: -1 }, shadowOpacity: isDark ? 0.2 : 0.06, shadowRadius: 4 },
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 10, fontWeight: '800' }}>{route.name}</Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={(focused ? TAB_ICON_NAMES[route.name].solid : TAB_ICON_NAMES[route.name].outline) as any}
              size={22}
              color={color}
            />
          ),
        })}
      >
        <Tab.Screen name="Home" children={() => <GuestHomeScreen session={session} />} />
        <Tab.Screen name="Notices" children={() => <GuestNoticesScreen session={session} />} />
      </Tab.Navigator>
    </View>
  );
}
