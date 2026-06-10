import { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { roleDefinitions } from '../data/roles';
import { loginUser, registerUser } from '../services/api';
import type { AuthSession } from '../types/auth';
import type { UserRole } from '../types/role';

type AuthScreenProps = {
  onAuthenticated: (session: AuthSession) => void;
};

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [selectedRole, setSelectedRole] = useState<UserRole>('worker');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    if (!email.trim() || !password.trim() || (mode === 'register' && !fullName.trim())) {
      Alert.alert('Missing information', 'Fill in all required fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const session =
        mode === 'register'
          ? await registerUser({
              email,
              fullName,
              password,
              role: selectedRole,
            })
          : await loginUser({
              email,
              password,
            });

      onAuthenticated(session);
    } catch (error) {
      Alert.alert(
        mode === 'register' ? 'Registration failed' : 'Login failed',
        'Check your details and backend connection.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brand}>MineOps</Text>
          <Text style={styles.title}>{mode === 'register' ? 'Create Account' : 'Sign In'}</Text>
          <Text style={styles.subtitle}>Choose your user type to open the correct MineOps interface</Text>
        </View>

        <View style={styles.modeSwitch}>
          <ModeButton active={mode === 'register'} label="Register" onPress={() => setMode('register')} />
          <ModeButton active={mode === 'login'} label="Login" onPress={() => setMode('login')} />
        </View>

        {mode === 'register' ? (
          <View style={styles.roleGrid}>
            {roleDefinitions.map((role) => {
              const isActive = selectedRole === role.id;

              return (
                <Pressable
                  key={role.id}
                  onPress={() => setSelectedRole(role.id)}
                  style={[styles.roleCard, isActive && styles.activeRoleCard]}
                >
                  <Text style={[styles.roleTitle, isActive && styles.activeRoleTitle]}>{role.label}</Text>
                  <Text style={styles.roleSummary}>{role.summary}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {mode === 'register' ? (
          <TextInput
            autoCapitalize="words"
            onChangeText={setFullName}
            placeholder="Full name"
            style={styles.input}
            value={fullName}
          />
        ) : null}

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          style={styles.input}
          value={email}
        />

        <TextInput
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          value={password}
        />

        <Pressable
          disabled={isSubmitting}
          onPress={submit}
          style={[styles.submitButton, isSubmitting && styles.disabledButton]}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Please wait...' : mode === 'register' ? 'Create Account' : 'Sign In'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ModeButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.modeButton, active && styles.activeModeButton]}>
      <Text style={[styles.modeButtonText, active && styles.activeModeButtonText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f4f6f8',
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    marginBottom: 18,
  },
  brand: {
    color: '#1f6f5b',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: '#17212b',
    fontSize: 31,
    fontWeight: '900',
    marginTop: 8,
  },
  subtitle: {
    color: '#5d6875',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginTop: 8,
  },
  modeSwitch: {
    backgroundColor: '#edf1f5',
    borderRadius: 8,
    flexDirection: 'row',
    marginBottom: 16,
    padding: 4,
  },
  modeButton: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
  },
  activeModeButton: {
    backgroundColor: '#ffffff',
  },
  modeButtonText: {
    color: '#5d6875',
    fontSize: 14,
    fontWeight: '900',
  },
  activeModeButtonText: {
    color: '#1f6f5b',
  },
  roleGrid: {
    gap: 10,
    marginBottom: 16,
  },
  roleCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  activeRoleCard: {
    backgroundColor: '#e7f6ef',
    borderColor: '#1f6f5b',
  },
  roleTitle: {
    color: '#17212b',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  activeRoleTitle: {
    color: '#1f6f5b',
  },
  roleSummary: {
    color: '#5d6875',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
    borderRadius: 8,
    borderWidth: 1,
    color: '#17212b',
    fontSize: 16,
    marginBottom: 10,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#1f6f5b',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 6,
    minHeight: 52,
  },
  disabledButton: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
});
