import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { roleDefinitions } from '../data/roles';
import {
  closeHazardReport,
  completeVisitorInduction,
  createDangerZone,
  createHazardReport,
  createNotice,
  createSupervisorMessage,
  getHazardReports,
  getNotices,
  getWorkerProfile,
  markNoticeSeen,
  reportEquipmentFault,
  requestEquipmentMaintenance,
  updateWorkerEquipmentStatus,
} from '../services/api';
import type { HazardReport, Notice, WorkerProfile } from '../types/actions';
import type { AuthUser } from '../types/auth';
import type { UserRole } from '../types/role';

type RolesScreenProps = {
  allowRoleChange?: boolean;
  currentUser: AuthUser;
  selectedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
};

type RoleSubtab = 'overview' | 'actions' | 'auditLog';

export function RolesScreen({ allowRoleChange = true, currentUser, selectedRole, onRoleChange }: RolesScreenProps) {
  const [activeSubtab, setActiveSubtab] = useState<RoleSubtab>('overview');
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
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

      setHazards((current) => [report, ...current]);
      setStatusMessage(`Hazard report #${report.id} submitted.`);
      Alert.alert('Hazard reported', `Report #${report.id} was sent to safety.`);
    } catch (error) {
      Alert.alert('Action failed', 'Could not submit the hazard report.');
    }
  }

  async function loadWorkerProfile() {
    try {
      const profile = await getWorkerProfile(currentUser.email);
      setWorkerProfile(profile);
      setStatusMessage('Worker profile loaded.');
    } catch (error) {
      Alert.alert('Action failed', 'Could not load worker profile.');
    }
  }

  async function updateAssignedEquipmentStatus() {
    const equipment = workerProfile?.assignedEquipment[0];

    if (!equipment) {
      Alert.alert('No equipment', 'Load profile first.');
      return;
    }

    try {
      const updated = await updateWorkerEquipmentStatus(equipment.id, 'Needs Check');
      setWorkerProfile((current) =>
        current
          ? {
              ...current,
              assignedEquipment: current.assignedEquipment.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : current,
      );
      setStatusMessage(`${updated.code} updated.`);
    } catch (error) {
      Alert.alert('Action failed', 'Could not update equipment.');
    }
  }

  async function submitEquipmentFault() {
    const equipment = workerProfile?.assignedEquipment[0];

    if (!equipment) {
      Alert.alert('No equipment', 'Load profile first.');
      return;
    }

    try {
      const fault = await reportEquipmentFault({
        description: 'Hydraulic leak reported from mobile app',
        equipmentCode: equipment.code,
        workerEmail: currentUser.email,
      });
      setWorkerProfile((current) =>
        current ? { ...current, equipmentFaults: [fault, ...current.equipmentFaults] } : current,
      );
      setStatusMessage(`Fault #${fault.id} reported.`);
    } catch (error) {
      Alert.alert('Action failed', 'Could not report fault.');
    }
  }

  async function submitMaintenanceRequest() {
    const equipment = workerProfile?.assignedEquipment[0];

    if (!equipment) {
      Alert.alert('No equipment', 'Load profile first.');
      return;
    }

    try {
      const request = await requestEquipmentMaintenance({
        equipmentCode: equipment.code,
        requestDetails: 'Maintenance requested from mobile app',
        workerEmail: currentUser.email,
      });
      setWorkerProfile((current) =>
        current
          ? { ...current, maintenanceRequests: [request, ...current.maintenanceRequests] }
          : current,
      );
      setStatusMessage(`Maintenance #${request.id} requested.`);
    } catch (error) {
      Alert.alert('Action failed', 'Could not request maintenance.');
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

  async function postNotice() {
    try {
      const notice = await createNotice({
        message: 'Zone B is restricted until clearance.',
        postedByRole: selectedRole,
        title: 'Zone B restriction',
      });

      setNotices((current) => [notice, ...current]);
      setStatusMessage(`Notice #${notice.id} posted.`);
    } catch (error) {
      Alert.alert('Action failed', 'Could not post notice.');
    }
  }

  async function loadNotices() {
    try {
      const noticeList = await getNotices();
      setNotices(noticeList);
      setStatusMessage(`${noticeList.length} notice(s) loaded.`);
    } catch (error) {
      Alert.alert('Action failed', 'Could not load notices.');
    }
  }

  async function viewLatestNotice() {
    const latestNotice = notices[0];

    if (!latestNotice) {
      Alert.alert('No notices', 'Load notices first.');
      return;
    }

    try {
      const updated = await markNoticeSeen(latestNotice.id, currentUser);
      setNotices((current) =>
        current.map((notice) => (notice.id === updated.id ? updated : notice)),
      );
      setStatusMessage(`Notice #${updated.id} seen.`);
    } catch (error) {
      Alert.alert('Action failed', 'Could not mark notice as seen.');
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

  async function closeHazard(id: number) {
    try {
      const closed = await closeHazardReport(id);
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
          notices={notices}
          workerProfile={workerProfile}
          canClearHazards={selectedRole === 'supervisor' || selectedRole === 'safetyOfficer'}
          onCloseHazard={closeHazard}
          onCompleteGuestInduction={completeGuestInduction}
          onCreateDangerZone={createSafetyDangerZone}
          onLoadHazards={loadHazardsForReview}
          onLoadNotices={loadNotices}
          onLoadWorkerProfile={loadWorkerProfile}
          onReportEquipmentFault={submitEquipmentFault}
          onRequestMaintenance={submitMaintenanceRequest}
          onPostNotice={postNotice}
          onSendSupervisorMessage={sendSupervisorMessage}
          onSubmitHazard={submitHazardReport}
          onUpdateEquipmentStatus={updateAssignedEquipmentStatus}
          onViewLatestNotice={viewLatestNotice}
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
  canClearHazards,
  hazards,
  notices,
  workerProfile,
  onCloseHazard,
  onCompleteGuestInduction,
  onCreateDangerZone,
  onLoadHazards,
  onLoadNotices,
  onLoadWorkerProfile,
  onPostNotice,
  onReportEquipmentFault,
  onRequestMaintenance,
  onSendSupervisorMessage,
  onSubmitHazard,
  onUpdateEquipmentStatus,
  onViewLatestNotice,
  role,
}: {
  canClearHazards: boolean;
  hazards: HazardReport[];
  notices: Notice[];
  workerProfile: WorkerProfile | null;
  onCloseHazard: (id: number) => void;
  onCompleteGuestInduction: () => void;
  onCreateDangerZone: () => void;
  onLoadHazards: () => void;
  onLoadNotices: () => void;
  onLoadWorkerProfile: () => void;
  onPostNotice: () => void;
  onReportEquipmentFault: () => void;
  onRequestMaintenance: () => void;
  onSendSupervisorMessage: () => void;
  onSubmitHazard: () => void;
  onUpdateEquipmentStatus: () => void;
  onViewLatestNotice: () => void;
  role: UserRole;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Hazard Reports</Text>
      <ActionButton label="Load Hazard Reports" onPress={onLoadHazards} />
      <HazardList canClear={canClearHazards} hazards={hazards} onCloseHazard={onCloseHazard} />

      <Text style={styles.sectionTitle}>Actions</Text>

      {role === 'worker' ? (
        <>
          <Text style={styles.sectionTitle}>Equipment</Text>
          <ActionButton label="Load My Information" onPress={onLoadWorkerProfile} />
          <WorkerProfileCard profile={workerProfile} />
          <ActionButton label="Update Equipment Status" onPress={onUpdateEquipmentStatus} />
          <ActionButton label="Report Equipment Fault" onPress={onReportEquipmentFault} tone="danger" />
          <ActionButton label="Request Maintenance" onPress={onRequestMaintenance} />

          <Text style={styles.sectionTitle}>Records</Text>
          <WorkerRecords profile={workerProfile} />

          <Text style={styles.sectionTitle}>Worker Actions</Text>
          <ActionButton label="Report Hazard" onPress={onSubmitHazard} tone="danger" />
          <ActionButton label="Load Notices" onPress={onLoadNotices} />
          <ActionButton label="Mark Latest Notice Seen" onPress={onViewLatestNotice} />
          <NoticeList notices={notices} showSeenBy={false} />
        </>
      ) : null}

      {role === 'supervisor' ? (
        <>
          <ActionButton label="Send Worker Briefing" onPress={onSendSupervisorMessage} />
          <ActionButton label="Post Notice" onPress={onPostNotice} />
          <ActionButton label="Load Notices" onPress={onLoadNotices} />
          <NoticeList notices={notices} showSeenBy />
        </>
      ) : null}

      {role === 'safetyOfficer' ? (
        <>
          <ActionButton label="Create Danger Zone" onPress={onCreateDangerZone} tone="danger" />
          <ActionButton label="Post Notice" onPress={onPostNotice} />
          <ActionButton label="Load Notices" onPress={onLoadNotices} />
          <NoticeList notices={notices} showSeenBy />
        </>
      ) : null}

      {role === 'guest' ? (
        <>
          <ActionButton label="Load Notices" onPress={onLoadNotices} />
          <ActionButton label="Mark Latest Notice Seen" onPress={onViewLatestNotice} />
          <ActionButton label="Complete Visitor Induction" onPress={onCompleteGuestInduction} />
          <NoticeList notices={notices} showSeenBy={false} />
        </>
      ) : null}
    </View>
  );
}

function WorkerProfileCard({ profile }: { profile: WorkerProfile | null }) {
  if (!profile) {
    return <ActionNote text="No worker information loaded" />;
  }

  const equipment = profile.assignedEquipment[0];

  return (
    <>
      <View style={styles.auditItem}>
        <Text style={styles.auditItemTitle}>{profile.fullName}</Text>
        <Text style={styles.auditItemMeta}>{profile.email}</Text>
        <Text style={styles.auditItemMeta}>{profile.assignedSite} - {profile.assignedZone}</Text>
      </View>
      {equipment ? (
        <View style={styles.auditItem}>
          <Text style={styles.auditItemTitle}>{equipment.name} {equipment.code}</Text>
          <Text style={styles.auditItemMeta}>{equipment.status}</Text>
          <Text style={styles.auditItemMeta}>{equipment.instructions}</Text>
        </View>
      ) : null}
    </>
  );
}

function WorkerRecords({ profile }: { profile: WorkerProfile | null }) {
  if (!profile) {
    return <ActionNote text="No records loaded" />;
  }

  return (
    <>
      <RecordGroup title="Submitted Hazards" records={profile.submittedHazards.map((item) => ({
        title: item.description,
        status: item.status,
      }))} />
      <RecordGroup title="Inspection History" records={profile.inspectionHistory} />
      <RecordGroup title="Training Records" records={profile.trainingRecords} />
      <RecordGroup title="Shift History" records={profile.shiftHistory} />
      <RecordGroup title="Incident Involvement" records={profile.incidentInvolvementHistory} />
      <RecordGroup title="Equipment Faults" records={profile.equipmentFaults.map((item) => ({
        title: item.description,
        status: item.status,
      }))} />
      <RecordGroup title="Maintenance Requests" records={profile.maintenanceRequests.map((item) => ({
        title: item.requestDetails,
        status: item.status,
      }))} />
    </>
  );
}

function RecordGroup({
  records,
  title,
}: {
  records: { title: string; status?: string; date?: string }[];
  title: string;
}) {
  return (
    <View style={styles.auditItem}>
      <Text style={styles.auditItemTitle}>{title}</Text>
      {records.length ? (
        records.slice(0, 3).map((record) => (
          <Text key={`${title}-${record.title}`} style={styles.auditItemMeta}>
            {record.title}{record.status ? ` - ${record.status}` : ''}{record.date ? ` - ${record.date}` : ''}
          </Text>
        ))
      ) : (
        <Text style={styles.auditItemMeta}>None</Text>
      )}
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

function HazardList({
  canClear,
  hazards,
  onCloseHazard,
}: {
  canClear: boolean;
  hazards: HazardReport[];
  onCloseHazard: (id: number) => void;
}) {
  if (hazards.length === 0) {
    return <ActionNote text="No hazard reports" />;
  }

  return (
    <>
      {hazards.slice(0, 4).map((hazard) => (
        <View key={hazard.id} style={styles.auditItem}>
          <Text style={styles.auditItemTitle}>
            #{hazard.id} {hazard.status}
          </Text>
          <Text style={styles.auditItemMeta}>{hazard.description}</Text>
          {canClear && hazard.status === 'Open' ? (
            <Pressable onPress={() => onCloseHazard(hazard.id)} style={styles.smallButton}>
              <Text style={styles.smallButtonText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </>
  );
}

function NoticeList({ notices, showSeenBy }: { notices: Notice[]; showSeenBy: boolean }) {
  if (notices.length === 0) {
    return <ActionNote text="No notices" />;
  }

  return (
    <>
      {notices.slice(0, 3).map((notice) => (
        <View key={notice.id} style={styles.auditItem}>
          <Text style={styles.auditItemTitle}>{notice.title}</Text>
          <Text style={styles.auditItemMeta}>{notice.message}</Text>
          {showSeenBy ? (
            <Text style={styles.auditItemMeta}>
              Seen: {notice.seenBy.length ? notice.seenBy.map((seen) => seen.fullName).join(', ') : 'None'}
            </Text>
          ) : null}
        </View>
      ))}
    </>
  );
}

function AuditLog({ roleLabel }: { roleLabel: string }) {
  return (
    <View style={styles.auditCard}>
      <Text style={styles.auditTitle}>{roleLabel} Audit Log</Text>
      <View style={styles.auditItem}>
        <Text style={styles.auditItemTitle}>Plan change recorded</Text>
      </View>
      <View style={styles.auditItem}>
        <Text style={styles.auditItemTitle}>Inspection approval reviewed</Text>
      </View>
      <View style={styles.auditItem}>
        <Text style={styles.auditItemTitle}>SOS response acknowledged</Text>
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
  smallButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#1f6f5b',
    borderRadius: 8,
    marginTop: 10,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  smallButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
});
