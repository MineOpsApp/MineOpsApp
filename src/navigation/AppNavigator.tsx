import { WorkerNavigator } from './WorkerNavigator';
import { SupervisorNavigator } from './SupervisorNavigator';
import { SafetyOfficerNavigator } from './SafetyOfficerNavigator';
import { GuestNavigator } from './GuestNavigator';
import type { AuthSession } from '../types/auth';

type AppNavigatorProps = {
  session: AuthSession;
  onLogout: () => void;
};

export function AppNavigator({ session, onLogout }: AppNavigatorProps) {
  switch (session.user.role) {
    case 'worker':
      return <WorkerNavigator session={session} onLogout={onLogout} />;
    case 'supervisor':
      return <SupervisorNavigator session={session} onLogout={onLogout} />;
    case 'safetyOfficer':
      return <SafetyOfficerNavigator session={session} onLogout={onLogout} />;
    case 'guest':
    default:
      return <GuestNavigator session={session} onLogout={onLogout} />;
  }
}