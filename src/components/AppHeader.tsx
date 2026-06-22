import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AuthSession } from '../types/auth';

type AppHeaderProps = {
  session: AuthSession;
  onLogout: () => void;
};

export function AppHeader({ session, onLogout }: AppHeaderProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>MineOps</Text>
          <Text style={styles.userLine}>
            {session.user.fullName} · {session.user.role}
          </Text>
        </View>
        <Pressable onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#dde3ea',
    borderBottomWidth: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  brand: {
    color: '#17212b',
    fontSize: 22,
    fontWeight: '800',
  },
  userLine: {
    color: '#5d6875',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#edf1f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: {
    color: '#17212b',
    fontSize: 13,
    fontWeight: '900',
  },
});