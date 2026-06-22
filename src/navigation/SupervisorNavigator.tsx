import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { SupervisorHomeScreen } from '../screens/supervisor/SupervisorHomeScreen';
import { SupervisorHazardsScreen } from '../screens/supervisor/SupervisorHazardsScreen';
import { SupervisorSosScreen } from '../screens/supervisor/SupervisorSosScreen';
import { SupervisorNoticesScreen } from '../screens/supervisor/SupervisorNoticesScreen';
import { SupervisorAuditScreen } from '../screens/supervisor/SupervisorAuditScreen';
import { AppHeader } from '../components/AppHeader';
import type { AuthSession } from '../types/auth';

export type SupervisorTabParamList = {
  Home: undefined;
  Hazards: undefined;
  SOS: undefined;
  Notices: undefined;
  Audit: undefined;
};

const Tab = createBottomTabNavigator<SupervisorTabParamList>();

type SupervisorNavigatorProps = {
  session: AuthSession;
  onLogout: () => void;
};

export function SupervisorNavigator({ session, onLogout }: SupervisorNavigatorProps) {
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
        <Tab.Screen name="Home" children={() => <SupervisorHomeScreen session={session} />} />
        <Tab.Screen name="Hazards" children={() => <SupervisorHazardsScreen session={session} />} />
        <Tab.Screen name="SOS" children={() => <SupervisorSosScreen session={session} />} />
        <Tab.Screen name="Notices" children={() => <SupervisorNoticesScreen session={session} />} />
        <Tab.Screen name="Audit" children={() => <SupervisorAuditScreen session={session} />} />
      </Tab.Navigator>
    </>
  );
}
