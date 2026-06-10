import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { roleDefinitions } from '../data/roles';
import {
  closeHazardReport,
  completeVisitorInduction,
  createDangerZone,
  createHazardReport,
  createSupervisorMessage,
  getHazardReports,
} from '../services/api';
import type { HazardReport } from '../types/actions';
import type { UserRole } from '../types/role';

type RolesScreenProps = {
  allowRoleChange?: boolean;
  selectedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
};

type RoleSubtab = 'overview' | 'actions' | 'auditLog';

export function RolesScreen({ allowRoleChange = true, selectedRole, onRoleChange }: RolesScreenProps) {
  const [activeSubtab, setActiveSubtab] = useState<RoleSubtab>('overview');
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const role = roleDefinitions.find((item) => item.id === selectedRole) ?? roleDefinitions[0];
  const canViewAuditLog = role.auditLogAccess;

  function changeRole(roleId: UserRole) {
    onRoleChange(roleId);
    setActiveSubtab('overview');
    setStatusMessage('');
  }

  async function submitHazardReport() {
    try {
      const report = await createHazardReport({
        description: 'Loose rock and unstable walkway reported from mobile app',
        reportedByRole: selectedRole,
        site: 'Obuasi Mine',
      });

      setStatusMessage(`Hazard report #${report.id} submitted.`);
      Alert.alert('Hazard reported', `Report #${report.id} was sent to safety.`);
    } catch (error) {
      Alert.alert('Action failed', 'Could not submit the hazard report.');
    }
  }

  async function sendSupervisorMessage() {
    try {
      const message = await createSupervisorMessage({
        audience: 'Workers - Obuasi Mine',
        message: 'Daily briefing: avoid Zone B until safety clearance is completed.',
        senderRole: selectedRole,
      });

      setStatusMessage(`Message #${message.id} sent to workers.`);
      Alert.alert('Message sent', `Briefing #${message.id} was sent.`);
    } catch (error) {
      Alert.alert('Action failed', 'Could not send the supervisor message.');
    }
  }

  async function createSafetyDangerZone() {
    try {
      const zone = await createDangerZone({
        riskLevel: 'High',
        site: 'Obuasi Mine',
        zoneName: 'Zone B - Blasting Area',
      });

      setStatusMessage(`Danger zone #${zone.id} created.`);
      Alert.alert('Danger zone created', `${zone.zoneName} is now active.`);
    } catch (error) {
      Alert.alert('Action failed', 'Could not create the danger zone.');
    }
  }

  async function loadHazardsForReview() {
    try {
      const reports = await getHazardReports();
      setHazards(reports);
      setStatusMessage(`${reports.length} hazard report(s) loaded.`);
    } catch (error) {
      Alert.alert('Action failed', 'Could not load hazard reports.');
    }
  }

  async function closeFirstOpenHazard() {
    const openHazard = hazards.find((hazard) => hazard.status === 'Open');

    if (!openHazard) {
      Alert.alert('No open hazards', 'Load hazard reports first, or submit a worker hazard.');
      return;
    }

    try {
      const closed = await closeHazardReport(openHazard.id);
      setHazards((current) =>
        current.map((hazard) => (hazard.id === closed.id ? closed : hazard)),
      );
      setStatusMessage(`Hazard report #${closed.id} closed.`);
    } catch (error) {
      Alert.alert('Action failed', 'Could not close the hazard report.');
    }
  }

  async function completeGuestInduction() {
    try {
      const induction = await completeVisitorInduction({
        site: 'Obuasi Mine',
        visitorType: 'Guest',
      });

      setStatusMessage(`Visitor induction #${induction.id} completed.`);
      Alert.alert('Induction complete', `Guest induction #${induction.id} was saved.`);
    } catch (error) {
      Alert.alert('Action failed', 'Could not complete visitor induction.');
    }
  }

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Access planning</Text>
        <Text style={styles.title}>User Roles</Text>
        <Text style={styles.subtitle}>Select a role, then use Actions to test real app functions</Text>
      </View>

      <View style={styles.roleGrid}>
        {(allowRoleChange ? roleDefinitions : [role]).map((item) => {
          const isActive = item.id === selectedRole;

          return (
            <Pressable
              accessibilityRole="button"
              disabled={!allowRoleChange}
              key={item.id}
              onPress={() => changeRole(item.id)}
              style={[styles.roleButton, isActive && styles.activeRoleButton]}
            >
              <Text style={[styles.roleButtonText, isActive && styles.activeRoleButtonText]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.roleCard}>
        <Text style={styles.roleTitle}>{role.label}</Text>
        <Text style={styles.roleSummary}>{role.summary}</Text>
      </View>

      <View style={styles.subtabs}>
        <SubtabButton
          active={activeSubtab === 'overview'}
          label="Overview"
          onPress={() => setActiveSubtab('overview')}
        />
        <SubtabButton
          active={activeSubtab === 'actions'}
          label="Actions"
          onPress={() => setActiveSubtab('actions')}
        />
        {canViewAuditLog ? (
          <SubtabButton
            active={activeSubtab === 'auditLog'}
            label="Audit Log"
            onPress={() => setActiveSubtab('auditLog')}
          />
        ) : null}
      </View>

      {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}

      {activeSubtab === 'overview' ? (
        <RoleOverview role={role} />
      ) : activeSubtab === 'actions' ? (
        <RoleActions
          hazards={hazards}
          onCloseFirstOpenHazard={closeFirstOpenHazard}
          onCompleteGuestInduction={completeGuestInduction}
          onCreateDangerZone={createSafetyDangerZone}
          onLoadHazards={loadHazardsForReview}
          onSendSupervisorMessage={sendSupervisorMessage}
          onSubmitHazard={submitHazardReport}
          role={selectedRole}
        />
      ) : (
        <AuditLog roleLabel={role.label} />
      )}
    </>
  );
}

function SubtabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.subtab, active && styles.activeSubtab]}
    >
      <Text style={[styles.subtabText, active && styles.activeSubtabText]}>{label}</Text>
    </Pressable>
  );
}

