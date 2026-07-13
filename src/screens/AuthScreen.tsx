import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
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
import * as LocalAuthentication from 'expo-local-authentication';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

import { loginUser, parseApiError, registerUser, redeemGuestCode, setAuthToken, tryRestoreSession } from '../services/api';
import { useTheme, type Theme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import type { AuthSession } from '../types/auth';
import type { UserRole } from '../types/role';

const WORKER_ROLES = [
  { id: 'worker' as UserRole, label: 'Worker', icon: '⛏', description: 'Field worker on site' },
  { id: 'guest' as UserRole, label: 'Guest', icon: '👤', description: 'Visitor or contractor' },
  { id: 'buyer' as UserRole, label: 'Buyer', icon: '🛒', description: 'Purchase minerals from mines' },
];

const SITES = ['Obuasi Mine', 'Tarkwa Mine', 'Bogoso Mine', 'Prestea Mine'];

type AuthScreenProps = {
  storedEmail: string | null;
  onAuthenticated: (session: AuthSession) => void;
};

export function AuthScreen({ storedEmail, onAuthenticated }: AuthScreenProps) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'guest'>('login');
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
  const [businessName, setBusinessName] = useState('');
  const [goldbodLicenseNumber, setGoldbodLicenseNumber] = useState('');
  const [verificationDocument, setVerificationDocument] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const [guestCode, setGuestCode]         = useState('');
  const [guestName, setGuestName]         = useState('');
  const [guestPhone, setGuestPhone]       = useState('');
  const [guestError, setGuestError]       = useState('');
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  const [scanning, setScanning]           = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  useEffect(() => {
    async function checkBiometric() {
      if (!storedEmail) return;
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);
    }
    checkBiometric();
  }, [storedEmail]);

  async function handleBiometricLogin() {
    setBiometricLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Sign in as ${storedEmail}`,
        fallbackLabel: 'Use Password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (!result.success) return;

      const session = await tryRestoreSession();
      if (!session) {
        setBiometricAvailable(false);
        Alert.alert('Session expired', 'Your session has expired. Please sign in with your password.');
        return;
      }
      setAuthToken(session.token, session.refreshToken);
      onAuthenticated(session);
    } catch {
      Alert.alert('Biometric failed', 'Could not authenticate. Please try again or use your password.');
    } finally {
      setBiometricLoading(false);
    }
  }

  async function submit() {
    if (isSubmitting) return;
    if (authMode === 'register') {
      if (!fullName.trim()) { Alert.alert('Missing information', 'Enter your full name.'); return; }
      if (!email.trim()) { Alert.alert('Missing information', 'Enter your email.'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { Alert.alert('Invalid email', 'Enter a valid email address.'); return; }
      if (password.length < 6) { Alert.alert('Weak password', 'Password must be at least 6 characters.'); return; }
      if (password !== confirmPassword) { Alert.alert('Password mismatch', 'Passwords do not match.'); return; }
    } else {
      if (!email.trim() || !password.trim()) { Alert.alert('Missing information', 'Enter your email and password.'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { Alert.alert('Invalid email', 'Enter a valid email address.'); return; }
    }

    setIsSubmitting(true);
    try {
      if (authMode === 'register') {
        const result = await registerUser({ email: email.trim().toLowerCase(), fullName: fullName.trim(), password, role: selectedRole, assignedSite: selectedRole === 'buyer' ? undefined : selectedSite, guestSubRole: selectedRole === 'guest' ? selectedSubRole : undefined, businessName: selectedRole === 'buyer' ? businessName.trim() : undefined, verificationDocument: selectedRole === 'buyer' ? verificationDocument ?? undefined : undefined, goldbodLicenseNumber: selectedRole === 'buyer' && goldbodLicenseNumber.trim() ? goldbodLicenseNumber.trim() : undefined });
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
      } else if (msg.includes('LOCKED')) {
        Alert.alert('Account temporarily locked', 'Too many failed login attempts. Try again in 15 minutes, or contact your supervisor to reset your password.');
      } else if (msg.includes('EXPIRED')) {
        Alert.alert('Access expired', 'Your guest session has expired. Contact your site administrator.');
      } else if (msg.includes('INVALID_CREDENTIALS') || msg.includes('401')) {
        Alert.alert('Incorrect credentials', 'Check your email and password.');
      } else if (msg.includes('409') || msg.includes('Conflict')) {
        Alert.alert('Already registered', 'An account with this email exists. Try signing in.');
      } else if (msg.includes('400')) {
        Alert.alert('Invalid details', 'Check your information and try again.');
      } else {
        Alert.alert('Error', parseApiError(error));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitGuestCode() {
    setGuestError('');
    if (!guestCode.trim()) { setGuestError('Enter a 6-digit code or scan the QR.'); return; }
    if (!guestName.trim()) { setGuestError('Enter your full name.'); return; }
    if (!guestPhone.trim()) { setGuestError('Enter your phone number.'); return; }
    setGuestSubmitting(true);
    try {
      const session = await redeemGuestCode(guestCode.trim(), guestName.trim(), guestPhone.trim());
      onAuthenticated(session);
    } catch (error: any) {
      const msg = error?.message ?? '';
      if (msg.includes('404')) setGuestError('Code not found. Check the PIN and try again.');
      else if (msg.includes('409')) setGuestError('This code has reached its guest limit.');
      else if (msg.includes('410')) setGuestError('This code has been revoked or expired.');
      else setGuestError('Could not join. Check your connection and try again.');
    } finally {
      setGuestSubmitting(false);
    }
  }

  async function startScan() {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Camera permission required', 'Allow camera access to scan the QR code.');
        return;
      }
    }
    setScanning(true);
  }

  if (scanning) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#000' }]}>
        <CameraView
          style={{ flex: 1 }}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => {
            setGuestCode(data.trim());
            setScanning(false);
          }}
        />
        <Pressable
          onPress={() => setScanning(false)}
          style={{ position: 'absolute', top: 48, left: 20, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>✕ Cancel</Text>
        </Pressable>
        <View style={{ position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Point camera at the QR code</Text>
        </View>
      </SafeAreaView>
    );
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
          <Pressable onPress={() => { setPendingApproval(false); setAuthMode('login'); }} style={styles.submitBtn}>
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
            <Pressable onPress={() => setAuthMode('login')} style={[styles.modeBtn, authMode === 'login' && styles.modeBtnActive]}>
              <Text style={[styles.modeBtnText, authMode === 'login' && styles.modeBtnTextActive]}>Sign In</Text>
            </Pressable>
            <Pressable onPress={() => setAuthMode('register')} style={[styles.modeBtn, authMode === 'register' && styles.modeBtnActive]}>
              <Text style={[styles.modeBtnText, authMode === 'register' && styles.modeBtnTextActive]}>Register</Text>
            </Pressable>
            <Pressable onPress={() => setAuthMode('guest')} style={[styles.modeBtn, authMode === 'guest' && styles.modeBtnActive]}>
              <Text style={[styles.modeBtnText, authMode === 'guest' && styles.modeBtnTextActive]}>Guest Code</Text>
            </Pressable>
          </View>

          {/* Guest code form */}
          {authMode === 'guest' ? (
            <>
              <View style={styles.adminNote}>
                <Text style={styles.adminNoteText}>🎟 Join a site session using a PIN or QR code provided by your supervisor.</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>6-Digit Code</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    value={guestCode}
                    onChangeText={setGuestCode}
                    placeholder="e.g. 042817"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                    returnKeyType="next"
                  />
                  <Pressable onPress={startScan} style={styles.showPasswordBtn}>
                    <Text style={{ fontSize: 20 }}>📷</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Your Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={guestName}
                  onChangeText={setGuestName}
                  placeholder="As it appears on your ID"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={guestPhone}
                  onChangeText={setGuestPhone}
                  placeholder="+233 XX XXX XXXX"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onSubmitEditing={submitGuestCode}
                />
              </View>

              {guestError ? <Text style={styles.guestError}>{guestError}</Text> : null}

              <Pressable
                disabled={guestSubmitting}
                onPress={submitGuestCode}
                style={[styles.submitBtn, guestSubmitting && styles.submitBtnDisabled]}
              >
                <Text style={styles.submitBtnText}>
                  {guestSubmitting ? 'Joining…' : 'Join as Guest →'}
                </Text>
              </Pressable>
            </>
          ) : null}

          {/* Register extras */}
          {authMode === 'register' ? (
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

              {selectedRole === 'buyer' ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Business Name</Text>
                    <TextInput
                      style={styles.input}
                      value={businessName}
                      onChangeText={setBusinessName}
                      placeholder="Registered company name"
                      placeholderTextColor={theme.textMuted}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>GoldBod License Number <Text style={{ color: theme.textMuted, fontWeight: '500' }}>(optional — required to bid on gold)</Text></Text>
                    <TextInput
                      style={styles.input}
                      value={goldbodLicenseNumber}
                      onChangeText={setGoldbodLicenseNumber}
                      placeholder="e.g. GB-T1-2025-00123"
                      placeholderTextColor={theme.textMuted}
                      autoCapitalize="characters"
                      returnKeyType="next"
                    />
                  </View>
                  <Text style={styles.fieldLabel}>Verification Document</Text>
                  <Pressable
                    onPress={async () => {
                      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                      if (status !== 'granted') { Alert.alert('Permission required', 'Allow photo library access to upload a document.'); return; }
                      const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });
                      if (!result.canceled && result.assets[0].base64) {
                        setVerificationDocument('data:image/jpeg;base64,' + result.assets[0].base64);
                      }
                    }}
                    style={[styles.docUploadBtn, verificationDocument ? styles.docUploadBtnDone : null]}
                  >
                    {verificationDocument ? (
                      <Image source={{ uri: verificationDocument }} style={styles.docThumb} />
                    ) : null}
                    <Text style={styles.docUploadText}>{verificationDocument ? '✓ Document attached — tap to change' : '📎 Attach business registration or ID'}</Text>
                  </Pressable>
                </>
              ) : null}

              {selectedRole !== 'buyer' ? (
                <>
                  <Text style={styles.fieldLabel}>Assigned Site</Text>
                  <View style={styles.siteGrid}>
                    {SITES.map((site) => (
                      <Pressable key={site} onPress={() => setSelectedSite(site)} style={[styles.sitePill, selectedSite === site && styles.sitePillActive]}>
                        <Text style={[styles.sitePillText, selectedSite === site && styles.sitePillTextActive]}>{site}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput autoCapitalize="words" onChangeText={setFullName} placeholder="Your full name" placeholderTextColor={theme.textMuted} returnKeyType="next" style={styles.input} value={fullName} />
              </View>
            </>
          ) : null}

          {/* Email / Password — hidden in guest mode */}
          {authMode !== 'guest' ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="your@email.com" placeholderTextColor={theme.textMuted} returnKeyType="next" style={styles.input} value={email} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={styles.passwordRow}>
                  <TextInput onChangeText={setPassword} placeholder={authMode === 'register' ? 'Min. 6 characters' : 'Your password'} placeholderTextColor={theme.textMuted} returnKeyType={authMode === 'register' ? 'next' : 'done'} secureTextEntry={!showPassword} style={[styles.input, { flex: 1, marginBottom: 0 }]} value={password} onSubmitEditing={authMode === 'login' ? submit : undefined} />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.showPasswordBtn}>
                    <Text style={styles.showPasswordText}>{showPassword ? 'Hide' : 'Show'}</Text>
                  </Pressable>
                </View>
              </View>

              {authMode === 'register' ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Confirm Password</Text>
                  <TextInput onChangeText={setConfirmPassword} onSubmitEditing={submit} placeholder="Repeat your password" placeholderTextColor={theme.textMuted} returnKeyType="done" secureTextEntry={!showPassword} style={styles.input} value={confirmPassword} />
                </View>
              ) : null}

              {authMode === 'login' && biometricAvailable && storedEmail ? (
                <Pressable
                  onPress={handleBiometricLogin}
                  disabled={biometricLoading}
                  style={[styles.biometricBtn, biometricLoading && styles.submitBtnDisabled]}
                >
                  <Text style={styles.biometricIcon}>
                    {Platform.OS === 'ios' ? '🔒' : '🫆'}
                  </Text>
                  <Text style={styles.biometricText}>
                    {biometricLoading ? 'Verifying…' : `Sign in as ${storedEmail}`}
                  </Text>
                </Pressable>
              ) : null}

              <Pressable disabled={isSubmitting} onPress={submit} style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}>
                <Text style={styles.submitBtnText}>
                  {isSubmitting ? 'Please wait...' : authMode === 'login' ? 'Sign In with Password →' : 'Create Account →'}
                </Text>
              </Pressable>

              {authMode === 'login' ? (
                <Text style={styles.hint}>Don't have an account? Tap Register above.</Text>
              ) : null}
            </>
          ) : null}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: { backgroundColor: theme.bg, flex: 1 },
    flex: { flex: 1 },
    container: { flexGrow: 1, padding: 24, paddingBottom: 40 },

    header: { alignItems: 'center', marginBottom: 32, marginTop: 16 },
    logoMark: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 20, height: 56, justifyContent: 'center', marginBottom: 12, width: 56 },
    logoMarkText: { fontSize: 24 },
    brand: { color: theme.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 },
    tagline: { color: theme.textSub, fontSize: 13, fontWeight: '600' },

    modeSwitch: { backgroundColor: theme.bgCard, borderRadius: 10, flexDirection: 'row', marginBottom: 24, padding: 4 },
    modeBtn: { alignItems: 'center', borderRadius: 8, flex: 1, paddingVertical: 10 },
    modeBtnActive: { backgroundColor: theme.accent },
    modeBtnText: { color: theme.textMuted, fontSize: 14, fontWeight: '800' },
    modeBtnTextActive: { color: '#ffffff' },

    fieldLabel: { color: theme.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },

    roleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    roleCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, flex: 1, padding: 14 },
    roleCardActive: { backgroundColor: theme.accentLight, borderColor: theme.accent },
    roleIcon: { fontSize: 22, marginBottom: 6 },
    roleLabel: { color: theme.textMuted, fontSize: 13, fontWeight: '900', marginBottom: 3 },
    roleLabelActive: { color: theme.accent },
    roleDesc: { color: theme.textSub, fontSize: 11, fontWeight: '600', textAlign: 'center' },

    adminNote: { backgroundColor: theme.amberLight, borderColor: theme.amber, borderLeftColor: theme.amber, borderLeftWidth: 3, borderRadius: 8, borderWidth: 1, marginBottom: 20, padding: 12 },
    adminNoteText: { color: theme.amber, fontSize: 12, fontWeight: '600' },

    siteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    sitePill: { borderColor: theme.border, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
    sitePillActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    sitePillText: { color: theme.textMuted, fontSize: 12, fontWeight: '800' },
    sitePillTextActive: { color: '#ffffff' },

    inputGroup: { marginBottom: 16 },
    input: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, color: theme.text, fontSize: 15, marginBottom: 0, minHeight: 48, paddingHorizontal: 14 },

    passwordRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
    showPasswordBtn: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, height: 48, alignItems: 'center', justifyContent: 'center', width: 48 },
    showPasswordText: { color: theme.textMuted, fontSize: 12, fontWeight: '800' },

    biometricBtn: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.accent, borderRadius: 10, borderWidth: 1.5, flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 12, marginTop: 8, minHeight: 52, paddingHorizontal: 20 },
    biometricIcon: { fontSize: 22 },
    biometricText: { color: theme.accent, fontSize: 14, fontWeight: '800' },
    submitBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 10, marginTop: 8, minHeight: 52, justifyContent: 'center' },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },

    hint: { color: theme.textSub, fontSize: 13, fontWeight: '600', marginTop: 16, textAlign: 'center' },
    guestError: { color: theme.danger, fontSize: 13, fontWeight: '700', marginBottom: 10 },
    pendingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    pendingIcon: { marginBottom: 20 },
    pendingTitle: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
    pendingBody: { color: theme.textSub, fontSize: 14, fontWeight: '600', lineHeight: 22, marginBottom: 32, textAlign: 'center' },
    docUploadBtn: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderStyle: 'dashed', borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 20, padding: 14 },
    docUploadBtnDone: { borderColor: theme.accent, borderStyle: 'solid' },
    docUploadText: { color: theme.textMuted, flex: 1, fontSize: 13, fontWeight: '700' },
    docThumb: { borderRadius: 6, height: 40, width: 40 },
  });
}
