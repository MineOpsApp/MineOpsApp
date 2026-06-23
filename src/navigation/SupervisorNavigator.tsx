import { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';

import { SupervisorHomeScreen } from '../screens/supervisor/SupervisorHomeScreen';
import { SupervisorHazardsScreen } from '../screens/supervisor/SupervisorHazardsScreen';
import { SupervisorSosScreen } from '../screens/supervisor/SupervisorSosScreen';
import { SupervisorNoticesScreen } from '../screens/supervisor/SupervisorNoticesScreen';
import { SupervisorShiftScreen } from '../screens/supervisor/SupervisorShiftScreen';
import { SupervisorAuditScreen } from '../screens/supervisor/SupervisorAuditScreen';
import { MarketScreen } from '../screens/supervisor/MarketScreen';
import { MoreScreen } from '../components/MoreScreen';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import { SupervisorDrillScreen } from '../screens/supervisor/SupervisorDrillScreen';

import type { AuthSession } from '../types/auth';

export type SupervisorTabParamList = {
  Home: undefined;
  Hazards: undefined;
  SOS: undefined;
  Notices: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<SupervisorTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Home: '⌂',
  Hazards: '⚠',
  SOS: '🚨',
  Notices: '📢',
  More: '☰',
};

type Props = { session: AuthSession; onLogout: () => void };

function SupervisorMoreStack({ session }: { session: AuthSession }) {
  const [screen, setScreen] = useState<'menu' | 'shifts' | 'market' | 'audit' | 'drills'>('menu');

  const backBtn = (
    <Pressable onPress={() => setScreen('menu')} style={{ padding: 16, paddingBottom: 0 }}>
      <Text style={{ color: '#1f6f5b', fontSize: 14, fontWeight: '800' }}>← Back</Text>
    </Pressable>
  );

  if (screen === 'shifts') return <View style={{ flex: 1 }}>{backBtn}<SupervisorShiftScreen session={session} /></View>;
  if (screen === 'market') return <View style={{ flex: 1 }}>{backBtn}<MarketScreen session={session} /></View>;
  if (screen === 'audit') return <View style={{ flex: 1 }}>{backBtn}<SupervisorAuditScreen session={session} /></View>;
  if (screen === 'drills') return <View style={{ flex: 1 }}>{backBtn}<SupervisorDrillScreen session={session} /></View>;

  return (
    <MoreScreen
      items={[
        { icon: '📋', label: 'Shift Logs', description: 'View all site shift production logs', onPress: () => setScreen('shifts') },
        { icon: '📈', label: 'Market Prices', description: 'Live commodity prices', onPress: () => setScreen('market') },
        { icon: '🔍', label: 'Audit Log', description: 'Full tamper-proof activity trail', onPress: () => setScreen('audit') },
        { icon: '⛏', label: 'Drill Operations', description: 'Active and completed drill sign-offs', onPress: () => setScreen('drills') },
      ]}
    />
  );
}

export function SupervisorNavigator({ session, onLogout }: Props) {
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
        <Tab.Screen name="Home" children={() => <SupervisorHomeScreen session={session} />} />
        <Tab.Screen name="Hazards" children={() => <SupervisorHazardsScreen session={session} />} />
        <Tab.Screen name="SOS" children={() => <SupervisorSosScreen session={session} />} />
        <Tab.Screen name="Notices" children={() => <SupervisorNoticesScreen session={session} />} />
        <Tab.Screen name="More" children={() => <SupervisorMoreStack session={session} />} />
      </Tab.Navigator>
    </View>
  );
}