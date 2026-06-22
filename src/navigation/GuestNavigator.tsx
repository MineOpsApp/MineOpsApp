import { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { GuestHomeScreen } from '../screens/guest/GuestHomeScreen';
import { GuestNoticesScreen } from '../screens/guest/GuestNoticesScreen';
import { AppHeader } from '../components/AppHeader';
import type { AuthSession } from '../types/auth';

export type GuestSubRole = 'visitor' | 'inspector' | 'investor';

export type GuestTabParamList = {
  Home: undefined;
  Notices: undefined;
};

const Tab = createBottomTabNavigator<GuestTabParamList>();

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

  if (subRole === null) {
    return (
      <SafeAreaView style={styles.gateContainer}>
        <View style={styles.gateHeader}>
          <Text style={styles.gateBrand}>MineOps</Text>
          <Text style={styles.gateTitle}>Welcome, {session.user.fullName}</Text>
          <Text style={styles.gateSubtitle}>Please confirm your visit type to continue</Text>
        </View>
        {SUB_ROLES.map((sr) => (
          <Pressable key={sr.id} onPress={() => setSubRole(sr.id)} style={styles.subRoleCard}>
            <View style={styles.subRoleLeft}>
              <Text style={styles.subRoleIcon}>{sr.icon}</Text>
            </View>
            <View style={styles.subRoleRight}>
              <Text style={[styles.subRoleLabel, { color: sr.color }]}>{sr.label}</Text>
              <Text style={styles.subRoleDesc}>{sr.description}</Text>
            </View>
            <Text style={styles.subRoleArrow}>›</Text>
          </Pressable>
        ))}
        <Pressable onPress={onLogout} style={styles.logoutLink}>
          <Text style={styles.logoutLinkText}>Not you? Sign out</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const activeSub = SUB_ROLES.find((sr) => sr.id === subRole)!;

  return (
    <>
      <AppHeader session={session} onLogout={onLogout} />
      <View style={[styles.subRoleBanner, { backgroundColor: activeSub.color }]}>
        <Text style={styles.subRoleBannerText}>{activeSub.icon} {activeSub.label}</Text>
      </View>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#1f6f5b',
          tabBarInactiveTintColor: '#5d6875',
          tabBarStyle: { backgroundColor: '#ffffff', borderTopColor: '#dde3ea' },
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 11, fontWeight: '800' }}>{route.name}</Text>
          ),
        })}
      >
        <Tab.Screen name="Home" children={() => <GuestHomeScreen session={session} subRole={subRole} />} />
        <Tab.Screen name="Notices" children={() => <GuestNoticesScreen session={session} />} />
      </Tab.Navigator>
    </>
  );
}

const styles = StyleSheet.create({
  gateContainer: { flex: 1, backgroundColor: '#f4f6f8', padding: 24, justifyContent: 'center' },
  gateHeader: { marginBottom: 32 },
  gateBrand: { color: '#1f6f5b', fontSize: 14, fontWeight: '900', textTransform: 'uppercase', marginBottom: 8 },
  gateTitle: { color: '#17212b', fontSize: 24, fontWeight: '900', marginBottom: 6 },
  gateSubtitle: { color: '#5d6875', fontSize: 15, fontWeight: '600' },
  subRoleCard: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 16 },
  subRoleLeft: { marginRight: 14 },
  subRoleIcon: { fontSize: 28 },
  subRoleRight: { flex: 1 },
  subRoleLabel: { fontSize: 16, fontWeight: '900', marginBottom: 3 },
  subRoleDesc: { color: '#5d6875', fontSize: 13, fontWeight: '600' },
  subRoleArrow: { color: '#9aa5b1', fontSize: 24, fontWeight: '300' },
  logoutLink: { alignItems: 'center', marginTop: 24 },
  logoutLinkText: { color: '#5d6875', fontSize: 14, fontWeight: '700' },
  subRoleBanner: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  subRoleBannerText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  subRoleChangeText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '800' },
});