import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By creating an account or using the MineOps application ("App"), you agree to be bound by these Terms of Service. If you do not agree, do not register or use the App.',
  },
  {
    title: '2. Eligibility',
    body: 'You must be a working-age adult with the legal authority to enter into a binding agreement, and eligible to work at your assigned mine site under applicable Ghanaian labor law. Use of the App on behalf of a company or organization requires authority to bind that entity to these Terms.',
  },
  {
    title: '3. Account Registration',
    body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Notify us immediately of any unauthorized use. You agree to provide accurate and complete registration information.',
  },
  {
    title: '4. Permitted Use',
    body: 'The App is provided for lawful mining operations management, safety reporting, and related activities. You may not use the App to submit false reports, impersonate other users, interfere with site safety systems, or violate any applicable law or regulation.',
  },
  {
    title: '5. Worker & Supervisor Accounts',
    body: 'Worker accounts require supervisor approval before access is granted. Supervisors are responsible for the accuracy of approvals made under their credentials. Safety-critical actions (incident reports, SOS alerts, hazard submissions) must be used honestly and only when genuinely applicable.',
  },
  {
    title: '6. Buyer & Marketplace Accounts',
    body: 'Buyers must provide accurate business registration and verification documents. False documentation will result in immediate suspension and may be reported to relevant regulatory authorities including GoldBod.',
  },
  {
    title: '7. Offline Data & Queue',
    body: 'The App queues certain actions when offline for later submission. You are responsible for reviewing queued actions before they are sent. Queued data is stored locally on your device and may be lost if the App is uninstalled before synchronisation.',
  },
  {
    title: '8. Intellectual Property',
    body: 'All content, trademarks, and software in the App remain the property of MineOps and its licensors. You may not copy, modify, distribute, or create derivative works without express written permission.',
  },
  {
    title: '9. Privacy',
    body: 'Your use of the App is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By agreeing to these Terms you also consent to the data practices described in the Privacy Policy.',
  },
  {
    title: '10. Disclaimer of Warranties',
    body: 'The App is provided "as is" without warranties of any kind. We do not guarantee uninterrupted access or error-free operation. Safety decisions must not rely solely on App availability.',
  },
  {
    title: '11. Limitation of Liability',
    body: 'To the fullest extent permitted by law, MineOps shall not be liable for any indirect, incidental, consequential, or punitive damages arising from your use of the App.',
  },
  {
    title: '12. Suspension & Termination',
    body: 'We reserve the right to suspend or terminate accounts that violate these Terms, pose a safety risk, or are flagged by a site administrator. You may close your account at any time by contacting support.',
  },
  {
    title: '13. Changes to Terms',
    body: 'We may update these Terms from time to time. Continued use of the App after changes are posted constitutes acceptance of the revised Terms. Material changes will be notified in the App.',
  },
];

export function TermsOfServiceScreen() {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Terms of Service</Text>
      <Text style={styles.pageSub}>Effective date: July 2026</Text>

      <View style={[styles.draftBanner, { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }]}>
        <Ionicons name="warning" size={13} color={theme.amber} style={{ marginTop: 2 }} />
        <Text style={[styles.draftText, { flex: 1 }]}>These Terms are in draft form and subject to change before the App's official public release.</Text>
      </View>

      {SECTIONS.map((s) => (
        <View key={s.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{s.title}</Text>
          <Text style={styles.sectionBody}>{s.body}</Text>
        </View>
      ))}

      <Text style={styles.contact}>Questions about these Terms? Contact your site supervisor or your organization's designated support contact.</Text>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },
    pageTitle: { color: theme.text, fontSize: 24, fontWeight: '900', marginBottom: 4 },
    pageSub: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 16 },
    draftBanner: { backgroundColor: theme.amberLight, borderColor: theme.amber, borderLeftWidth: 4, borderRadius: 8, borderWidth: 1, marginBottom: 24, padding: 12 },
    draftText: { color: theme.amber, fontSize: 12, fontWeight: '700', lineHeight: 18 },
    section: { marginBottom: 20 },
    sectionTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 6 },
    sectionBody: { color: theme.textSub, fontSize: 13, fontWeight: '500', lineHeight: 20 },
    contact: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  });
}
