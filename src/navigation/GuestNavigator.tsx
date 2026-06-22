import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { GuestHomeScreen } from '../screens/guest/GuestHomeScreen';
import { GuestNoticesScreen } from '../screens/guest/GuestNoticesScreen';
import { AppHeader } from '../components/AppHeader';
import type { AuthSession } from '../types/auth';

export type GuestTabParamList = {
  Home: undefined;
  Notices: undefined;
};

const Tab = createBottomTabNavigator<GuestTabParamList>();

type GuestNavigatorProps = {
  session: AuthSession;
  onLogout: () => void;
};

export function GuestNavigator({ session, onLogout }: GuestNavigatorProps) {
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
        <Tab.Screen name="Home" children={() => <GuestHomeScreen session={session} />} />
        <Tab.Screen name="Notices" children={() => <GuestNoticesScreen session={session} />} />
      </Tab.Navigator>
    </>
  );
}
