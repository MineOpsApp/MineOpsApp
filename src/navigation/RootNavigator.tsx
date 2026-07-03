import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthScreen } from '../screens/AuthScreen';
import { AppNavigator } from './AppNavigator';
import type { AuthSession } from '../types/auth';

export type RootStackParamList = {
  Auth: undefined;
  App: { session: AuthSession };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type RootNavigatorProps = {
  session: AuthSession | null;
  storedEmail: string | null;
  onAuthenticated: (session: AuthSession) => void;
  onLogout: () => void;
};

export function RootNavigator({ session, storedEmail, onAuthenticated, onLogout }: RootNavigatorProps) {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session === null ? (
          <Stack.Screen name="Auth">
            {() => <AuthScreen storedEmail={storedEmail} onAuthenticated={onAuthenticated} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="App">
            {() => <AppNavigator session={session} onLogout={onLogout} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}