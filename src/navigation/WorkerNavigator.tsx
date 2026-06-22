import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { WorkerHomeScreen } from '../screens/worker/WorkerHomeScreen';
import { WorkerHazardsScreen } from '../screens/worker/WorkerHazardsScreen';
import { WorkerEquipmentScreen } from '../screens/worker/WorkerEquipmentScreen';
import { WorkerNoticesScreen } from '../screens/worker/WorkerNoticesScreen';
import { AppHeader } from '../components/AppHeader';
import type { AuthSession } from '../types/auth';

export type WorkerTabParamList = {
  Home: undefined;
  Hazards: undefined;
  Equipment: undefined;
  Notices: undefined;
};

const Tab = createBottomTabNavigator<WorkerTabParamList>();

type WorkerNavigatorProps = {
  session: AuthSession;
  onLogout: () => void;
};

export function WorkerNavigator({ session, onLogout }: WorkerNavigatorProps) {
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
        <Tab.Screen name="Home" children={() => <WorkerHomeScreen session={session} />} />
        <Tab.Screen name="Hazards" children={() => <WorkerHazardsScreen session={session} />} />
        <Tab.Screen name="Equipment" children={() => <WorkerEquipmentScreen session={session} />} />
        <Tab.Screen name="Notices" children={() => <WorkerNoticesScreen session={session} />} />
      </Tab.Navigator>
    </>
  );
}