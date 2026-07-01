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
  { id: 'worker' as UserRole, label: 'Worker', icon: '⛏', description: 'Field worker on site' },
  { id: 'guest' as UserRole, label: 'Guest', icon: '👤', description: 'Visitor or contractor' },
];


const SITES = ['Obuasi Mine', 'Tarkwa Mine', 'Bogoso Mine', 'Prestea Mine'];

type AuthScreenProps = {
  onAuthenticated: (session: AuthSession) => void;
};

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('worker');
  const [selectedSubRole, setSelectedSubRole] = useState<string>('visitor');
  const [selectedSite, setSelectedSite] = useState(SITES[0]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  async function submit() {
  if (isSubmitting) return;
  if (mode === 'register') {
    if (!fullName.trim()) { Alert.alert('Missing information', 'Enter your full name.'); return; }
    if (!email.trim()) { Alert.alert('Missing information', 'Enter your email.'); return; }
    if (password.length < 6) { Alert.alert('Weak password', 'Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { Alert.alert('Password mismatch', 'Passwords do not match.'); return; }
  } else {
    if (!email.trim() || !password.trim()) { Alert.alert('Missing information', 'Enter your email and password.'); return; }
  }

  setIsSubmitting(true);
    try {
      if (mode === 'register') {
        const result = await registerUser({ email: email.trim().toLowerCase(), fullName: fullName.trim(), password, role: selectedRole, assignedSite: selectedSite, guestSubRole: selectedRole === 'guest' ? selectedSubRole : undefined });
        if (result?.pending) {
          setPendingApproval(true);
        } else {
          onAuthenticated(result);
        }
      } else {
        const session = await loginUser({ email: email.trim().toLowerCase(), password });
        onAuthenticated(session);
      }
    } catch (error: any) {
      const msg = error?.message ?? '';
      if (msg.includes('PENDING_APPROVAL')) {
        Alert.alert('Pending approval', 'Your account is awaiting supervisor approval. Try again once approved.');
      } else if (msg.includes('SUSPENDED')) {
        Alert.alert('Account suspended', 'Your account has been suspended. Contact your supervisor.');
      } else if (msg.includes('EXPIRED')) {
        Alert.alert('Access expired', 'Your guest session has expired. Contact your site administrator.');
      } else if (msg.includes('INVALID_CREDENTIALS') || msg.includes('401')) {
        Alert.alert('Incorrect credentials', 'Check your email and password.');
      } else if (msg.includes('409') || msg.includes('Conflict')) {
        Alert.alert('Already registered', 'An account with this email exists. Try signing in.');
      } else if (msg.includes('400')) {
        Alert.alert('Invalid details', 'Check your information and try again.');
      } else {
        Alert.alert('Connection failed', 'Could not reach the server. Check your connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (pendingApproval) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.pendingContainer}>
          <View style={styles.pendingIcon}><Text style={{ fontSize: 40 }}>⏳</Text></View>
          <Text style={styles.pendingTitle}>Account Submitted</Text>
          <Text style={styles.pendingBody}>
            Your account is pending supervisor approval. You'll be able to sign in once a supervisor reviews and approves your registration.
          </Text>
          <Pressable onPress={() => { setPendingApproval(false); setMode('login'); }} style={styles.submitBtn}>
            <Text style={styles.submitBtnText}>Back to Sign In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>⛏</Text>
            </View>
            <Text style={styles.brand}>MineOps</Text>
            <Text style={styles.tagline}>Mining operations & safety platform</Text>
          </View>

          {/* Mode toggle */}
          <View style={styles.modeSwitch}>
            <Pressable onPress={() => setMode('login')} style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}>
              <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>Sign In</Text>
            </Pressable>
            <Pressable onPress={() => setMode('register')} style={[styles.modeBtn, mode === 'register' && styles.modeBtnActive]}>
              <Text style={[styles.modeBtnText, mode === 'register' && styles.modeBtnTextActive]}>Register</Text>
            </Pressable>
          </View>

          {/* Register extras */}
          {mode === 'register' ? (
            <>
              <Text style={styles.fieldLabel}>I am a</Text>
              <View style={styles.roleRow}>
                {WORKER_ROLES.map((role) => (
                  <Pressable key={role.id} onPress={() => setSelectedRole(role.id)} style={[styles.roleCard, selectedRole === role.id && styles.roleCardActive]}>
                    <Text style={styles.roleIcon}>{role.icon}</Text>
                    <Text style={[styles.roleLabel, selectedRole === role.id && styles.roleLabelActive]}>{role.label}</Text>
                    <Text style={styles.roleDesc}>{role.description}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.adminNote}>
                <Text style={styles.adminNoteText}>🔒 Supervisor & Safety Officer accounts are set up by site administrators</Text>
              </View>

                {selectedRole === 'guest' ? (
  <>
    <Text style={styles.fieldLabel}>Guest Type</Text>
    <View style={styles.roleRow}>
      {[
        { id: 'visitor', label: 'Visitor', icon: '👤' },
        { id: 'inspector', label: 'Inspector', icon: '🔍' },
        { id: 'investor', label: 'Investor', icon: '📊' },
      ].map((sub) => (
        <Pressable key={sub.id} onPress={() => setSelectedSubRole(sub.id)} style={[styles.roleCard, selectedSubRole === sub.id && styles.roleCardActive]}>
          <Text style={styles.roleIcon}>{sub.icon}</Text>
          <Text style={[styles.roleLabel, selectedSubRole === sub.id && styles.roleLabelActive]}>{sub.label}</Text>
        </Pressable>
      ))}
    </View>
  </>
) : null}

              <Text style={styles.fieldLabel}>Assigned Site</Text>
              <View style={styles.siteGrid}>
                {SITES.map((site) => (
                  <Pressable key={site} onPress={() => setSelectedSite(site)} style={[styles.sitePill, selectedSite === site && styles.sitePillActive]}>
                    <Text style={[styles.sitePillText, selectedSite === site && styles.sitePillTextActive]}>{site}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput autoCapitalize="words" onChangeText={setFullName} placeholder="Your full name" placeholderTextColor="#8fa3b8" returnKeyType="next" style={styles.input} value={fullName} />
              </View>
            </>
          ) : null}

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="your@email.com" placeholderTextColor="#8fa3b8" returnKeyType="next" style={styles.input} value={email} />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput onChangeText={setPassword} placeholder={mode === 'register' ? 'Min. 6 characters' : 'Your password'} placeholderTextColor="#8fa3b8" returnKeyType={mode === 'register' ? 'next' : 'done'} secureTextEntry={!showPassword} style={[styles.input, { flex: 1, marginBottom: 0 }]} value={password} onSubmitEditing={mode === 'login' ? submit : undefined} />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.showPasswordBtn}>
                 <Text style={styles.showPasswordText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
          </View>

          {/* Confirm password */}
          {mode === 'register' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Confirm Password</Text>
              <TextInput onChangeText={setConfirmPassword} onSubmitEditing={submit} placeholder="Repeat your password" placeholderTextColor="#8fa3b8" returnKeyType="done" secureTextEntry={!showPassword} style={styles.input} value={confirmPassword} />
            </View>
          ) : null}

          {/* Submit */}
          <Pressable disabled={isSubmitting} onPress={submit} style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}>
            <Text style={styles.submitBtnText}>
              {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
            </Text>
          </Pressable>

          {mode === 'login' ? (
            <Text style={styles.hint}>Don't have an account? Tap Register above.</Text>
          ) : null}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#0d1117', flex: 1 },
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 24, paddingBottom: 40 },

  header: { alignItems: 'center', marginBottom: 32, marginTop: 16 },
  logoMark: { alignItems: 'center', backgroundColor: '#1f6f5b', borderRadius: 20, height: 56, justifyContent: 'center', marginBottom: 12, width: 56 },
  logoMarkText: { fontSize: 24 },
  brand: { color: '#ffffff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 },
  tagline: { color: '#4d6475', fontSize: 13, fontWeight: '600' },

  modeSwitch: { backgroundColor: '#161b22', borderRadius: 10, flexDirection: 'row', marginBottom: 24, padding: 4 },
  modeBtn: { alignItems: 'center', borderRadius: 8, flex: 1, paddingVertical: 10 },
  modeBtnActive: { backgroundColor: '#1f6f5b' },
  modeBtnText: { color: '#4d6475', fontSize: 14, fontWeight: '800' },
  modeBtnTextActive: { color: '#ffffff' },

  fieldLabel: { color: '#8fa3b8', fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },

  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  roleCard: { alignItems: 'center', backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: 10, borderWidth: 1, flex: 1, padding: 14 },
  roleCardActive: { backgroundColor: '#122620', borderColor: '#1f6f5b' },
  roleIcon: { fontSize: 22, marginBottom: 6 },
  roleLabel: { color: '#8fa3b8', fontSize: 13, fontWeight: '900', marginBottom: 3 },
  roleLabelActive: { color: '#3fb950' },
  roleDesc: { color: '#4d6475', fontSize: 11, fontWeight: '600', textAlign: 'center' },

  adminNote: { backgroundColor: '#1c1a12', borderColor: '#d29922', borderLeftColor: '#d29922', borderLeftWidth: 3, borderRadius: 8, borderWidth: 1, marginBottom: 20, padding: 12 },
  adminNoteText: { color: '#d29922', fontSize: 12, fontWeight: '600' },

  siteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  sitePill: { borderColor: '#30363d', borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  sitePillActive: { backgroundColor: '#1f6f5b', borderColor: '#1f6f5b' },
  sitePillText: { color: '#8fa3b8', fontSize: 12, fontWeight: '800' },
  sitePillTextActive: { color: '#ffffff' },

  inputGroup: { marginBottom: 16 },
  input: { backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: 10, borderWidth: 1, color: '#e6edf3', fontSize: 15, marginBottom: 0, minHeight: 48, paddingHorizontal: 14 },

  passwordRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  showPasswordBtn: { backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: 10, borderWidth: 1, height: 48, alignItems: 'center', justifyContent: 'center', width: 48 },
  showPasswordText: { color: '#8fa3b8', fontSize: 12, fontWeight: '800' },

  submitBtn: { alignItems: 'center', backgroundColor: '#1f6f5b', borderRadius: 10, marginTop: 8, minHeight: 52, justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },

  hint: { color: '#4d6475', fontSize: 13, fontWeight: '600', marginTop: 16, textAlign: 'center' },
  pendingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  pendingIcon: { marginBottom: 20 },
  pendingTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
  pendingBody: { color: '#4d6475', fontSize: 14, fontWeight: '600', lineHeight: 22, marginBottom: 32, textAlign: 'center' },
});