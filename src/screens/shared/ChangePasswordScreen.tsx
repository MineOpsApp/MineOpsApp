import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ActionButton } from '../../components/ActionButton';
import { changePassword } from '../../services/api';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = {
  forced?: boolean;
  onDone: () => void;
};

export function ChangePasswordScreen({ forced, onDone }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!current.trim() || !newPwd || !confirm) {
      Alert.alert('Missing fields', 'All three fields are required.'); return;
    }
    if (newPwd.length < 6) {
      Alert.alert('Too short', 'New password must be at least 6 characters.'); return;
    }
    if (newPwd !== confirm) {
      Alert.alert('No match', 'New password and confirm password must match.'); return;
    }
    if (newPwd === current) {
      Alert.alert('Same password', 'New password must be different from the current one.'); return;
    }
    setLoading(true);
    try {
      await changePassword(current, newPwd);
      if (forced) {
        onDone();
      } else {
        setDone(true);
      }
    } catch (error: any) {
      const msg = error?.message ?? '';
      if (msg.includes('401')) Alert.alert('Incorrect password', 'Current password is incorrect.');
      else Alert.alert('Failed', 'Could not update password. Please try again.');
    } finally { setLoading(false); }
  }

  const form = (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {forced && (
        <View style={styles.notice}>
          <Ionicons name="lock-closed-outline" size={20} color={theme.amber} />
          <Text style={styles.noticeText}>
            Your account was set up with a temporary password. Please create a new one to continue.
          </Text>
        </View>
      )}

      {done ? (
        <View style={styles.successCard}>
          <Ionicons name="checkmark-circle-outline" size={36} color={theme.success} />
          <Text style={styles.successTitle}>Password Updated</Text>
          <Text style={styles.successSub}>Your password has been changed successfully.</Text>
          <ActionButton label="Done" onPress={onDone} />
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Current Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                autoCapitalize="none"
                onChangeText={setCurrent}
                placeholder="Enter your current password"
                placeholderTextColor={theme.textMuted}
                secureTextEntry={!showCurrent}
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={current}
              />
              <Pressable onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeBtn}>
                <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>New Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                autoCapitalize="none"
                onChangeText={setNewPwd}
                placeholder="At least 6 characters"
                placeholderTextColor={theme.textMuted}
                secureTextEntry={!showNew}
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={newPwd}
              />
              <Pressable onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Confirm New Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                autoCapitalize="none"
                onChangeText={setConfirm}
                placeholder="Repeat new password"
                placeholderTextColor={theme.textMuted}
                secureTextEntry={!showConfirm}
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={confirm}
              />
              <Pressable onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textMuted} />
              </Pressable>
            </View>
          </View>

          <ActionButton
            label={loading ? 'Updating...' : 'Update Password'}
            onPress={handleSubmit}
            disabled={loading}
          />
        </>
      )}
    </ScrollView>
  );

  if (forced) {
    return (
      <SafeAreaView style={{ backgroundColor: theme.bg, flex: 1 }}>
        <View style={styles.forcedHeader}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#ffffff" />
          <Text style={styles.forcedHeaderTitle}>Password Update Required</Text>
        </View>
        {form}
      </SafeAreaView>
    );
  }

  return form;
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: spacing.xl, paddingBottom: 40 },
    forcedHeader: {
      alignItems: 'center',
      backgroundColor: theme.bgHero,
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    forcedHeaderTitle: { ...typography.h3, color: '#ffffff' },
    notice: {
      alignItems: 'flex-start',
      backgroundColor: theme.amberLight,
      borderColor: theme.amber,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.xl,
      padding: spacing.md,
    },
    noticeText: { ...typography.body, color: theme.amber, flex: 1 },
    card: {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: spacing.lg,
      padding: spacing.lg,
    },
    fieldLabel: { ...typography.label, color: theme.textSub, marginBottom: spacing.sm },
    passwordRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
    input: {
      backgroundColor: theme.bgInput,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.text,
      fontSize: 14,
      minHeight: 44,
      paddingHorizontal: spacing.md,
    },
    eyeBtn: {
      alignItems: 'center',
      backgroundColor: theme.bgInput,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    successCard: {
      alignItems: 'center',
      backgroundColor: theme.successLight,
      borderColor: theme.success,
      borderRadius: 12,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.xxl,
    },
    successTitle: { ...typography.h2, color: theme.success, marginTop: spacing.sm },
    successSub: { ...typography.body, color: theme.success, marginBottom: spacing.md, textAlign: 'center' },
  });
}
