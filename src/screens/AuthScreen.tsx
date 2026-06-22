import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { loginUser, registerUser } from '../services/api';
import type { AuthSession } from '../types/auth';
import type { UserRole } from '../types/role';

const WORKER_ROLES = [
  { id: 'worker' as UserRole, label: 'Worker', description: 'Field worker on site' },
  { id: 'guest' as UserRole, label: 'Guest', description: 'Visitor or contractor' },
];

const ADMIN_ROLES = [
  { id: 'supervisor' as UserRole, label: 'Supervisor' },
  { id: 'safetyOfficer' as UserRole, label: 'Safety Officer' },
];

const SITES = ['Obuasi Mine', 'Tarkwa Mine', 'Bogoso Mine', 'Prestea Mine'];

type AuthScreenProps = {
  onAuthenticated: (session: AuthSession) => void;
};

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('worker');
  const [selectedSite, setSelectedSite] = useState(SITES[0]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdminRole = ADMIN_ROLES.some((r) => r.id === selectedRole);

  async function submit() {
    if (mode === 'register') {
      if (!fullName.trim()) { Alert.alert('Missing information', 'Enter your full name.'); return; }
      if (!email.trim()) { Alert.alert('Missing information', 'Enter your email.'); return; }
      if (password.length < 6) { Alert.alert('Weak password', 'Password must be at least 6 characters.'); return; }
      if (password !== confirmPassword) { Alert.alert('Password mismatch', 'Passwords do not match.'); return; }
      if (isAdminRole) { Alert.alert('Not allowed', 'Supervisor and Safety Officer accounts must be created by your site administrator.'); return; }
    } else {
      if (!email.trim() || !password.trim()) { Alert.alert('Missing information', 'Enter your email and password.'); return; }
    }

    setIsSubmitting(true);
    try {
      const session = mode === 'register'
        ? await registerUser({ email: email.trim().toLowerCase(), fullName: fullName.trim(), password, role: selectedRole, assignedSite: selectedSite })
        : await loginUser({ email: email.trim().toLowerCase(), password });
      onAuthenticated(session);
    } catch (error: any) {
      const msg = error?.message ?? '';
      if (msg.includes('409') || msg.includes('Conflict')) {
        Alert.alert('Email already registered', 'An account with this email already exists. Try logging in instead.');
      } else if (msg.includes('401') || msg.includes('Unauthorized')) {
        Alert.alert('Login failed', 'Incorrect email or password.');
      } else if (msg.includes('400')) {
        Alert.alert('Invalid details', 'Check your information and try again.');
      } else {
        Alert.alert(mode === 'register' ? 'Registration failed' : 'Login failed', 'Could not connect to the server. Check your connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={20} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <Text style={styles.brand}>MineOps</Text>
            <Text style={styles.title}>{mode === 'login' ? 'Sign in' : 'Create account'}</Text>
            <Text style={styles.subtitle}>{mode === 'login' ? 'Welcome back' : 'Join your mine site'}</Text>
          </View>

          <View style={styles.modeSwitch}>
            <ModeButton active={mode === 'login'} label="Sign In" onPress={() => setMode('login')} />
            <ModeButton active={mode === 'register'} label="Register" onPress={() => setMode('register')} />
          </View>

          {mode === 'register' ? (
            <>
              <Text style={styles.label}>I am a</Text>
              <View style={styles.roleGrid}>
                {WORKER_ROLES.map((role) => {
                  const isActive = selectedRole === role.id;
                  return (
                    <Pressable key={role.id} onPress={() => setSelectedRole(role.id)} style={[styles.roleCard, isActive && styles.activeRoleCard]}>
                      <Text style={[styles.roleTitle, isActive && styles.activeRoleTitle]}>{role.label}</Text>
                      <Text style={[styles.roleDesc, isActive && styles.activeRoleDesc]}>{role.description}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.adminNote}>
                <Text style={styles.adminNoteText}>
                  🔒 Supervisor & Safety Officer accounts are created by site administrators
                </Text>
              </View>

              <Text style={styles.label}>Assigned Site</Text>
              <View style={styles.siteGrid}>
                {SITES.map((site) => (
                  <Pressable key={site} onPress={() => setSelectedSite(site)} style={[styles.sitePill, selectedSite === site && styles.sitePillActive]}>
                    <Text style={[styles.sitePillText, selectedSite === site && styles.sitePillActiveText]}>{site}</Text>
                  </Pressable>
                ))}
              </View>

              <TextInput autoCapitalize="words" onChangeText={setFullName} placeholder="Full name" returnKeyType="next" style={styles.input} value={fullName} />
            </>
          ) : null}

          <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="Email address" returnKeyType="next" style={styles.input} value={email} />
          <TextInput onChangeText={setPassword} placeholder="Password" returnKeyType={mode === 'register' ? 'next' : 'done'} secureTextEntry style={styles.input} value={password} onSubmitEditing={mode === 'login' ? submit : undefined} />

          {mode === 'register' ? (
            <TextInput onChangeText={setConfirmPassword} onSubmitEditing={submit} placeholder="Confirm password" returnKeyType="done" secureTextEntry style={styles.input} value={confirmPassword} />
          ) : null}

          <Pressable disabled={isSubmitting} onPress={submit} style={[styles.submitButton, isSubmitting && styles.disabledButton]}>
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </Text>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ModeButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.modeButton, active && styles.activeModeButton]}>
      <Text style={[styles.modeButtonText, active && styles.activeModeButtonText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#f4f6f8', flex: 1 },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 22, paddingBottom: 40 },
  header: { marginBottom: 20 },
  brand: { color: '#1f6f5b', fontSize: 15, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#17212b', fontSize: 28, fontWeight: '900', marginTop: 6 },
  subtitle: { color: '#5d6875', fontSize: 15, fontWeight: '600', marginTop: 4 },
  modeSwitch: { backgroundColor: '#edf1f5', borderRadius: 8, flexDirection: 'row', marginBottom: 20, padding: 4 },
  modeButton: { alignItems: 'center', borderRadius: 6, flex: 1, justifyContent: 'center', minHeight: 40 },
  activeModeButton: { backgroundColor: '#ffffff' },
  modeButtonText: { color: '#5d6875', fontSize: 14, fontWeight: '900' },
  activeModeButtonText: { color: '#1f6f5b' },
  label: { color: '#5d6875', fontSize: 13, fontWeight: '800', marginBottom: 8 },
  roleGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  roleCard: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, flex: 1, justifyContent: 'center', padding: 12 },
  activeRoleCard: { backgroundColor: '#e7f6ef', borderColor: '#1f6f5b' },
  roleTitle: { color: '#17212b', fontSize: 14, fontWeight: '900', textAlign: 'center' },
  activeRoleTitle: { color: '#1f6f5b' },
  roleDesc: { color: '#9aa5b1', fontSize: 11, fontWeight: '600', marginTop: 3, textAlign: 'center' },
  activeRoleDesc: { color: '#1f6f5b' },
  adminNote: { backgroundColor: '#fff7e0', borderColor: '#fde68a', borderRadius: 8, borderWidth: 1, marginBottom: 14, padding: 10 },
  adminNoteText: { color: '#a15c00', fontSize: 12, fontWeight: '700' },
  siteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  sitePill: { borderColor: '#dde3ea', borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  sitePillActive: { backgroundColor: '#17212b', borderColor: '#17212b' },
  sitePillText: { color: '#5d6875', fontSize: 12, fontWeight: '800' },
  sitePillActiveText: { color: '#ffffff' },
  input: { backgroundColor: '#ffffff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 16, marginBottom: 10, minHeight: 50, paddingHorizontal: 14 },
  submitButton: { alignItems: 'center', backgroundColor: '#1f6f5b', borderRadius: 8, justifyContent: 'center', marginTop: 6, minHeight: 52 },
  disabledButton: { opacity: 0.65 },
  submitButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
});
