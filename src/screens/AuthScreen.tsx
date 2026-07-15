import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
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
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { loginUser, parseApiError, registerUser, redeemGuestCode, setAuthToken, tryRestoreSession } from '../services/api';
import { useTheme, spacing, typography, type Theme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import type { AuthSession } from '../types/auth';
import type { UserRole } from '../types/role';
import { TermsOfServiceScreen } from './legal/TermsOfServiceScreen';
import { PrivacyPolicyScreen } from './legal/PrivacyPolicyScreen';

const WORKER_ROLES = [
  { id: 'worker' as UserRole, label: 'Worker', description: 'Field worker on site' },
  { id: 'guest' as UserRole, label: 'Guest', description: 'Visitor or contractor' },
  { id: 'buyer' as UserRole, label: 'Buyer', description: 'Purchase minerals from mines' },
];

const SITES = ['Obuasi Mine', 'Tarkwa Mine', 'Bogoso Mine', 'Prestea Mine'];

type AuthScreenProps = {
  storedEmail: string | null;
  onAuthenticated: (session: AuthSession) => void;
};

export function AuthScreen({ storedEmail, onAuthenticated }: AuthScreenProps) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme, mode);

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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  const [guestCode, setGuestCode]         = useState('');
  const [guestName, setGuestName]         = useState('');
  const [guestPhone, setGuestPhone]       = useState('');
  const [guestError, setGuestError]       = useState('');
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  const [scanning, setScanning]           = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const blurTint = mode === 'dark' ? 'dark' : 'light';

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
      if (!acceptedTerms) { Alert.alert('Terms required', 'Please accept the Terms of Service and Privacy Policy to register.'); return; }
    } else {
      if (!email.trim() || !password.trim()) { Alert.alert('Missing information', 'Enter your email and password.'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { Alert.alert('Invalid email', 'Enter a valid email address.'); return; }
    }

    setIsSubmitting(true);
    try {
      if (authMode === 'register') {
        const result = await registerUser({ email: email.trim().toLowerCase(), fullName: fullName.trim(), password, role: selectedRole, assignedSite: selectedRole === 'buyer' ? undefined : selectedSite, guestSubRole: selectedRole === 'guest' ? selectedSubRole : undefined, businessName: selectedRole === 'buyer' ? businessName.trim() : undefined, verificationDocument: selectedRole === 'buyer' ? verificationDocument ?? undefined : undefined, goldbodLicenseNumber: selectedRole === 'buyer' && goldbodLicenseNumber.trim() ? goldbodLicenseNumber.trim() : undefined, acceptedTerms: true });
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
          style={{ position: 'absolute', top: 48, left: 20, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Ionicons name="close" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Cancel</Text>
        </Pressable>
        <View style={{ position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Point camera at the QR code</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (pendingApproval) {
    return (
      <ImageBackground source={require('../../assets/auth-background.jpg')} style={styles.bgImage} resizeMode="cover">
        <LinearGradient
          colors={['rgba(20,13,8,0.40)', 'rgba(20,13,8,0.68)', 'rgba(20,13,8,0.92)']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.pendingContainer}>
            <View style={styles.pendingIcon}><Ionicons name="hourglass-outline" size={40} color={theme.accent} /></View>
            <Text style={styles.pendingTitle}>Account Submitted</Text>
            <Text style={styles.pendingBody}>
              Your account is pending supervisor approval. You'll be able to sign in once a supervisor reviews and approves your registration.
            </Text>
            <Pressable onPress={() => { setPendingApproval(false); setAuthMode('login'); }} style={styles.submitBtn}>
              <Text style={styles.submitBtnText}>Back to Sign In</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../../assets/auth-background.jpg')} style={styles.bgImage} resizeMode="cover">
      <LinearGradient
        colors={['rgba(20,13,8,0.25)', 'rgba(20,13,8,0.55)', 'rgba(20,13,8,0.88)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoMark}>
                <MaterialCommunityIcons name="pickaxe" size={32} color="#ffffff" />
              </View>
              <Text style={styles.brand}>MineOps</Text>
              <Text style={styles.tagline}>Mining operations & safety platform</Text>
            </View>

            {/* Mode toggle */}
            <View style={styles.modeSwitch}>
              <BlurView intensity={45} tint={blurTint} style={styles.glassBase} />
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
                  <BlurView intensity={45} tint={blurTint} style={styles.glassBase} />
                  <MaterialCommunityIcons name="ticket-confirmation-outline" size={14} color={theme.amber} />
                  <Text style={styles.adminNoteText}>Join a site session using a PIN or QR code provided by your supervisor.</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>6-Digit Code</Text>
                  <View style={styles.passwordRow}>
                    <BlurView intensity={45} tint={blurTint} style={[styles.inputWrap, { flex: 1 }]}>
                      <TextInput
                        style={styles.inputInner}
                        value={guestCode}
                        onChangeText={setGuestCode}
                        placeholder="e.g. 042817"
                        placeholderTextColor={theme.textMuted}
                        keyboardType="number-pad"
                        maxLength={6}
                        returnKeyType="next"
                      />
                    </BlurView>
                    <Pressable onPress={startScan} style={styles.showPasswordBtn}>
                      <BlurView intensity={45} tint={blurTint} style={styles.glassBase} />
                      <Ionicons name="camera" size={20} color={theme.textMuted} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Your Full Name</Text>
                  <BlurView intensity={45} tint={blurTint} style={styles.inputWrap}>
                    <TextInput
                      style={styles.inputInner}
                      value={guestName}
                      onChangeText={setGuestName}
                      placeholder="As it appears on your ID"
                      placeholderTextColor={theme.textMuted}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </BlurView>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Phone Number</Text>
                  <BlurView intensity={45} tint={blurTint} style={styles.inputWrap}>
                    <TextInput
                      style={styles.inputInner}
                      value={guestPhone}
                      onChangeText={setGuestPhone}
                      placeholder="+233 XX XXX XXXX"
                      placeholderTextColor={theme.textMuted}
                      keyboardType="phone-pad"
                      returnKeyType="done"
                      onSubmitEditing={submitGuestCode}
                    />
                  </BlurView>
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
                      {selectedRole !== role.id && <BlurView intensity={45} tint={blurTint} style={styles.glassBase} />}
                      {role.id === 'worker'
                        ? <MaterialCommunityIcons name="pickaxe" size={22} color={selectedRole === role.id ? theme.accent : theme.textMuted} />
                        : role.id === 'guest'
                        ? <Ionicons name="person" size={22} color={selectedRole === role.id ? theme.accent : theme.textMuted} />
                        : <Ionicons name="cart" size={22} color={selectedRole === role.id ? theme.accent : theme.textMuted} />}
                      <Text style={[styles.roleLabel, selectedRole === role.id && styles.roleLabelActive]}>{role.label}</Text>
                      <Text style={[styles.roleDesc, selectedRole === role.id && styles.roleDescActive]}>{role.description}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.adminNote}>
                  <BlurView intensity={45} tint={blurTint} style={styles.glassBase} />
                  <Ionicons name="lock-closed" size={14} color={theme.amber} />
                  <Text style={styles.adminNoteText}>Supervisor & Safety Officer accounts are set up by site administrators</Text>
                </View>

                {selectedRole === 'guest' ? (
                  <>
                    <Text style={styles.fieldLabel}>Guest Type</Text>
                    <View style={styles.roleRow}>
                      {[
                        { id: 'visitor', label: 'Visitor' },
                        { id: 'inspector', label: 'Inspector' },
                        { id: 'investor', label: 'Investor' },
                      ].map((sub) => (
                        <Pressable key={sub.id} onPress={() => setSelectedSubRole(sub.id)} style={[styles.roleCard, selectedSubRole === sub.id && styles.roleCardActive]}>
                          {selectedSubRole !== sub.id && <BlurView intensity={45} tint={blurTint} style={styles.glassBase} />}
                          {sub.id === 'visitor'
                            ? <Ionicons name="person" size={22} color={selectedSubRole === sub.id ? theme.accent : theme.textMuted} />
                            : sub.id === 'inspector'
                            ? <Ionicons name="search" size={22} color={selectedSubRole === sub.id ? theme.accent : theme.textMuted} />
                            : <MaterialCommunityIcons name="chart-line" size={22} color={selectedSubRole === sub.id ? theme.accent : theme.textMuted} />}
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
                      <BlurView intensity={45} tint={blurTint} style={styles.inputWrap}>
                        <TextInput
                          style={styles.inputInner}
                          value={businessName}
                          onChangeText={setBusinessName}
                          placeholder="Registered company name"
                          placeholderTextColor={theme.textMuted}
                          autoCapitalize="words"
                          returnKeyType="next"
                        />
                      </BlurView>
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.fieldLabel}>GoldBod License Number <Text style={{ color: theme.textMuted, fontWeight: '500' }}>(optional — required to bid on gold)</Text></Text>
                      <BlurView intensity={45} tint={blurTint} style={styles.inputWrap}>
                        <TextInput
                          style={styles.inputInner}
                          value={goldbodLicenseNumber}
                          onChangeText={setGoldbodLicenseNumber}
                          placeholder="e.g. GB-T1-2025-00123"
                          placeholderTextColor={theme.textMuted}
                          autoCapitalize="characters"
                          returnKeyType="next"
                        />
                      </BlurView>
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
                      <BlurView intensity={45} tint={blurTint} style={styles.glassBase} />
                      {verificationDocument ? (
                        <Image source={{ uri: verificationDocument }} style={styles.docThumb} />
                      ) : null}
                      {verificationDocument
                        ? <Ionicons name="checkmark" size={16} color={theme.accent} />
                        : <Ionicons name="attach" size={16} color={theme.textMuted} />}
                      <Text style={styles.docUploadText}>{verificationDocument ? 'Document attached — tap to change' : 'Attach business registration or ID'}</Text>
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
                  <BlurView intensity={45} tint={blurTint} style={styles.inputWrap}>
                    <TextInput autoCapitalize="words" onChangeText={setFullName} placeholder="Your full name" placeholderTextColor={theme.textMuted} returnKeyType="next" style={styles.inputInner} value={fullName} />
                  </BlurView>
                </View>
              </>
            ) : null}

            {/* Email / Password — hidden in guest mode */}
            {authMode !== 'guest' ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <BlurView intensity={45} tint={blurTint} style={styles.inputWrap}>
                    <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="your@email.com" placeholderTextColor={theme.textMuted} returnKeyType="next" style={styles.inputInner} value={email} />
                  </BlurView>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <View style={styles.passwordRow}>
                    <BlurView intensity={45} tint={blurTint} style={[styles.inputWrap, { flex: 1 }]}>
                      <TextInput onChangeText={setPassword} placeholder={authMode === 'register' ? 'Min. 6 characters' : 'Your password'} placeholderTextColor={theme.textMuted} returnKeyType={authMode === 'register' ? 'next' : 'done'} secureTextEntry={!showPassword} style={styles.inputInner} value={password} onSubmitEditing={authMode === 'login' ? submit : undefined} />
                    </BlurView>
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.showPasswordBtn}>
                      <BlurView intensity={45} tint={blurTint} style={styles.glassBase} />
                      <Text style={styles.showPasswordText}>{showPassword ? 'Hide' : 'Show'}</Text>
                    </Pressable>
                  </View>
                </View>

                {authMode === 'register' ? (
                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Confirm Password</Text>
                    <BlurView intensity={45} tint={blurTint} style={styles.inputWrap}>
                      <TextInput onChangeText={setConfirmPassword} onSubmitEditing={submit} placeholder="Repeat your password" placeholderTextColor={theme.textMuted} returnKeyType="done" secureTextEntry={!showPassword} style={styles.inputInner} value={confirmPassword} />
                    </BlurView>
                  </View>
                ) : null}

                {authMode === 'register' ? (
                  <View style={styles.termsRow}>
                    <Pressable onPress={() => setAcceptedTerms(!acceptedTerms)} style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                      {acceptedTerms ? <Ionicons name="checkmark" size={14} color="#ffffff" /> : null}
                    </Pressable>
                    <Text style={styles.termsText}>
                      I agree to the{' '}
                      <Text style={styles.termsLink} onPress={() => setLegalModal('terms')}>Terms of Service</Text>
                      {' '}and{' '}
                      <Text style={styles.termsLink} onPress={() => setLegalModal('privacy')}>Privacy Policy</Text>
                    </Text>
                  </View>
                ) : null}

                {authMode === 'login' && biometricAvailable && storedEmail ? (
                  <Pressable
                    onPress={handleBiometricLogin}
                    disabled={biometricLoading}
                    style={[styles.biometricBtn, biometricLoading && styles.submitBtnDisabled]}
                  >
                    <BlurView intensity={45} tint={blurTint} style={styles.glassBase} />
                    {Platform.OS === 'ios'
                      ? <Ionicons name="lock-closed" size={22} color={theme.accent} />
                      : <MaterialCommunityIcons name="fingerprint" size={22} color={theme.accent} />}
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

        {legalModal === 'terms' ? (
          <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setLegalModal(null)}>
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
              <Pressable onPress={() => setLegalModal(null)} style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark" size={16} color={theme.accent} />
                  <Text style={{ color: theme.accent, fontSize: 14, fontWeight: '800' }}>Done</Text>
                </View>
              </Pressable>
              <TermsOfServiceScreen />
            </SafeAreaView>
          </Modal>
        ) : null}

        {legalModal === 'privacy' ? (
          <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setLegalModal(null)}>
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
              <Pressable onPress={() => setLegalModal(null)} style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark" size={16} color={theme.accent} />
                  <Text style={{ color: theme.accent, fontSize: 14, fontWeight: '800' }}>Done</Text>
                </View>
              </Pressable>
              <PrivacyPolicyScreen />
            </SafeAreaView>
          </Modal>
        ) : null}

      </SafeAreaView>
    </ImageBackground>
  );
}

function makeStyles(theme: Theme, mode: string) {
  const isDark = mode === 'dark';
  return StyleSheet.create({
    bgImage: { flex: 1 },
    safeArea: { flex: 1 },
    flex: { flex: 1 },
    container: { flexGrow: 1, padding: spacing.xxl, paddingBottom: 40 },

    header: { alignItems: 'center', marginBottom: spacing.xxxl, marginTop: spacing.lg },
    logoMark: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 20, height: 64, justifyContent: 'center', marginBottom: spacing.md, width: 64 },
    brand: { ...typography.display, color: '#ffffff', marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
    tagline: { ...typography.body, color: 'rgba(255,255,255,0.70)', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },

    modeSwitch: { borderRadius: 10, flexDirection: 'row', marginBottom: spacing.xxl, overflow: 'hidden', padding: 4 },
    modeBtn: { alignItems: 'center', borderRadius: 8, flex: 1, paddingVertical: 10 },
    modeBtnActive: { backgroundColor: theme.accent },
    modeBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '800' },
    modeBtnTextActive: { color: '#ffffff' },

    fieldLabel: { ...typography.label, color: 'rgba(255,255,255,0.75)', marginBottom: spacing.sm },

    roleRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.md },
    roleCard: { alignItems: 'center', borderColor: theme.border, borderRadius: 10, borderWidth: 1, flex: 1, overflow: 'hidden', padding: 14 },
    roleCardActive: { backgroundColor: theme.accentLight, borderColor: theme.accent },
    roleLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '900', marginBottom: 3, marginTop: 6 },
    roleLabelActive: { color: theme.accent },
    roleDesc: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '600', textAlign: 'center' },
    roleDescActive: { color: theme.textSub },

    adminNote: { alignItems: 'flex-start', borderColor: theme.amber, borderLeftColor: theme.amber, borderLeftWidth: 3, borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl, overflow: 'hidden', padding: spacing.md },
    adminNoteText: { color: theme.amber, flex: 1, fontSize: 12, fontWeight: '600' },

    siteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
    sitePill: { borderColor: theme.border, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
    sitePillActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    sitePillText: { ...typography.label, color: 'rgba(255,255,255,0.7)' },
    sitePillTextActive: { color: '#ffffff' },

    inputGroup: { marginBottom: spacing.lg },
    glassBase: { ...StyleSheet.absoluteFillObject, backgroundColor: isDark ? 'rgba(36,27,18,0.70)' : 'rgba(255,255,255,0.70)' },
    inputWrap: { backgroundColor: isDark ? 'rgba(36,27,18,0.70)' : 'rgba(255,255,255,0.70)', borderColor: theme.border, borderRadius: 10, borderWidth: 1, minHeight: 48, overflow: 'hidden' },
    inputInner: { color: theme.text, fontSize: 15, minHeight: 48, paddingHorizontal: 14 },

    passwordRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
    showPasswordBtn: { borderColor: theme.border, borderRadius: 10, borderWidth: 1, height: 48, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', width: 48 },
    showPasswordText: { color: theme.textMuted, fontSize: 12, fontWeight: '800' },

    biometricBtn: { alignItems: 'center', borderColor: theme.accent, borderRadius: 10, borderWidth: 1.5, flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: spacing.md, marginTop: spacing.sm, minHeight: 52, overflow: 'hidden', paddingHorizontal: 20 },
    biometricText: { color: theme.accent, fontSize: 14, fontWeight: '800' },
    submitBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 10, marginTop: spacing.sm, minHeight: 52, justifyContent: 'center' },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },

    hint: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600', marginTop: spacing.lg, textAlign: 'center' },
    guestError: { color: theme.danger, fontSize: 13, fontWeight: '700', marginBottom: 10 },
    pendingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl },
    pendingIcon: { marginBottom: spacing.xl },
    pendingTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900', marginBottom: spacing.md, textAlign: 'center' },
    pendingBody: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', lineHeight: 22, marginBottom: spacing.xxxl, textAlign: 'center' },
    docUploadBtn: { alignItems: 'center', borderColor: theme.border, borderRadius: 10, borderStyle: 'dashed', borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: spacing.xl, overflow: 'hidden', padding: 14 },
    docUploadBtnDone: { borderColor: theme.accent, borderStyle: 'solid' },
    docUploadText: { color: theme.textMuted, flex: 1, fontSize: 13, fontWeight: '700' },
    docThumb: { borderRadius: 6, height: 40, width: 40 },

    termsRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg, marginTop: spacing.xs },
    checkbox: { alignItems: 'center', borderColor: theme.border, borderRadius: 6, borderWidth: 2, height: 24, justifyContent: 'center', width: 24 },
    checkboxChecked: { backgroundColor: theme.accent, borderColor: theme.accent },
    termsText: { color: 'rgba(255,255,255,0.7)', flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
    termsLink: { color: theme.accent, fontWeight: '800', textDecorationLine: 'underline' },
  });
}
