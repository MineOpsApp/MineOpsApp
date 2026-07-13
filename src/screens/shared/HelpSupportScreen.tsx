import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type FaqItem = { q: string; a: string };
type FaqSection = { category: string; items: FaqItem[] };

const SECTIONS: FaqSection[] = [
  {
    category: 'Getting Started',
    items: [
      { q: 'Why does my account say "pending approval"?', a: 'Worker and guest accounts need a supervisor at your site to approve them before you can sign in. This usually happens quickly during your shift — check with your supervisor if it has been more than a day.' },
      { q: 'I forgot my password. What do I do?', a: 'There is no self-service password reset in the app. Ask a supervisor or safety officer at your site to reset it for you from their Reset Password screen — they will give you a temporary password to sign in with, which you should change afterward.' },
      { q: 'Can I use fingerprint or Face ID to sign in?', a: 'Yes, once you have signed in with your password at least once on a device, you can enable biometric sign-in from the login screen. Your biometric data stays on your device and is never sent to MineOps.' },
    ],
  },
  {
    category: 'Safety Reporting',
    items: [
      { q: 'What is the difference between a hazard report, an incident report, and SOS?', a: 'A hazard report flags a condition that could cause harm before anything happens (e.g. a damaged walkway). An incident report documents something that already happened (an injury, near miss, or equipment damage). SOS is for an active emergency requiring immediate help. Use whichever matches what is actually happening.' },
      { q: 'Is SOS monitored 24/7 like calling emergency services?', a: "No. SOS alerts your site's supervisors and safety officers through the app — it is not a replacement for calling Ghana's emergency services. In a life-threatening emergency, do both: call emergency services and use SOS." },
      { q: 'Who can see the reports I submit?', a: 'Hazard and incident reports are visible to supervisors and safety officers at your site. Serious and Critical incidents also trigger a push notification to them. Illegal mining reports may additionally be forwarded to GoldBod regulators.' },
    ],
  },
  {
    category: 'Working Offline',
    items: [
      { q: 'What happens if I lose signal while submitting a report?', a: 'Hazard reports, incident reports, safety checklists, drill sign-offs, and illegal mining reports are all queued on your device when you are offline, and sent automatically the next time you have a connection. You do not need to resubmit them.' },
      { q: 'How do I know something is still queued?', a: 'The app will tell you a report was "saved offline" when you submit without a connection. Keep the app installed and reconnect when you can — queued items sync in the background.' },
    ],
  },
  {
    category: 'Drills, Checklists & Shifts',
    items: [
      { q: "Why can't I sign off the next drill step?", a: 'Drill steps must be completed in order — setup, then drilling, then blasting, then cleanup. Complete the current step before the next one unlocks.' },
      { q: 'Do I need to submit a safety checklist every shift?', a: 'Yes, once per day before starting work. You can update it later the same day if something changes.' },
    ],
  },
  {
    category: 'Buyers & Marketplace',
    items: [
      { q: 'Why is my buyer account waiting on verification?', a: 'Buyer accounts require GoldBod license verification before you can access the marketplace. A supervisor or safety officer reviews your business details and license number before approving your account.' },
    ],
  },
  {
    category: 'Account & Privacy',
    items: [
      { q: 'How do I see which devices are logged into my account?', a: 'Go to My Account → Active Sessions to see every signed-in device and sign any of them out remotely.' },
      { q: 'How do I control which push notifications I get?', a: 'Go to My Account → Notifications. Hazard and Notice alerts can be turned off; SOS, Incident, and Blast warnings always stay on for safety reasons.' },
      { q: 'Can I get a copy of my data, or delete my account?', a: 'Yes — go to My Account → Data & Privacy to download a copy of your data or permanently delete your account. See the Privacy Policy for what is retained after deletion.' },
    ],
  },
];

function FaqRow({ item, theme }: { item: FaqItem; theme: Theme }) {
  const [open, setOpen] = useState(false);
  const styles = makeStyles(theme);
  return (
    <Pressable onPress={() => setOpen((o) => !o)} style={styles.faqRow}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{item.q}</Text>
        <Text style={styles.faqChevron}>{open ? '−' : '+'}</Text>
      </View>
      {open ? <Text style={styles.faqAnswer}>{item.a}</Text> : null}
    </Pressable>
  );
}

export function HelpSupportScreen() {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Help & Support</Text>
      <Text style={styles.pageSub}>Answers to common questions about using MineOps</Text>

      {SECTIONS.map((section) => (
        <View key={section.category} style={{ marginBottom: 20 }}>
          <Text style={styles.sectionLabel}>{section.category.toUpperCase()}</Text>
          <View style={styles.list}>
            {section.items.map((item, idx) => (
              <View key={item.q} style={idx < section.items.length - 1 ? styles.itemBorder : undefined}>
                <FaqRow item={item} theme={theme} />
              </View>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.contactCard}>
        <Text style={styles.contactTitle}>Still need help?</Text>
        <Text style={styles.contactText}>
          For anything not covered here — account issues, technical problems, or questions about your site — contact your site supervisor or safety officer directly.
        </Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 40 },
    pageTitle: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 4 },
    pageSub: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 20 },
    sectionLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
    list: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
    itemBorder: { borderBottomColor: theme.bgInput, borderBottomWidth: 1 },
    faqRow: { padding: 14 },
    faqHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    faqQuestion: { color: theme.text, flex: 1, fontSize: 14, fontWeight: '800', marginRight: 10 },
    faqChevron: { color: theme.accent, fontSize: 18, fontWeight: '900' },
    faqAnswer: { color: theme.textSub, fontSize: 13, fontWeight: '500', lineHeight: 19, marginTop: 8 },
    contactCard: { backgroundColor: theme.infoLight, borderColor: theme.info, borderRadius: 12, borderWidth: 1, padding: 16 },
    contactTitle: { color: theme.info, fontSize: 14, fontWeight: '900', marginBottom: 6 },
    contactText: { color: theme.info, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  });
}
