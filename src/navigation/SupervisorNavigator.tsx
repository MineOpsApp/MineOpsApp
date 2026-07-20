import { useEffect, useRef, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { SwipeBackView } from '../components/SwipeBackView';

import { SupervisorHomeScreen } from '../screens/supervisor/SupervisorHomeScreen';
import { SupervisorHazardsScreen } from '../screens/supervisor/SupervisorHazardsScreen';
import { SupervisorSosScreen } from '../screens/supervisor/SupervisorSosScreen';
import { SupervisorNoticesScreen } from '../screens/supervisor/SupervisorNoticesScreen';
import { SupervisorShiftScreen } from '../screens/supervisor/SupervisorShiftScreen';
import { SupervisorAuditScreen } from '../screens/supervisor/SupervisorAuditScreen';
import { MoreScreen } from '../components/MoreScreen';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import { SupervisorGuestScreen } from '../screens/supervisor/SupervisorGuestScreen';
import { SupervisorIncidentScreen } from '../screens/supervisor/SupervisorIncidentScreen';
import { SupervisorResetPasswordScreen } from '../screens/supervisor/SupervisorResetPasswordScreen';
import { SupervisorPendingApprovalsScreen } from '../screens/supervisor/SupervisorPendingApprovalsScreen';
import { SupervisorWorkerContactsScreen } from '../screens/supervisor/SupervisorWorkerContactsScreen';
import { SupervisorMineralInventoryScreen } from '../screens/supervisor/SupervisorMineralInventoryScreen';
import { SupervisorCertificationsScreen } from '../screens/supervisor/SupervisorCertificationsScreen';
import { WorkerProfileViewScreen } from '../screens/supervisor/WorkerProfileViewScreen';
import { SupervisorMessagesScreen } from '../screens/supervisor/SupervisorMessagesScreen';
import { SupervisorAnnouncementsScreen } from '../screens/supervisor/SupervisorAnnouncementsScreen';
import { SupervisorPayRunsScreen } from '../screens/supervisor/SupervisorPayRunsScreen';
import { SupervisorGuestCodesScreen } from '../screens/supervisor/SupervisorGuestCodesScreen';
import { SupervisorSiteMapScreen } from '../screens/supervisor/SupervisorSiteMapScreen';
import { SupervisorInsuranceSettingsScreen } from '../screens/supervisor/SupervisorInsuranceSettingsScreen';
import { SupervisorListingsScreen } from '../screens/supervisor/SupervisorListingsScreen';
import { SupervisorOffersScreen } from '../screens/supervisor/SupervisorOffersScreen';
import { SupervisorTransactionsScreen } from '../screens/supervisor/SupervisorTransactionsScreen';
import { SafetyIntelligenceScreen } from '../screens/supervisor/SafetyIntelligenceScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SupervisorSiteAccessScreen } from '../screens/supervisor/SupervisorSiteAccessScreen';
import { SupervisorMultiSiteScreen } from '../screens/supervisor/SupervisorMultiSiteScreen';
import { SupervisorPermitStatusScreen } from '../screens/supervisor/SupervisorPermitStatusScreen';
import { SupervisorBulkPurchaseScreen } from '../screens/supervisor/SupervisorBulkPurchaseScreen';
import { IllegalMineReportScreen } from '../screens/shared/IllegalMineReportScreen';
import { SupervisorSubscriptionScreen } from '../screens/supervisor/SupervisorSubscriptionScreen';
import { SupervisorStaffScreen } from '../screens/supervisor/SupervisorStaffScreen';
import type { AuthSession } from '../types/auth';

export type SupervisorTabParamList = {
  Home: undefined;
  Hazards: undefined;
  SOS: undefined;
  Notices: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<SupervisorTabParamList>();


type SupervisorMoreSubScreen = 'menu' | 'shifts' | 'audit' | 'guests' | 'guestCodes' | 'siteMap' | 'insurance' | 'reset' | 'incidents' | 'approvals' | 'workerContacts' | 'mineralInventory' | 'certifications' | 'workerProfile' | 'messages' | 'announcements' | 'payRuns' | 'listings' | 'offers' | 'transactions' | 'safetyIntelligence' | 'community' | 'search' | 'siteAccess' | 'multiSite' | 'permitStatus' | 'bulkPurchase' | 'illegalReport' | 'subscription' | 'staffAccounts';

type Props = { session: AuthSession; onLogout: () => void };

function SupervisorMoreStack({
  session,
  pendingRef,
  onRegisterSetter,
}: {
  session: AuthSession;
  pendingRef: React.MutableRefObject<SupervisorMoreSubScreen | null>;
  onRegisterSetter: (setter: (s: SupervisorMoreSubScreen) => void) => void;
}) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const [screen, setScreen] = useState<SupervisorMoreSubScreen>(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    return pending ?? 'menu';
  });
  const [viewingWorkerEmail, setViewingWorkerEmail] = useState('');

  useEffect(() => {
    onRegisterSetter(setScreen);
  }, [onRegisterSetter]);

  const backBtn = (
    <Pressable
      onPress={() => setScreen('menu')}
      style={{ alignItems: 'center', alignSelf: 'flex-start', backgroundColor: `${theme.accent}14`, borderRadius: 20, flexDirection: 'row', gap: 4, margin: 16, marginBottom: 0, paddingHorizontal: 12, paddingVertical: 6 }}
    >
      <Ionicons name="chevron-back" size={16} color={theme.accent} />
      <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '800' }}>Back</Text>
    </Pressable>
  );

  if (screen === 'shifts') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorShiftScreen session={session} /></SwipeBackView>;
  if (screen === 'audit') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorAuditScreen session={session} /></SwipeBackView>;
  if (screen === 'guests') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorGuestScreen session={session} /></SwipeBackView>;
  if (screen === 'incidents') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorIncidentScreen session={session} /></SwipeBackView>;
  if (screen === 'reset') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorResetPasswordScreen session={session} /></SwipeBackView>;
  if (screen === 'approvals') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorPendingApprovalsScreen session={session} /></SwipeBackView>;
  if (screen === 'workerContacts') return (
    <SwipeBackView onBack={() => setScreen('menu')}>
      {backBtn}
      <SupervisorWorkerContactsScreen
        session={session}
        onViewProfile={(email) => { setViewingWorkerEmail(email); setScreen('workerProfile'); }}
      />
    </SwipeBackView>
  );
  if (screen === 'mineralInventory') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorMineralInventoryScreen session={session} /></SwipeBackView>;
  if (screen === 'certifications') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorCertificationsScreen session={session} /></SwipeBackView>;
  if (screen === 'workerProfile') return (
    <SwipeBackView onBack={() => setScreen('workerContacts')}>
      <Pressable
        onPress={() => setScreen('workerContacts')}
        style={{ alignItems: 'center', alignSelf: 'flex-start', backgroundColor: `${theme.accent}14`, borderRadius: 20, flexDirection: 'row', gap: 4, margin: 16, marginBottom: 0, paddingHorizontal: 12, paddingVertical: 6 }}
      >
        <Ionicons name="chevron-back" size={16} color={theme.accent} />
        <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '800' }}>Contacts</Text>
      </Pressable>
      <WorkerProfileViewScreen email={viewingWorkerEmail} session={session} />
    </SwipeBackView>
  );
  if (screen === 'messages') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorMessagesScreen session={session} /></SwipeBackView>;
  if (screen === 'announcements') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorAnnouncementsScreen session={session} /></SwipeBackView>;
  if (screen === 'payRuns') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorPayRunsScreen session={session} /></SwipeBackView>;
  if (screen === 'guestCodes') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorGuestCodesScreen session={session} /></SwipeBackView>;
  if (screen === 'siteMap') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorSiteMapScreen session={session} /></SwipeBackView>;
  if (screen === 'insurance') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorInsuranceSettingsScreen session={session} /></SwipeBackView>;
  if (screen === 'safetyIntelligence') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SafetyIntelligenceScreen session={session} /></SwipeBackView>;
  if (screen === 'listings') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorListingsScreen session={session} /></SwipeBackView>;
  if (screen === 'offers') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorOffersScreen session={session} /></SwipeBackView>;
  if (screen === 'transactions') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorTransactionsScreen session={session} /></SwipeBackView>;
  if (screen === 'community') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<CommunityScreen isSupervisor userEmail={session.user.email} /></SwipeBackView>;
  if (screen === 'search') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SearchScreen session={session} /></SwipeBackView>;
  if (screen === 'siteAccess') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorSiteAccessScreen session={session} /></SwipeBackView>;
  if (screen === 'multiSite') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorMultiSiteScreen session={session} /></SwipeBackView>;
  if (screen === 'permitStatus') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorPermitStatusScreen session={session} /></SwipeBackView>;
  if (screen === 'bulkPurchase') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorBulkPurchaseScreen session={session} /></SwipeBackView>;
  if (screen === 'illegalReport') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<IllegalMineReportScreen /></SwipeBackView>;
  if (screen === 'subscription') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorSubscriptionScreen session={session} /></SwipeBackView>;
  if (screen === 'staffAccounts') return <SwipeBackView onBack={() => setScreen('menu')}>{backBtn}<SupervisorStaffScreen session={session} /></SwipeBackView>;

  return (
    <MoreScreen
      sections={[
        {
          title: 'Approvals & Access',
          items: [
            { icon: '✅', label: 'Worker Approvals', description: 'Approve or reject new worker registrations', onPress: () => setScreen('approvals') },
            { icon: '🔐', label: 'Staff Accounts', description: 'Create supervisor and safety officer accounts', onPress: () => setScreen('staffAccounts') },
            { icon: '🔑', label: 'Reset Password', description: 'Generate temporary password for locked out worker', onPress: () => setScreen('reset') },
            { icon: '👤', label: 'Guest Access', description: 'Create and manage guest accounts', onPress: () => setScreen('guests') },
            { icon: '🎟', label: 'Guest Codes', description: 'Generate QR / PIN codes for site visitors and inspectors', onPress: () => setScreen('guestCodes') },
            { icon: '🏭', label: 'Site Access', description: 'Grant or revoke multi-site access for supervisors', onPress: () => setScreen('siteAccess') },
            { icon: '🗺', label: 'All My Sites', description: 'Combined view of every site you have access to', onPress: () => setScreen('multiSite') },
          ],
        },
        {
          title: 'People',
          items: [
            { icon: '📞', label: 'Worker Contacts', description: 'Emergency contacts for all site personnel', onPress: () => setScreen('workerContacts') },
            { icon: '💬', label: 'Worker Messages', description: 'Read and reply to messages from your site workers', onPress: () => setScreen('messages') },
          ],
        },
        {
          title: 'Safety & Compliance',
          items: [
            { icon: '🚑', label: 'Incident Reports', description: 'View and manage site incident reports', onPress: () => setScreen('incidents') },
            { icon: '🧠', label: 'Safety Intelligence', description: 'Hotspots, trending hazard types, and recommendations from the last 30 days', onPress: () => setScreen('safetyIntelligence') },
            { icon: '🎓', label: 'Certifications', description: 'Track worker certifications, expiry dates, and renewal history', onPress: () => setScreen('certifications') },
            { icon: '🔍', label: 'Audit Log', description: 'Full tamper-proof activity trail', onPress: () => setScreen('audit') },
          ],
        },
        {
          title: 'Site Operations',
          items: [
            { icon: '📋', label: 'Shift Logs', description: 'View all site shift production logs', onPress: () => setScreen('shifts') },
            { icon: '⛏', label: 'Mineral Inventory', description: 'Live stock totals and transaction history from approved shift logs', onPress: () => setScreen('mineralInventory') },
            { icon: '🗺', label: 'Site Map', description: 'Upload the site floor plan for the interactive zone map', onPress: () => setScreen('siteMap') },
            { icon: '📢', label: 'Announcements', description: 'Broadcast a quick update to all workers on site', onPress: () => setScreen('announcements') },
          ],
        },
        {
          title: 'Pay & Billing',
          items: [
            { icon: '💰', label: 'Pay Runs', description: 'Generate, approve, and disburse worker pay cycles', onPress: () => setScreen('payRuns') },
            { icon: '🛡', label: 'Insurance Settings', description: 'Configure worker insurance enrolment and premium deduction', onPress: () => setScreen('insurance') },
            { icon: '💳', label: 'Subscription', description: 'View subscription status, plan details, and record payments', onPress: () => setScreen('subscription') },
          ],
        },
        {
          title: 'Marketplace',
          items: [
            { icon: '📋', label: 'Listings', description: 'Create and manage mineral listings for verified buyers', onPress: () => setScreen('listings') },
            { icon: '🤝', label: 'Buyer Offers', description: 'Review, counter, accept or reject incoming offers', onPress: () => setScreen('offers') },
            { icon: '📦', label: 'Transactions', description: 'Track batch dispatch status for sold mineral orders', onPress: () => setScreen('transactions') },
          ],
        },
        {
          title: 'Regulatory',
          items: [
            { icon: '📋', label: 'Permit Status', description: 'Self-report Minerals Commission permit progress for this site', onPress: () => setScreen('permitStatus') },
            { icon: '💰', label: 'GoldBod Bulk Purchase', description: 'Flag site inventory as available for GoldBod acquisition', onPress: () => setScreen('bulkPurchase') },
            { icon: '🚨', label: 'Report Illegal Mining', description: 'Submit a tip about unlicensed mining activity to GoldBod regulators', onPress: () => setScreen('illegalReport') },
          ],
        },
        {
          title: 'Connect',
          items: [
            { icon: '🌐', label: 'Community', description: 'Mine directory, forum, events, and job board', onPress: () => setScreen('community') },
          ],
        },
      ]}
    />
  );
}

