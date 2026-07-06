import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import type { AuthSession } from '../types/auth';
import { GovernmentInventoryScreen } from '../screens/government/GovernmentInventoryScreen';
import { GovernmentBulkPurchaseScreen } from '../screens/government/GovernmentBulkPurchaseScreen';
import { GovernmentIllegalReportsScreen } from '../screens/government/GovernmentIllegalReportsScreen';
import { GovernmentPermitsScreen } from '../screens/government/GovernmentPermitsScreen';

export type GovernmentTabParamList = {
  Inventory: undefined;
  'Bulk Buys': undefined;
  Reports: undefined;
  Permits: undefined;
};

const Tab = createBottomTabNavigator<GovernmentTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Inventory: '📊',
  'Bulk Buys': '💰',
  Reports: '🚨',
  Permits: '📋',
};

type Props = { session: AuthSession; onLogout: () => void };

export function GovernmentNavigator({ session, onLogout }: Props) {
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
        <Tab.Screen name="Inventory" component={GovernmentInventoryScreen} />
        <Tab.Screen name="Bulk Buys" component={GovernmentBulkPurchaseScreen} />
        <Tab.Screen name="Reports" component={GovernmentIllegalReportsScreen} />
        <Tab.Screen name="Permits" component={GovernmentPermitsScreen} />
      </Tab.Navigator>
    </View>
  );
}
