import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { createSosAlert } from '../services/api';
import type { AuthUser } from '../types/auth';
import type { UserRole } from '../types/role';

type SosButtonProps = {
  role: UserRole;
  user: AuthUser;
};

export function SosButton({ role, user }: SosButtonProps) {
  async function sendAlert() {
    try {
      const alert = await createSosAlert({
        actorEmail: user.email,
        actorName: user.fullName,
        message: 'Emergency assistance requested',
        role,
        site: 'Obuasi Mine',
      });

      Alert.alert('SOS sent', `Alert #${alert.id}`);
    } catch (error) {
      Alert.alert('SOS failed', 'Try again.');
    }
  }

  function handlePress() {
    Alert.alert('Send SOS?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send SOS', onPress: sendAlert, style: 'destructive' },
    ]);
  }

  return (
    <Pressable
      accessibilityLabel="Send SOS emergency alert"
      accessibilityRole="button"
      onPress={handlePress}
      style={styles.button}
    >
      <Text style={styles.text}>SOS</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#b42318',
    borderRadius: 8,
    bottom: 22,
    elevation: 6,
    height: 58,
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    width: 72,
  },
  text: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
});
