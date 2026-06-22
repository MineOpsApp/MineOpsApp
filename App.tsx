import 'react-native-gesture-handler';
import { useState } from 'react';
import { setAuthToken } from './src/services/api';
import { RootNavigator } from './src/navigation/RootNavigator';
import type { AuthSession } from './src/types/auth';

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);

  function handleAuthenticated(newSession: AuthSession) {
    setAuthToken(newSession.token);
    setSession(newSession);
  }

  function handleLogout() {
    setAuthToken(null);
    setSession(null);
  }

  return (
    <RootNavigator
      session={session}
      onAuthenticated={handleAuthenticated}
      onLogout={handleLogout}
    />
  );
}