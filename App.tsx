import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
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
import { registerForPushNotifications } from './src/utils/notifications';
import type { AuthSession } from './src/types/auth';

export default function App() {
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

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color="#1f6f5b" size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <RootNavigator
        session={session}
        storedEmail={storedEmail}
        onAuthenticated={handleAuthenticated}
        onLogout={handleLogout}
      />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splash: { alignItems: 'center', backgroundColor: '#0d1117', flex: 1, justifyContent: 'center' },
});
