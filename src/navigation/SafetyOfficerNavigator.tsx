import { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';

import { SafetyHomeScreen } from '../screens/safety/SafetyHomeScreen';
import { SafetyHazardsScreen } from '../screens/safety/SafetyHazardsScreen';
import { SafetyDangerZonesScreen } from '../screens/safety/SafetyDangerZonesScreen';
import { SafetyNoticesScreen } from '../screens/safety/SafetyNoticesScreen';
import { SafetyAuditScreen } from '../screens/safety/SafetyAuditScreen';
import { MarketScreen } from '../screens/supervisor/MarketScreen';
import { MoreScreen } from '../components/MoreScreen';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import type { AuthSession } from '../types/auth';

export type SafetyOfficerTabParamList = {
  Home: undefined;
  Hazards: undefined;
  Zones: undefined;
  Notices: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<SafetyOfficerTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Home: '⌂',
  Hazards: '⚠',
  Zones: '🗺',
  Notices: '📢',
  More: '☰',
};

type Props = { session: AuthSession; onLogout: () => void };

function SafetyMoreStack({ session }: { session: AuthSession }) {
  const [screen, setScreen] = useState<'menu' | 'market' | 'audit'>('menu');

  const backBtn = (
    <Pressable onPress={() => setScreen('menu')} style={{ padding: 16, paddingBottom: 0 }}>
      <Text style={{ color: '#1f6f5b', fontSize: 14, fontWeight: '800' }}>← Back</Text>
    </Pressable>
  );

  if (screen === 'market') return <View style={{ flex: 1 }}>{backBtn}<MarketScreen session={session} /></View>;
  if (screen === 'audit') return <View style={{ flex: 1 }}>{backBtn}<SafetyAuditScreen session={session} /></View>;

  return (
    <MoreScreen
      items={[
        { icon: '📈', label: 'Market Prices', description: 'Live commodity prices', onPress: () => setScreen('market') },
        { icon: '🔍', label: 'Audit Log', description: 'Full tamper-proof activity trail', onPress: () => setScreen('audit') },
      ]}
    />
  );
}

export function SafetyOfficerNavigator({ session, onLogout }: Props) {
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
        <Tab.Screen name="Home" children={() => <SafetyHomeScreen session={session} />} />
        <Tab.Screen name="Hazards" children={() => <SafetyHazardsScreen session={session} />} />
        <Tab.Screen name="Zones" children={() => <SafetyDangerZonesScreen session={session} />} />
        <Tab.Screen name="Notices" children={() => <SafetyNoticesScreen session={session} />} />
        <Tab.Screen name="More" children={() => <SafetyMoreStack session={session} />} />
      </Tab.Navigator>
    </View>
  );
}