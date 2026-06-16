import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuditLogFeed } from '../components/AuditLogFeed';
import { HazardCard } from '../components/HazardCard';
import { InputField } from '../components/InputField';
import { roleDefinitions } from '../data/roles';
import {
  closeHazardReport,
  completeVisitorInduction,
  createDangerZone,
  createHazardReport,
  createNotice,
  createSupervisorMessage,
  getAuditLogs,
  getHazardReports,
  getNotices,
  getWorkerProfile,
  markNoticeSeen,
  reportEquipmentFault,
  requestEquipmentMaintenance,
  reviewHazardReport,
  updateWorkerEquipmentStatus,
} from '../services/api';
import type { AuditLog as AuditLogItem, HazardReport, Notice, WorkerProfile } from '../types/actions';
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
  const [activeSubtab, setActiveSubtab] = useState<RoleSubtab>('actions');
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Form state
  const [hazardType, setHazardType] = useState('Ground instability');
  const [hazardLocation, setHazardLocation] = useState('Zone A');
  const [hazardDescription, setHazardDescription] = useState('');
  const [hazardAction, setHazardAction] = useState('Area isolated and assigned for follow-up');
  const [briefingMessage, setBriefingMessage] = useState('Avoid Zone B until clearance is completed.');
  const [noticeTitle, setNoticeTitle] = useState('Zone B restriction');
  const [noticeMessage, setNoticeMessage] = useState('Zone B is restricted until clearance.');
  const [equipmentStatus, setEquipmentStatus] = useState('Needs Check');
  const [equipmentFaultDescription, setEquipmentFaultDescription] = useState('');
  const [maintenanceDetails, setMaintenanceDetails] = useState('');

  const role = roleDefinitions.find((item) => item.id === selectedRole) ?? roleDefinitions[0];
  const canViewAuditLog = role.auditLogAccess;
  const canClearHazards = selectedRole === 'supervisor' || selectedRole === 'safetyOfficer';

  useEffect(() => {
    loadHazardsForReview();
  }, [selectedRole, currentUser.email]);

  useEffect(() => {
    if (activeSubtab === 'auditLog') {
      loadAuditLog();
    }
  }, [activeSubtab]);

  function changeRole(roleId: UserRole) {
    onRoleChange(roleId);
    setActiveSubtab('overview');
    setStatusMessage('');
  }

  async function submitHazardReport() {
    const description = hazardDescription.trim();
    if (!description) {
      Alert.alert('Missing details', 'Enter the hazard details.');
      return;
    }
    try {
      const report = await createHazardReport({
        description,
        hazardType: hazardType.trim() || 'General',
        location: hazardLocation.trim() || 'Unspecified location',
        reportedByEmail: currentUser.email,
        reportedByName: currentUser.fullName,
        reportedByRole: selectedRole,
        site: 'Obuasi Mine',
      });
      setHazards((current) => [report, ...current]);
      setHazardDescription('');
      setStatusMessage(`Hazard report #${report.id} submitted.`);
      Alert.alert('Hazard reported', `Report #${report.id} was sent to safety.`);
    } catch {
      Alert.alert('Action failed', 'Could not submit the hazard report.');
    }
  }

  async function loadWorkerProfile() {
    try {
      const profile = await getWorkerProfile(currentUser.email);
      setWorkerProfile(profile);
      setStatusMessage('Worker profile loaded.');
    } catch {
      Alert.alert('Action failed', 'Could not load worker profile.');
    }
  }

  async function updateAssignedEquipmentStatus() {
    const equipment = workerProfile?.assignedEquipment[0];
    if (!equipment) { Alert.alert('No equipment', 'Load profile first.'); return; }
    try {
      const updated = await updateWorkerEquipmentStatus(equipment.id, equipmentStatus.trim() || 'Needs Check', currentUser.fullName);
      setWorkerProfile((current) =>
        current ? { ...current, assignedEquipment: current.assignedEquipment.map((item) => item.id === updated.id ? updated : item) } : current,
      );
      setStatusMessage(`${updated.code} updated.`);
    } catch {
      Alert.alert('Action failed', 'Could not update equipment.');
    }
  }

  async function submitEquipmentFault() {
    const equipment = workerProfile?.assignedEquipment[0];
    if (!equipment) { Alert.alert('No equipment', 'Load profile first.'); return; }
    try {
      const fault = await reportEquipmentFault({
        description: equipmentFaultDescription.trim() || 'Equipment fault reported',
        equipmentCode: equipment.code,
        workerEmail: currentUser.email,
        workerName: currentUser.fullName,
      });
      setWorkerProfile((current) => current ? { ...current, equipmentFaults: [fault, ...current.equipmentFaults] } : current);
      setEquipmentFaultDescription('');
      setStatusMessage(`Fault #${fault.id} reported.`);
    } catch {
      Alert.alert('Action failed', 'Could not report fault.');
    }
  }

  async function submitMaintenanceRequest() {
    const equipment = workerProfile?.assignedEquipment[0];
    if (!equipment) { Alert.alert('No equipment', 'Load profile first.'); return; }
    try {
      const request = await requestEquipmentMaintenance({
        equipmentCode: equipment.code,
        requestDetails: maintenanceDetails.trim() || 'Maintenance requested',
        workerEmail: currentUser.email,
        workerName: currentUser.fullName,
      });
      setWorkerProfile((current) => current ? { ...current, maintenanceRequests: [request, ...current.maintenanceRequests] } : current);
      setMaintenanceDetails('');
      setStatusMessage(`Maintenance #${request.id} requested.`);
    } catch {
      Alert.alert('Action failed', 'Could not request maintenance.');
    }
  }

  async function sendSupervisorMessage() {
    try {
      const message = await createSupervisorMessage({
        actorEmail: currentUser.email,
        actorName: currentUser.fullName,
        audience: 'Workers - Obuasi Mine',
        message: briefingMessage.trim() || 'Daily briefing sent',
        senderRole: selectedRole,
      });
      setStatusMessage(`Message #${message.id} sent to workers.`);
      Alert.alert('Message sent', `Briefing #${message.id} was sent.`);
    } catch {
      Alert.alert('Action failed', 'Could not send the supervisor message.');
    }
  }

  async function postNotice() {
    try {
      const notice = await createNotice({
        actorEmail: currentUser.email,
        actorName: currentUser.fullName,
        message: noticeMessage.trim() || 'New site notice posted',
        postedByRole: selectedRole,
        title: noticeTitle.trim() || 'Site Notice',
      });
      setNotices((current) => [notice, ...current]);
      setStatusMessage(`Notice #${notice.id} posted.`);
    } catch {
      Alert.alert('Action failed', 'Could not post notice.');
    }
  }

  async function loadNotices() {
    try {
      const noticeList = await getNotices();
      setNotices(noticeList);
      setStatusMessage(`${noticeList.length} notice(s) loaded.`);
    } catch {
      Alert.alert('Action failed', 'Could not load notices.');
    }
  }

  async function viewLatestNotice() {
    const latestNotice = notices[0];
    if (!latestNotice) { Alert.alert('No notices', 'Load notices first.'); return; }
    try {
      const updated = await markNoticeSeen(latestNotice.id, currentUser);
      setNotices((current) => current.map((notice) => notice.id === updated.id ? updated : notice));
      setStatusMessage(`Notice #${updated.id} seen.`);
    } catch {
      Alert.alert('Action failed', 'Could not mark notice as seen.');
    }
  }

  async function createSafetyDangerZone() {
    try {
      const zone = await createDangerZone({
        actorEmail: currentUser.email,
        actorName: currentUser.fullName,
        actorRole: selectedRole,
        riskLevel: 'High',
        site: 'Obuasi Mine',
        zoneName: 'Zone B - Blasting Area',
      });
      setStatusMessage(`Danger zone #${zone.id} created.`);
      Alert.alert('Danger zone created', `${zone.zoneName} is now active.`);
    } catch {
      Alert.alert('Action failed', 'Could not create the danger zone.');
    }
  }

  async function loadHazardsForReview() {
    try {
      const reports = await getHazardReports(selectedRole === 'worker' ? currentUser.email : undefined);
      setHazards(reports);
      setStatusMessage(`${reports.length} hazard report(s) loaded.`);
    } catch {
      Alert.alert('Action failed', 'Could not load hazard reports.');
    }
  }

  async function reviewHazard(id: number) {
    try {
      const reviewed = await reviewHazardReport(id, {
        actionTaken: hazardAction.trim() || 'Hazard reviewed',
        actorEmail: currentUser.email,
        actorName: currentUser.fullName,
        actorRole: selectedRole,
      });
      setHazards((current) => current.map((hazard) => hazard.id === reviewed.id ? reviewed : hazard));
      setStatusMessage(`Hazard report #${reviewed.id} reviewed.`);
      loadAuditLog();
    } catch {
      Alert.alert('Action failed', 'Could not review the hazard report.');
    }
  }

  async function closeHazard(id: number) {
    try {
      const closed = await closeHazardReport(id, {
        actionTaken: hazardAction.trim() || 'Hazard cleared',
        actorEmail: currentUser.email,
        actorName: currentUser.fullName,
        actorRole: selectedRole,
      });
      setHazards((current) => current.map((hazard) => hazard.id === closed.id ? closed : hazard));
      setStatusMessage(`Hazard report #${closed.id} closed.`);
      loadAuditLog();
    } catch {
      Alert.alert('Action failed', 'Could not close the hazard report.');
    }
  }

  async function loadAuditLog() {
    try {
      const logs = await getAuditLogs();
      setAuditLogs(logs);
      setStatusMessage(`${logs.length} audit log item(s) loaded.`);
    } catch {
      Alert.alert('Action failed', 'Could not load audit log.');
    }
  }

  async function completeGuestInduction() {
    try {
      const induction = await completeVisitorInduction({
        actorEmail: currentUser.email,
        actorName: currentUser.fullName,
        actorRole: selectedRole,
        site: 'Obuasi Mine',
        visitorType: 'Guest',
      });
      setStatusMessage(`Visitor induction #${induction.id} completed.`);
      Alert.alert('Induction complete', `Guest induction #${induction.id} was saved.`);
    } catch {
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
        <SubtabButton active={activeSubtab === 'overview'} label="Overview" onPress={() => setActiveSubtab('overview')} />
        <SubtabButton active={activeSubtab === 'actions'} label="Actions" onPress={() => setActiveSubtab('actions')} />
        {canViewAuditLog ? (
          <SubtabButton active={activeSubtab === 'auditLog'} label="Audit Log" onPress={() => setActiveSubtab('auditLog')} />
        ) : null}
      </View>

      {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}

      {activeSubtab === 'overview' ? (
        <RoleOverview role={role} />
      ) : activeSubtab === 'actions' ? (
        <>
          {/* ── Hazard section — always shown ── */}
          <Text style={styles.sectionTitle}>Hazard Reports</Text>

          {selectedRole === 'worker' ? (
            <View style={styles.section}>
              <InputField label="Hazard Type" onChangeText={setHazardType} value={hazardType} />
              <InputField label="Location" onChangeText={setHazardLocation} value={hazardLocation} />
              <InputField label="Description" multiline onChangeText={setHazardDescription} value={hazardDescription} placeholder="Describe the hazard…" />
              <ActionButton label="Submit Hazard Report" onPress={submitHazardReport} tone="danger" />
            </View>
          ) : null}

          {canClearHazards ? (
            <View style={styles.section}>
              <InputField label="Action Taken" multiline onChangeText={setHazardAction} value={hazardAction} placeholder="Describe the action taken…" />
            </View>
          ) : null}

          {hazards.length === 0 ? (
            <ActionNote text="No hazard reports" />
          ) : (
            hazards.slice(0, 6).map((hazard) => (
              <HazardCard
                key={hazard.id}
                canClear={canClearHazards}
                canReview={canClearHazards}
                hazard={hazard}
                onClear={closeHazard}
                onReview={reviewHazard}
              />
            ))
          )}

          {/* ── Role-specific actions ── */}
          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Actions</Text>

          {selectedRole === 'worker' ? (
            <>
              <Text style={styles.sectionSubtitle}>Equipment</Text>
              <ActionButton label="Load My Information" onPress={loadWorkerProfile} />
              <WorkerProfileCard profile={workerProfile} />
              <InputField label="Equipment Status" onChangeText={setEquipmentStatus} value={equipmentStatus} />
              <ActionButton label="Update Equipment Status" onPress={updateAssignedEquipmentStatus} />
              <InputField label="Fault Details" multiline onChangeText={setEquipmentFaultDescription} value={equipmentFaultDescription} placeholder="Describe the fault…" />
              <ActionButton label="Report Equipment Fault" onPress={submitEquipmentFault} tone="danger" />
              <InputField label="Maintenance Details" multiline onChangeText={setMaintenanceDetails} value={maintenanceDetails} placeholder="What maintenance is needed?" />
              <ActionButton label="Request Maintenance" onPress={submitMaintenanceRequest} />

              <Text style={styles.sectionSubtitle}>Records</Text>
              <WorkerRecords profile={workerProfile} />

              <Text style={styles.sectionSubtitle}>Notices</Text>
              <ActionButton label="Load Notices" onPress={loadNotices} />
              <ActionButton label="Mark Latest Notice Seen" onPress={viewLatestNotice} />
              <NoticeList notices={notices} showSeenBy={false} />
            </>
          ) : null}

          {selectedRole === 'supervisor' ? (
            <>
              <InputField label="Briefing Message" multiline onChangeText={setBriefingMessage} value={briefingMessage} />
              <ActionButton label="Send Worker Briefing" onPress={sendSupervisorMessage} />
              <InputField label="Notice Title" onChangeText={setNoticeTitle} value={noticeTitle} />
              <InputField label="Notice Body" multiline onChangeText={setNoticeMessage} value={noticeMessage} />
              <ActionButton label="Post Notice" onPress={postNotice} />
              <ActionButton label="Load Notices" onPress={loadNotices} />
              <NoticeList notices={notices} showSeenBy />
            </>
          ) : null}

          {selectedRole === 'safetyOfficer' ? (
            <>
              <ActionButton label="Create Danger Zone" onPress={createSafetyDangerZone} tone="danger" />
              <InputField label="Notice Title" onChangeText={setNoticeTitle} value={noticeTitle} />
              <InputField label="Notice Body" multiline onChangeText={setNoticeMessage} value={noticeMessage} />
              <ActionButton label="Post Notice" onPress={postNotice} />
              <ActionButton label="Load Notices" onPress={loadNotices} />
              <NoticeList notices={notices} showSeenBy />
            </>
          ) : null}

          {selectedRole === 'guest' ? (
            <>
              <ActionButton label="Load Notices" onPress={loadNotices} />
              <ActionButton label="Mark Latest Notice Seen" onPress={viewLatestNotice} />
              <ActionButton label="Complete Visitor Induction" onPress={completeGuestInduction} />
              <NoticeList notices={notices} showSeenBy={false} />
            </>
          ) : null}
        </>
      ) : (
        <AuditLogFeed logs={auditLogs} onRefresh={loadAuditLog} roleLabel={role.label} />
      )}
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SubtabButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
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
            <View style={[styles.permissionBadge, permission.allowed ? styles.allowedBadge : styles.blockedBadge]}>
              <Text style={[styles.permissionBadgeText, permission.allowed ? styles.allowedBadgeText : styles.blockedBadgeText]}>
                {permission.allowed ? 'Allowed' : 'Blocked'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

function WorkerProfileCard({ profile }: { profile: WorkerProfile | null }) {
  if (!profile) return <ActionNote text="No worker information loaded" />;
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
  if (!profile) return <ActionNote text="No records loaded" />;
  return (
    <>
      <RecordGroup title="Submitted Hazards" records={profile.submittedHazards.map((item) => ({ title: item.description, status: item.status }))} />
      <RecordGroup title="Inspection History" records={profile.inspectionHistory} />
      <RecordGroup title="Training Records" records={profile.trainingRecords} />
      <RecordGroup title="Shift History" records={profile.shiftHistory} />
      <RecordGroup title="Incident Involvement" records={profile.incidentInvolvementHistory} />
      <RecordGroup title="Equipment Faults" records={profile.equipmentFaults.map((item) => ({ title: item.description, status: item.status }))} />
      <RecordGroup title="Maintenance Requests" records={profile.maintenanceRequests.map((item) => ({ title: item.requestDetails, status: item.status }))} />
    </>
  );
}

function RecordGroup({ records, title }: { records: { title: string; status?: string; date?: string }[]; title: string }) {
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

function ActionButton({ label, onPress, tone = 'default' }: { label: string; onPress: () => void; tone?: 'default' | 'danger' }) {
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

function NoticeList({ notices, showSeenBy }: { notices: Notice[]; showSeenBy: boolean }) {
  if (notices.length === 0) return <ActionNote text="No notices" />;
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

// ─── Styles ────────────────────────────────────────────────────────────────────

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
    marginBottom: 6,
  },
  sectionTitle: {
    color: '#17212b',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  sectionTitleSpaced: {
    marginTop: 12,
  },
  sectionSubtitle: {
    color: '#5d6875',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 8,
    marginTop: 14,
    textTransform: 'uppercase',
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
