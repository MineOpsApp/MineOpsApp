import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { createSosAlert } from '../services/api';
import { enqueue } from '../utils/offlineQueue';
import { useTheme, type Theme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import type { AuthUser } from '../types/auth';
import type { UserRole } from '../types/role';

type SosButtonProps = {
  role: UserRole;
  user: AuthUser;
};

export function SosButton({ role, user }: SosButtonProps) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);
  const [onCooldown, setOnCooldown] = useState(false);

  async function sendAlert() {
    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected && netState.isInternetReachable !== false;
    const payload = {
      actorEmail: user.email,
      actorName: user.fullName,
      message: 'Emergency assistance requested',
      role,
      site: user.assignedSite ?? 'Obuasi Mine',
    };
    if (!isOnline) {
      await enqueue('sos', payload as Record<string, unknown>);
      setOnCooldown(true);
      setTimeout(() => setOnCooldown(false), 60000);
      Alert.alert('SOS queued', 'No signal — alert saved and will send automatically when you reconnect.');
      return;
    }
    try {
      const alert = await createSosAlert(payload);
      setOnCooldown(true);
      setTimeout(() => setOnCooldown(false), 60000);
      Alert.alert('SOS sent', `Alert #${alert.id} — help is on the way.`);
    } catch {
      Alert.alert('SOS failed', 'Could not send alert. Try again.');
    }
  }

  function handlePress() {
    if (onCooldown) {
      Alert.alert('Please wait', 'SOS was recently sent. Wait 60 seconds before sending again.');
      return;
    }
    Alert.alert(
      '🚨 Send SOS?',
      'This will immediately alert the site supervisor and safety team.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Emergency Alert', onPress: sendAlert, style: 'destructive' },
      ]
    );
  }

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityLabel="Send SOS emergency alert"
        accessibilityRole="button"
        onPress={handlePress}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, onCooldown && styles.buttonCooldown]}
      >
        <Text style={styles.icon}>🚨</Text>
        <Text style={styles.text}>SOS</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrapper: {
      alignItems: 'center',
      bottom: 80,
      position: 'absolute',
      right: 20,
    },
    button: {
      alignItems: 'center',
      backgroundColor: theme.danger,
      borderRadius: 36,
      elevation: 8,
      height: 72,
      justifyContent: 'center',
      shadowColor: theme.danger,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      width: 72,
    },
    buttonPressed: {
      backgroundColor: '#7f1d1d',
      transform: [{ scale: 0.96 }],
    },
    buttonCooldown: { backgroundColor: theme.textSub },
    icon: { fontSize: 20, marginBottom: 1 },
    text: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 1,
    },
  });
}
