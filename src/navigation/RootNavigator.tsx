import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';

import { AuthScreen } from '../screens/AuthScreen';
import { AppNavigator } from './AppNavigator';
import type { AuthSession } from '../types/auth';
import { useTheme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';

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
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const systemScheme = useColorScheme();
  const resolvedMode = mode === 'system' ? (systemScheme ?? 'light') : mode;
  const isDark = resolvedMode === 'dark';
  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.bg,
      card: theme.bgCard,
      text: theme.text,
      border: theme.border,
      primary: theme.accent,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
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