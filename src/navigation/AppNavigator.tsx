import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { WorkerNavigator } from './WorkerNavigator';
import { SupervisorNavigator } from './SupervisorNavigator';
import { SafetyOfficerNavigator } from './SafetyOfficerNavigator';
import { GuestNavigator } from './GuestNavigator';
import { BuyerNavigator } from './BuyerNavigator';
import { GovernmentNavigator } from './GovernmentNavigator';
import { drainQueue } from '../utils/offlineQueue';
import { ChangePasswordScreen } from '../screens/shared/ChangePasswordScreen';
import type { AuthSession } from '../types/auth';

type AppNavigatorProps = {
  session: AuthSession;
  onLogout: () => void;
};

export function AppNavigator({ session, onLogout }: AppNavigatorProps) {
  const [mustChange, setMustChange] = useState(Boolean(session.user.mustChangePassword));

  useEffect(() => {
    const unsubNet = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable !== false) {
        drainQueue().catch(() => {});
      }
    });
    const unsubApp = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        drainQueue().catch(() => {});
      }
    });
    return () => {
      unsubNet();
      unsubApp.remove();
    };
  }, []);

  if (mustChange) {
    return <ChangePasswordScreen forced onDone={() => setMustChange(false)} />;
  }

  switch (session.user.role) {
    case 'worker':
      return <WorkerNavigator session={session} onLogout={onLogout} />;
    case 'supervisor':
      return <SupervisorNavigator session={session} onLogout={onLogout} />;
    case 'safetyOfficer':
      return <SafetyOfficerNavigator session={session} onLogout={onLogout} />;
    case 'buyer':
      return <BuyerNavigator session={session} onLogout={onLogout} />;
    case 'government':
      return <GovernmentNavigator session={session} onLogout={onLogout} />;
    case 'guest':
    default:
      return <GuestNavigator session={session} onLogout={onLogout} />;
  }
}