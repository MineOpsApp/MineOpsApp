import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

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


type Props = { session: AuthSession; onLogout: () => void };

export function GovernmentNavigator({ session, onLogout }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader session={session} onLogout={onLogout} />
      <Tab.Navigator
        screenOptions={({ route }) => {
          const ICON_MAP: Record<string, [string, string]> = {
            Inventory: ['bar-chart', 'bar-chart-outline'],
            'Bulk Buys': ['cash', 'cash-outline'],
            Reports: ['flag', 'flag-outline'],
            Permits: ['document-text', 'document-text-outline'],
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
        <Tab.Screen name="Inventory" component={GovernmentInventoryScreen} />
        <Tab.Screen name="Bulk Buys" component={GovernmentBulkPurchaseScreen} />
        <Tab.Screen name="Reports" component={GovernmentIllegalReportsScreen} />
        <Tab.Screen name="Permits" component={GovernmentPermitsScreen} />
      </Tab.Navigator>
    </View>
  );
}
