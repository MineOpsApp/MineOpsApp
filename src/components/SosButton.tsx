import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { createSosAlert } from '../services/api';
import type { UserRole } from '../types/role';

type SosButtonProps = {
  role: UserRole;
};

export function SosButton({ role }: SosButtonProps) {
  async function sendAlert() {
    try {
      const alert = await createSosAlert({
        message: 'Emergency assistance requested',
        role,
        site: 'Obuasi Mine',
      });

      Alert.alert('SOS sent', `Alert #${alert.id} is open and has been sent to the backend.`);
    } catch (error) {
      Alert.alert('SOS failed', 'Could not send the emergency alert. Check the backend connection.');
    }
  }

  function handlePress() {
    Alert.alert('Send SOS?', 'This will create an emergency alert for the current user role.', [
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
