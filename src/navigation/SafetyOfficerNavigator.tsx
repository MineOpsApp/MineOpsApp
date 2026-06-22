import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { SafetyHomeScreen } from '../screens/safety/SafetyHomeScreen';
import { SafetyHazardsScreen } from '../screens/safety/SafetyHazardsScreen';
import { SafetyDangerZonesScreen } from '../screens/safety/SafetyDangerZonesScreen';
import { SafetyNoticesScreen } from '../screens/safety/SafetyNoticesScreen';
import { SafetyAuditScreen } from '../screens/safety/SafetyAuditScreen';
import { AppHeader } from '../components/AppHeader';
import type { AuthSession } from '../types/auth';

export type SafetyOfficerTabParamList = {
  Home: undefined;
  Hazards: undefined;
  Zones: undefined;
  Notices: undefined;
  Audit: undefined;
};

const Tab = createBottomTabNavigator<SafetyOfficerTabParamList>();

type SafetyOfficerNavigatorProps = {
  session: AuthSession;
  onLogout: () => void;
};

export function SafetyOfficerNavigator({ session, onLogout }: SafetyOfficerNavigatorProps) {
  return (
    <>
      <AppHeader session={session} onLogout={onLogout} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#1f6f5b',
          tabBarInactiveTintColor: '#5d6875',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopColor: '#dde3ea',
          },
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 11, fontWeight: '800' }}>{route.name}</Text>
          ),
        })}
      >
        <Tab.Screen name="Home" children={() => <SafetyHomeScreen session={session} />} />
        <Tab.Screen name="Hazards" children={() => <SafetyHazardsScreen session={session} />} />
        <Tab.Screen name="Zones" children={() => <SafetyDangerZonesScreen session={session} />} />
        <Tab.Screen name="Notices" children={() => <SafetyNoticesScreen session={session} />} />
        <Tab.Screen name="Audit" children={() => <SafetyAuditScreen session={session} />} />
      </Tab.Navigator>
    </>
  );
}
