import { useState } from 'react';
import { setAuthToken } from './src/services/api';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider } from './src/theme/ThemeContext';
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
    <ThemeProvider>
      <RootNavigator
        session={session}
        onAuthenticated={handleAuthenticated}
        onLogout={handleLogout}
      />
    </ThemeProvider>
  );
}