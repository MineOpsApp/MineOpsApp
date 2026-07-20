import { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { GuestHomeScreen } from '../screens/guest/GuestHomeScreen';
import { GuestNoticesScreen } from '../screens/guest/GuestNoticesScreen';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import type { AuthSession } from '../types/auth';

export type GuestSubRole = 'visitor' | 'inspector' | 'investor';

export type GuestTabParamList = {
  Home: undefined;
  Notices: undefined;
};

const Tab = createBottomTabNavigator<GuestTabParamList>();

const TAB_ICON_NAMES: Record<string, { outline: string; solid: string }> = {
  Home: { outline: 'home-outline', solid: 'home' },
  Notices: { outline: 'megaphone-outline', solid: 'megaphone' },
};

const SUB_ROLES: { id: GuestSubRole; label: string; description: string; icon: string; color: string }[] = [
  { id: 'visitor', label: 'Visitor', description: 'General site visit or contractor access', icon: 'person-outline', color: '#1f6f5b' },
  { id: 'inspector', label: 'Regulatory Inspector', description: 'Official government or regulatory inspection', icon: 'search-outline', color: '#1d5f99' },
  { id: 'investor', label: 'Investor', description: 'Business review or due diligence visit', icon: 'bar-chart-outline', color: '#a15c00' },
];

type GuestNavigatorProps = {
  session: AuthSession;
  onLogout: () => void;
};

export function GuestNavigator({ session, onLogout }: GuestNavigatorProps) {
  const [subRole, setSubRole] = useState<GuestSubRole | null>(null);
  const { mode } = useThemeMode();
  const theme = useTheme(mode);

  if (subRole === null) {
    return (
      <SafeAreaView style={[styles.gateContainer, { backgroundColor: theme.bgHero }]}>
        <View style={styles.gateTop}>
          <Text style={styles.gateBrand}>MineOps</Text>
          <Text style={styles.gateTitle}>Welcome,{'\n'}{session.user.fullName}</Text>
          <Text style={styles.gateSubtitle}>Confirm your visit type to continue</Text>
        </View>
        <View style={styles.gateCards}>
          {SUB_ROLES.map((sr) => {
            const isRegistered = session.user.guestSubRole === sr.id || (!session.user.guestSubRole && sr.id === 'visitor');
            return (
              <Pressable
                key={sr.id}
                onPress={() => isRegistered ? setSubRole(sr.id) : null}
                style={[styles.subRoleCard, !isRegistered && { opacity: 0.35 }]}
              >
                <View style={styles.subRoleIconWrap}>
                  <Ionicons name={sr.icon as any} size={22} color={sr.color} />
                </View>
                <View style={styles.subRoleRight}>
                  <Text style={[styles.subRoleLabel, { color: sr.color }]}>{sr.label}</Text>
                  <Text style={styles.subRoleDesc}>{isRegistered ? sr.description : 'Not your registered type'}</Text>
                </View>
                <Ionicons
                  name={isRegistered ? 'chevron-forward' : 'lock-closed-outline'}
                  size={18}
                  color="rgba(255,255,255,0.3)"
                />
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={onLogout} style={styles.logoutLink}>
          <Text style={styles.logoutLinkText}>Not you? Sign out</Text>
        </Pressable>
      </SafeAreaView>
    );
  }
  

  const activeSub = SUB_ROLES.find((sr) => sr.id === subRole)!;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader session={session} onLogout={onLogout} />
      <View style={[styles.subRoleBanner, { backgroundColor: activeSub.color }]}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
          <Ionicons name={activeSub.icon as any} size={14} color="#fff" />
          <Text style={styles.subRoleBannerText}>{activeSub.label}</Text>
        </View>
      </View>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.textMuted,
          tabBarStyle: { backgroundColor: theme.tabBar, borderTopColor: theme.tabBarBorder, borderTopWidth: 1, height: 64, paddingBottom: 10, paddingTop: 6 },
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 10, fontWeight: '800' }}>{route.name}</Text>
          ),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={(focused ? TAB_ICON_NAMES[route.name].solid : TAB_ICON_NAMES[route.name].outline) as any}
              size={22}
              color={color}
            />
          ),
        })}
      >
        <Tab.Screen name="Home" children={() => <GuestHomeScreen session={session} subRole={subRole} />} />
        <Tab.Screen name="Notices" children={() => <GuestNoticesScreen session={session} />} />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  gateContainer: { flex: 1, padding: 24 },
  gateTop: { flex: 1, justifyContent: 'center' },
  gateBrand: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '900', letterSpacing: 2, marginBottom: 16, textTransform: 'uppercase' },
  gateTitle: { color: '#ffffff', fontSize: 30, fontWeight: '900', lineHeight: 36, marginBottom: 8 },
  gateSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '600' },
  gateCards: { marginBottom: 24 },
  subRoleCard: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, flexDirection: 'row', marginBottom: 10, padding: 16 },
  subRoleIconWrap: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, height: 40, justifyContent: 'center', marginRight: 14, width: 40 },
  subRoleRight: { flex: 1 },
  subRoleLabel: { fontSize: 15, fontWeight: '900', marginBottom: 3 },
  subRoleDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },
  logoutLink: { alignItems: 'center', paddingVertical: 12 },
  logoutLinkText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '700' },
  subRoleBanner: { alignItems: 'center', paddingVertical: 8 },
  subRoleBannerText: { color: '#fff', fontSize: 13, fontWeight: '900' },
});