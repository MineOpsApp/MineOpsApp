import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import type { AuthSession } from '../types/auth';
import { BuyerListingsScreen } from '../screens/buyer/BuyerListingsScreen';
import { BuyerOffersScreen } from '../screens/buyer/BuyerOffersScreen';
import { BuyerTransactionsScreen } from '../screens/buyer/BuyerTransactionsScreen';

export type BuyerTabParamList = {
  Listings: undefined;
  Offers: undefined;
  Transactions: undefined;
};

const Tab = createBottomTabNavigator<BuyerTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Listings: '🛒',
  Offers: '🤝',
  Transactions: '📦',
};

type Props = { session: AuthSession; onLogout: () => void };

export function BuyerNavigator({ session, onLogout }: Props) {
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
        <Tab.Screen name="Listings" children={() => <BuyerListingsScreen session={session} />} />
        <Tab.Screen name="Offers" children={() => <BuyerOffersScreen session={session} />} />
        <Tab.Screen name="Transactions" children={() => <BuyerTransactionsScreen session={session} />} />
      </Tab.Navigator>
    </View>
  );
}
