import { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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

const TAB_ICONS: Record<string, string> = {
  Home: '⌂',
  Notices: '📢',
};

const SUB_ROLES: { id: GuestSubRole; label: string; description: string; icon: string; color: string }[] = [
  { id: 'visitor', label: 'Visitor', description: 'General site visit or contractor access', icon: '👤', color: '#1f6f5b' },
  { id: 'inspector', label: 'Regulatory Inspector', description: 'Official government or regulatory inspection', icon: '🔍', color: '#1d5f99' },
  { id: 'investor', label: 'Investor', description: 'Business review or due diligence visit', icon: '📊', color: '#a15c00' },
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
          <Text style={styles.gateSubtitle}>Select your visit type to continue</Text>
        </View>
        <View style={styles.gateCards}>
          {SUB_ROLES.map((sr) => (
            <Pressable key={sr.id} onPress={() => setSubRole(sr.id)} style={styles.subRoleCard}>
              <Text style={styles.subRoleIcon}>{sr.icon}</Text>
              <View style={styles.subRoleRight}>
                <Text style={[styles.subRoleLabel, { color: sr.color }]}>{sr.label}</Text>
                <Text style={styles.subRoleDesc}>{sr.description}</Text>
              </View>
              <Text style={styles.subRoleArrow}>›</Text>
            </Pressable>
          ))}
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
        <Text style={styles.subRoleBannerText}>{activeSub.icon} {activeSub.label}</Text>
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
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18 }}>{TAB_ICONS[route.name]}</Text>
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
  subRoleIcon: { fontSize: 26, marginRight: 14 },
  subRoleRight: { flex: 1 },
  subRoleLabel: { fontSize: 15, fontWeight: '900', marginBottom: 3 },
  subRoleDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },
  subRoleArrow: { color: 'rgba(255,255,255,0.3)', fontSize: 24 },
  logoutLink: { alignItems: 'center', paddingVertical: 12 },
  logoutLinkText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '700' },
  subRoleBanner: { alignItems: 'center', paddingVertical: 8 },
  subRoleBannerText: { color: '#fff', fontSize: 13, fontWeight: '900' },
});