function RoleOverview({ role }: { role: (typeof roleDefinitions)[number] }) {
  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Responsibilities</Text>
        {role.responsibilities.map((responsibility) => (
          <View key={responsibility} style={styles.responsibilityRow}>
            <Text style={styles.responsibilityBullet}>-</Text>
            <Text style={styles.responsibilityText}>{responsibility}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permissions</Text>
        {role.permissions.map((permission) => (
          <View key={permission.label} style={styles.permissionRow}>
            <Text style={styles.permissionLabel}>{permission.label}</Text>
            <View
              style={[
                styles.permissionBadge,
                permission.allowed ? styles.allowedBadge : styles.blockedBadge,
              ]}
            >
              <Text
                style={[
                  styles.permissionBadgeText,
                  permission.allowed ? styles.allowedBadgeText : styles.blockedBadgeText,
                ]}
              >
                {permission.allowed ? 'Allowed' : 'Blocked'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

function RoleActions({
  hazards,
  onCloseFirstOpenHazard,
  onCompleteGuestInduction,
  onCreateDangerZone,
  onLoadHazards,
  onSendSupervisorMessage,
  onSubmitHazard,
  role,
}: {
  hazards: HazardReport[];
  onCloseFirstOpenHazard: () => void;
  onCompleteGuestInduction: () => void;
  onCreateDangerZone: () => void;
  onLoadHazards: () => void;
  onSendSupervisorMessage: () => void;
  onSubmitHazard: () => void;
  role: UserRole;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Working Actions</Text>

      {role === 'worker' ? (
        <>
          <ActionButton label="Report Hazard" onPress={onSubmitHazard} tone="danger" />
          <ActionNote text="Inspections, equipment updates, plan acknowledgements, and SOS are part of the worker flow. SOS already posts to the backend." />
        </>
      ) : null}

      {role === 'supervisor' ? (
        <>
          <ActionButton label="Send Worker Briefing" onPress={onSendSupervisorMessage} />
          <ActionButton label="Load Hazard Reports" onPress={onLoadHazards} />
          <HazardList hazards={hazards} />
        </>
      ) : null}

      {role === 'safetyOfficer' ? (
        <>
          <ActionButton label="Create Danger Zone" onPress={onCreateDangerZone} tone="danger" />
          <ActionButton label="Load Hazard Reports" onPress={onLoadHazards} />
          <ActionButton label="Close First Open Hazard" onPress={onCloseFirstOpenHazard} />
          <HazardList hazards={hazards} />
        </>
      ) : null}

      {role === 'guest' ? (
        <>
          <ActionButton label="Complete Visitor Induction" onPress={onCompleteGuestInduction} />
          <ActionNote text="Guest access stays read-only after induction. Guests can receive emergency information but cannot submit reports or edit records." />
        </>
      ) : null}
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  tone = 'default',
}: {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.actionButton, tone === 'danger' && styles.dangerActionButton]}
    >
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

function ActionNote({ text }: { text: string }) {
  return (
    <View style={styles.noteCard}>
      <Text style={styles.noteText}>{text}</Text>
    </View>
  );
}

function HazardList({ hazards }: { hazards: HazardReport[] }) {
  if (hazards.length === 0) {
    return <ActionNote text="No hazard reports loaded yet." />;
  }

  return (
    <>
      {hazards.slice(0, 4).map((hazard) => (
        <View key={hazard.id} style={styles.auditItem}>
          <Text style={styles.auditItemTitle}>
            #{hazard.id} {hazard.status}
          </Text>
          <Text style={styles.auditItemMeta}>{hazard.description}</Text>
        </View>
      ))}
    </>
  );
}

function AuditLog({ roleLabel }: { roleLabel: string }) {
  return (
    <View style={styles.auditCard}>
      <Text style={styles.auditTitle}>Audit Log Access</Text>
      <Text style={styles.auditText}>
        {roleLabel} can review operational changes, report approvals, safety actions, SOS responses,
        and plan updates. Editing audit history stays blocked; this area is for traceability.
      </Text>
      <View style={styles.auditItem}>
        <Text style={styles.auditItemTitle}>Plan change recorded</Text>
        <Text style={styles.auditItemMeta}>Today - Site operations</Text>
      </View>
      <View style={styles.auditItem}>
        <Text style={styles.auditItemTitle}>Inspection approval reviewed</Text>
        <Text style={styles.auditItemMeta}>Today - Compliance trail</Text>
      </View>
      <View style={styles.auditItem}>
        <Text style={styles.auditItemTitle}>SOS response acknowledged</Text>
        <Text style={styles.auditItemMeta}>Today - Emergency action</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  eyebrow: {
    color: '#1f6f5b',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#17212b',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 6,
  },
  subtitle: {
    color: '#5d6875',
    fontSize: 16,
    lineHeight: 22,
    marginTop: 8,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  roleButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    width: '48%',
  },
  activeRoleButton: {
    backgroundColor: '#e7f6ef',
    borderColor: '#1f6f5b',
  },
  roleButtonText: {
    color: '#5d6875',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  activeRoleButtonText: {
    color: '#1f6f5b',
  },
  roleCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 22,
    padding: 16,
  },
  roleTitle: {
    color: '#17212b',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  roleSummary: {
    color: '#5d6875',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  subtabs: {
    backgroundColor: '#edf1f5',
    borderRadius: 8,
    flexDirection: 'row',
    marginBottom: 18,
    padding: 4,
  },
  subtab: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
  },
  activeSubtab: {
    backgroundColor: '#ffffff',
  },
  subtabText: {
    color: '#5d6875',
    fontSize: 14,
    fontWeight: '800',
  },
  activeSubtabText: {
    color: '#1f6f5b',
  },
  statusMessage: {
    color: '#1f6f5b',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 14,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    color: '#17212b',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  responsibilityRow: {
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 12,
  },
  responsibilityBullet: {
    color: '#1f6f5b',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
    paddingRight: 8,
  },
  responsibilityText: {
    color: '#17212b',
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  permissionRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    minHeight: 62,
    padding: 12,
  },
  permissionLabel: {
    color: '#17212b',
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    paddingRight: 10,
  },
  permissionBadge: {
    borderRadius: 8,
    minWidth: 78,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  allowedBadge: {
    backgroundColor: '#e7f6ef',
  },
  blockedBadge: {
    backgroundColor: '#fdeceb',
  },
  permissionBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  allowedBadgeText: {
    color: '#1f7a4d',
  },
  blockedBadgeText: {
    color: '#b42318',
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#1f6f5b',
    borderRadius: 8,
    marginBottom: 10,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  dangerActionButton: {
    backgroundColor: '#b42318',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  noteCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  noteText: {
    color: '#5d6875',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  auditCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 22,
    padding: 16,
  },
  auditTitle: {
    color: '#17212b',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  auditText: {
    color: '#5d6875',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    marginBottom: 14,
  },
  auditItem: {
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  auditItemTitle: {
    color: '#17212b',
    fontSize: 15,
    fontWeight: '800',
  },
  auditItemMeta: {
    color: '#5d6875',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
});