export function SupervisorNavigator({ session, onLogout }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const moreSetterRef = useRef<((s: SupervisorMoreSubScreen) => void) | null>(null);
  const pendingMoreScreenRef = useRef<SupervisorMoreSubScreen | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader session={session} onLogout={onLogout} />
      <Tab.Navigator
        screenOptions={({ route }) => {
          const ICON_MAP: Record<string, [string, string]> = {
            Home: ['home', 'home-outline'],
            Hazards: ['warning', 'warning-outline'],
            SOS: ['alert-circle', 'alert-circle-outline'],
            Notices: ['megaphone', 'megaphone-outline'],
            More: ['grid', 'grid-outline'],
          };
          const [active, inactive] = ICON_MAP[route.name] ?? ['ellipse', 'ellipse-outline'];
          return {
            headerShown: false,
            tabBarActiveTintColor: theme.accent,
            tabBarInactiveTintColor: theme.textMuted,
            tabBarStyle: { backgroundColor: theme.tabBar, borderTopWidth: 0, elevation: 8, height: 64, paddingBottom: 10, paddingTop: 6, shadowColor: '#000', shadowOffset: { width: 0, height: -1 }, shadowOpacity: isDark ? 0.2 : 0.06, shadowRadius: 4 },
            tabBarLabel: ({ color }) => (
              <Text style={{ color, fontSize: 10, fontWeight: '800' }}>{route.name}</Text>
            ),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={(focused ? active : inactive) as ComponentProps<typeof Ionicons>['name']} size={22} color={color} />
            ),
          };
        }}
      >
        <Tab.Screen name="Home">
          {({ navigation }) => (
            <SupervisorHomeScreen
              session={session}
              onGoToSearch={() => {
                if (moreSetterRef.current) {
                  moreSetterRef.current('search');
                } else {
                  pendingMoreScreenRef.current = 'search';
                }
                navigation.navigate('More');
              }}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Hazards" children={() => <SupervisorHazardsScreen session={session} />} />
        <Tab.Screen name="SOS" children={() => <SupervisorSosScreen session={session} />} />
        <Tab.Screen name="Notices" children={() => <SupervisorNoticesScreen session={session} />} />
        <Tab.Screen name="More">
          {() => (
            <SupervisorMoreStack
              session={session}
              pendingRef={pendingMoreScreenRef}
              onRegisterSetter={(setter) => { moreSetterRef.current = setter; }}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
  );
}
