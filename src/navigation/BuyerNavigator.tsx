import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import type { AuthSession } from '../types/auth';
import { BuyerListingsScreen } from '../screens/buyer/BuyerListingsScreen';
import { BuyerOffersScreen } from '../screens/buyer/BuyerOffersScreen';
import { BuyerTransactionsScreen } from '../screens/buyer/BuyerTransactionsScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { IllegalMineReportScreen } from '../screens/shared/IllegalMineReportScreen';

export type BuyerTabParamList = {
  Listings: undefined;
  Offers: undefined;
  Transactions: undefined;
  Community: undefined;
  Search: undefined;
  Report: undefined;
};

const Tab = createBottomTabNavigator<BuyerTabParamList>();


type Props = { session: AuthSession; onLogout: () => void };

export function BuyerNavigator({ session, onLogout }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader session={session} onLogout={onLogout} />
      <Tab.Navigator
        screenOptions={({ route }) => {
          const ICON_MAP: Record<string, [string, string]> = {
            Listings: ['storefront', 'storefront-outline'],
            Offers: ['pricetag', 'pricetag-outline'],
            Transactions: ['cube', 'cube-outline'],
            Community: ['people', 'people-outline'],
            Search: ['search', 'search-outline'],
            Report: ['alert-circle', 'alert-circle-outline'],
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
        <Tab.Screen name="Listings" children={() => <BuyerListingsScreen session={session} />} />
        <Tab.Screen name="Offers" children={() => <BuyerOffersScreen session={session} />} />
        <Tab.Screen name="Transactions" children={() => <BuyerTransactionsScreen session={session} />} />
        <Tab.Screen name="Community" children={() => <CommunityScreen isSupervisor={false} userEmail={session.user.email} />} />
        <Tab.Screen name="Search" children={() => <SearchScreen session={session} />} />
        <Tab.Screen name="Report" component={IllegalMineReportScreen} />
      </Tab.Navigator>
    </View>
  );
}
