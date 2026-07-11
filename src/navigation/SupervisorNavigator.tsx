import { useEffect, useRef, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';

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
import { SupervisorRosterScreen } from '../screens/supervisor/SupervisorRosterScreen';
import { SupervisorBlastScreen } from '../screens/supervisor/SupervisorBlastScreen';
import { SupervisorEquipmentRegistryScreen } from '../screens/supervisor/SupervisorEquipmentRegistryScreen';
import { SupervisorDrillScreen } from '../screens/supervisor/SupervisorDrillScreen';
import { SupervisorGuestScreen } from '../screens/supervisor/SupervisorGuestScreen';
import { SupervisorIncidentScreen } from '../screens/supervisor/SupervisorIncidentScreen';
import { SupervisorResetPasswordScreen } from '../screens/supervisor/SupervisorResetPasswordScreen';
import { SupervisorPendingApprovalsScreen } from '../screens/supervisor/SupervisorPendingApprovalsScreen';
import { SupervisorWorkerContactsScreen } from '../screens/supervisor/SupervisorWorkerContactsScreen';
import { SupervisorSafetyChecklistScreen } from '../screens/supervisor/SupervisorSafetyChecklistScreen';
import { SupervisorFirstAidKitScreen } from '../screens/supervisor/SupervisorFirstAidKitScreen';
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
import { SupervisorPermitStatusScreen } from '../screens/supervisor/SupervisorPermitStatusScreen';
import { SupervisorBulkPurchaseScreen } from '../screens/supervisor/SupervisorBulkPurchaseScreen';
import { IllegalMineReportScreen } from '../screens/shared/IllegalMineReportScreen';
import { SupervisorSubscriptionScreen } from '../screens/supervisor/SupervisorSubscriptionScreen';
import type { AuthSession } from '../types/auth';

export type SupervisorTabParamList = {
  Home: undefined;
  Hazards: undefined;
  SOS: undefined;
  Notices: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<SupervisorTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Home: '⌂',
  Hazards: '⚠',
  SOS: '🚨',
  Notices: '📢',
  More: '☰',
};

type SupervisorMoreSubScreen = 'menu' | 'shifts' | 'audit' | 'drills' | 'guests' | 'guestCodes' | 'siteMap' | 'insurance' | 'roster' | 'blast' | 'reset' | 'incidents' | 'equipment' | 'approvals' | 'workerContacts' | 'checklist' | 'firstAid' | 'mineralInventory' | 'certifications' | 'workerProfile' | 'messages' | 'announcements' | 'payRuns' | 'listings' | 'offers' | 'transactions' | 'safetyIntelligence' | 'community' | 'search' | 'siteAccess' | 'permitStatus' | 'bulkPurchase' | 'illegalReport' | 'subscription';

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
    <Pressable onPress={() => setScreen('menu')} style={{ padding: 16, paddingBottom: 0 }}>
      <Text style={{ color: '#1f6f5b', fontSize: 14, fontWeight: '800' }}>← Back</Text>
    </Pressable>
  );

  if (screen === 'shifts') return <View style={{ flex: 1 }}>{backBtn}<SupervisorShiftScreen session={session} /></View>;
  if (screen === 'audit') return <View style={{ flex: 1 }}>{backBtn}<SupervisorAuditScreen session={session} /></View>;
  if (screen === 'drills') return <View style={{ flex: 1 }}>{backBtn}<SupervisorDrillScreen session={session} /></View>;
  if (screen === 'guests') return <View style={{ flex: 1 }}>{backBtn}<SupervisorGuestScreen session={session} /></View>;
  if (screen === 'roster') return <View style={{ flex: 1 }}>{backBtn}<SupervisorRosterScreen session={session} /></View>;
  if (screen === 'blast') return <View style={{ flex: 1 }}>{backBtn}<SupervisorBlastScreen session={session} /></View>;
  if (screen === 'incidents') return <View style={{ flex: 1 }}>{backBtn}<SupervisorIncidentScreen session={session} /></View>;
  if (screen === 'reset') return <View style={{ flex: 1 }}>{backBtn}<SupervisorResetPasswordScreen session={session} /></View>;
  if (screen === 'equipment') return <View style={{ flex: 1 }}>{backBtn}<SupervisorEquipmentRegistryScreen session={session} /></View>;
  if (screen === 'approvals') return <View style={{ flex: 1 }}>{backBtn}<SupervisorPendingApprovalsScreen session={session} /></View>;
  if (screen === 'workerContacts') return (
    <View style={{ flex: 1 }}>
      {backBtn}
      <SupervisorWorkerContactsScreen
        session={session}
        onViewProfile={(email) => { setViewingWorkerEmail(email); setScreen('workerProfile'); }}
      />
    </View>
  );
  if (screen === 'checklist') return <View style={{ flex: 1 }}>{backBtn}<SupervisorSafetyChecklistScreen session={session} /></View>;
  if (screen === 'firstAid') return <View style={{ flex: 1 }}>{backBtn}<SupervisorFirstAidKitScreen session={session} /></View>;
  if (screen === 'mineralInventory') return <View style={{ flex: 1 }}>{backBtn}<SupervisorMineralInventoryScreen session={session} /></View>;
  if (screen === 'certifications') return <View style={{ flex: 1 }}>{backBtn}<SupervisorCertificationsScreen session={session} /></View>;
  if (screen === 'workerProfile') return (
    <View style={{ flex: 1 }}>
      <Pressable onPress={() => setScreen('workerContacts')} style={{ padding: 16, paddingBottom: 0 }}>
        <Text style={{ color: '#1f6f5b', fontSize: 14, fontWeight: '800' }}>← Back to Contacts</Text>
      </Pressable>
      <WorkerProfileViewScreen email={viewingWorkerEmail} session={session} />
    </View>
  );
  if (screen === 'messages') return <View style={{ flex: 1 }}>{backBtn}<SupervisorMessagesScreen session={session} /></View>;
  if (screen === 'announcements') return <View style={{ flex: 1 }}>{backBtn}<SupervisorAnnouncementsScreen session={session} /></View>;
  if (screen === 'payRuns') return <View style={{ flex: 1 }}>{backBtn}<SupervisorPayRunsScreen session={session} /></View>;
  if (screen === 'guestCodes') return <View style={{ flex: 1 }}>{backBtn}<SupervisorGuestCodesScreen session={session} /></View>;
  if (screen === 'siteMap') return <View style={{ flex: 1 }}>{backBtn}<SupervisorSiteMapScreen session={session} /></View>;
  if (screen === 'insurance') return <View style={{ flex: 1 }}>{backBtn}<SupervisorInsuranceSettingsScreen session={session} /></View>;
  if (screen === 'safetyIntelligence') return <View style={{ flex: 1 }}>{backBtn}<SafetyIntelligenceScreen session={session} /></View>;
  if (screen === 'listings') return <View style={{ flex: 1 }}>{backBtn}<SupervisorListingsScreen session={session} /></View>;
  if (screen === 'offers') return <View style={{ flex: 1 }}>{backBtn}<SupervisorOffersScreen session={session} /></View>;
  if (screen === 'transactions') return <View style={{ flex: 1 }}>{backBtn}<SupervisorTransactionsScreen session={session} /></View>;
  if (screen === 'community') return <View style={{ flex: 1 }}>{backBtn}<CommunityScreen isSupervisor userEmail={session.user.email} /></View>;
  if (screen === 'search') return <View style={{ flex: 1 }}>{backBtn}<SearchScreen session={session} /></View>;
  if (screen === 'siteAccess') return <View style={{ flex: 1 }}>{backBtn}<SupervisorSiteAccessScreen session={session} /></View>;
  if (screen === 'permitStatus') return <View style={{ flex: 1 }}>{backBtn}<SupervisorPermitStatusScreen session={session} /></View>;
  if (screen === 'bulkPurchase') return <View style={{ flex: 1 }}>{backBtn}<SupervisorBulkPurchaseScreen session={session} /></View>;
  if (screen === 'illegalReport') return <View style={{ flex: 1 }}>{backBtn}<IllegalMineReportScreen /></View>;
  if (screen === 'subscription') return <View style={{ flex: 1 }}>{backBtn}<SupervisorSubscriptionScreen session={session} /></View>;

  return (
    <MoreScreen
      sections={[
        {
          title: 'Approvals & Access',
          items: [
            { icon: '✅', label: 'Worker Approvals', description: 'Approve or reject new worker registrations', onPress: () => setScreen('approvals') },
            { icon: '🔑', label: 'Reset Password', description: 'Generate temporary password for locked out worker', onPress: () => setScreen('reset') },
            { icon: '👤', label: 'Guest Access', description: 'Create and manage guest accounts', onPress: () => setScreen('guests') },
            { icon: '🎟', label: 'Guest Codes', description: 'Generate QR / PIN codes for site visitors and inspectors', onPress: () => setScreen('guestCodes') },
            { icon: '🏭', label: 'Site Access', description: 'Grant or revoke multi-site access for supervisors', onPress: () => setScreen('siteAccess') },
          ],
        },
        {
          title: 'People',
          items: [
            { icon: '👷', label: 'Site Roster', description: 'Live headcount — who is on site now', onPress: () => setScreen('roster') },
            { icon: '📞', label: 'Worker Contacts', description: 'Emergency contacts for all site personnel', onPress: () => setScreen('workerContacts') },
            { icon: '💬', label: 'Worker Messages', description: 'Read and reply to messages from your site workers', onPress: () => setScreen('messages') },
          ],
        },
        {
          title: 'Safety & Compliance',
          items: [
            { icon: '🚑', label: 'Incident Reports', description: 'View and manage site incident reports', onPress: () => setScreen('incidents') },
            { icon: '✅', label: 'Safety Checklists', description: "Today's shift checklist — who has and hasn't submitted", onPress: () => setScreen('checklist') },
            { icon: '🧠', label: 'Safety Intelligence', description: 'Hotspots, trending hazard types, and recommendations from the last 30 days', onPress: () => setScreen('safetyIntelligence') },
            { icon: '🩺', label: 'First Aid Kits', description: 'Per-zone kit inventory and weekly check status', onPress: () => setScreen('firstAid') },
            { icon: '🎓', label: 'Certifications', description: 'Track worker certifications, expiry dates, and renewal history', onPress: () => setScreen('certifications') },
            { icon: '🔍', label: 'Audit Log', description: 'Full tamper-proof activity trail', onPress: () => setScreen('audit') },
          ],
        },
        {
          title: 'Site Operations',
          items: [
            { icon: '📋', label: 'Shift Logs', description: 'View all site shift production logs', onPress: () => setScreen('shifts') },
            { icon: '🔧', label: 'Equipment Registry', description: 'Manage site equipment list and status', onPress: () => setScreen('equipment') },
            { icon: '⛏', label: 'Drill Operations', description: 'Active and completed drill sign-offs', onPress: () => setScreen('drills') },
            { icon: '💥', label: 'Blast Management', description: 'Schedule and notify blast operations', onPress: () => setScreen('blast') },
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
  const moreSetterRef = useRef<((s: SupervisorMoreSubScreen) => void) | null>(null);
  const pendingMoreScreenRef = useRef<SupervisorMoreSubScreen | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader session={session} onLogout={onLogout} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.textMuted,
          tabBarStyle: { backgroundColor: theme.tabBar, borderTopColor: theme.tabBarBorder, borderTopWidth: 1, height: 64, paddingBottom: 10, paddingTop: 6 },
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 10, fontWeight: '800' }}>{route.name}</Text>
          ),
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>{TAB_ICONS[route.name]}</Text>
          ),
        })}
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
