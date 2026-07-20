import { useEffect, useState } from 'react';
import { Image, ImageBackground, View, ActivityIndicator, StyleSheet, useColorScheme } from 'react-native';
import Mapbox from '@rnmapbox/maps';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');
import { useFonts, DancingScript_400Regular, DancingScript_700Bold } from '@expo-google-fonts/dancing-script';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import {
  getStoredEmail,
  logout,
  onSessionExpired,
  setAuthToken,
  savePushToken,
  tryRestoreSession,
} from './src/services/api';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider } from './src/theme/ThemeContext';
import { useThemeMode } from './src/theme/ThemeContext';
import { registerForPushNotifications } from './src/utils/notifications';
import type { AuthSession } from './src/types/auth';

type RootProps = {
  session: AuthSession | null;
  storedEmail: string | null;
  onAuthenticated: (s: AuthSession) => void;
  onLogout: () => void;
};

function ThemedRoot({ session, storedEmail, onAuthenticated, onLogout }: RootProps) {
  const { mode } = useThemeMode();
  const systemScheme = useColorScheme();
  const resolved = mode === 'system' ? (systemScheme ?? 'light') : mode;
  return (
    <>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      <RootNavigator
        session={session}
        storedEmail={storedEmail}
        onAuthenticated={onAuthenticated}
        onLogout={onLogout}
      />
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ DancingScript_400Regular, DancingScript_700Bold });
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [storedEmail, setStoredEmail] = useState<string | null>(null);

  useEffect(() => {
    onSessionExpired(() => handleLogout());

    async function init() {
      const email = await getStoredEmail();
      setStoredEmail(email);

      const restored = await tryRestoreSession();
      if (restored) {
        setAuthToken(restored.token, restored.refreshToken);
        setSession(restored);
      } else {
        setStoredEmail(null);
      }
      setLoading(false);
    }
    init();
  }, []);

  async function handleAuthenticated(newSession: AuthSession) {
    setAuthToken(newSession.token, newSession.refreshToken);
    setSession(newSession);
    setStoredEmail(newSession.user.email);
    try {
      const pushToken = await registerForPushNotifications();
      if (pushToken) await savePushToken(pushToken);
    } catch { /* push token optional */ }
  }

  async function handleLogout() {
    await logout(session?.refreshToken);
    setAuthToken(null);
    setSession(null);
    setStoredEmail(null);
  }

  if (loading || !fontsLoaded) {
    return (
      <ImageBackground source={require('./assets/auth-background.jpg')} style={styles.splash} resizeMode="cover">
        <LinearGradient
          colors={['rgba(20,13,8,0.40)', 'rgba(20,13,8,0.68)', 'rgba(20,13,8,0.92)']}
          style={StyleSheet.absoluteFill}
        />
        <StatusBar style="light" />
        <Image source={require('./assets/logo.png')} style={styles.splashLogo} resizeMode="contain" />
        <ActivityIndicator color="#e0a83a" size="small" style={{ marginTop: 32, zIndex: 1 }} />
      </ImageBackground>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ThemedRoot
          session={session}
          storedEmail={storedEmail}
          onAuthenticated={handleAuthenticated}
          onLogout={handleLogout}
        />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  splashLogo: { height: 95, width: 130, zIndex: 1 },
});
