import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import {
  addCertification, deleteCertification, getCertificationHistory,
  getSiteCertifications, getWorkerContactDirectory, updateCertification,
} from '../../services/api';
import type { Certification, CertificationHistory, CertificationPayload, WorkerDirectoryEntry } from '../../services/api';
import type { AuthSession } from '../../types/auth';

type StatusFilter = 'ALL' | 'EXPIRING_SOON' | 'EXPIRED';

const CERT_TYPES = [
  'First Aid Certificate',
  'Mine Safety Certificate',
  'Blasting License',
  'Equipment Operator License',
  'Chemical Handling Certificate',
  'Emergency Response Certificate',
  'Fall Protection Certificate',
  'Confined Space Entry',
  'Explosives Handling License',
  'Underground Mining Certificate',
  'Occupational Health & Safety',
];

function statusColor(s: string) {
  if (s === 'EXPIRED') return '#b42318';
  if (s === 'EXPIRING_SOON') return '#92400e';
  return '#15803d';
}
function statusBg(s: string) {
  if (s === 'EXPIRED') return '#fff5f5';
  if (s === 'EXPIRING_SOON') return '#fef3c7';
  return '#f0fdf4';
}
function daysLabel(days: number, status: string) {
  if (status === 'EXPIRED') return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return 'Expires today';
  return `${days}d left`;
}
function fmt(d: string) {
  try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return d; }
}

type FormState = {
  workerId: number | null;
  certificationName: string;
  customCertName: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  workerId: null, certificationName: '', customCertName: '',
  issuingAuthority: '', issueDate: '', expiryDate: '', notes: '',
};

type Props = { session: AuthSession };

export function SupervisorCertificationsScreen({ session: _ }: Props) {
  const [certs, setCerts] = useState<Certification[]>([]);
  const [workers, setWorkers] = useState<WorkerDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [typeSearch, setTypeSearch] = useState('');
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);
  const [historyCache, setHistoryCache] = useState<Record<number, CertificationHistory[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [workerSearch, setWorkerSearch] = useState('');

  async function load() {
    try {
      const [c, w] = await Promise.all([getSiteCertifications(), getWorkerContactDirectory()]);
      setCerts(c);
      setWorkers(w);
    } catch {}
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // Group certs by worker
  const workerMap: Record<string, { name: string; email: string; certs: Certification[] }> = {};
  for (const cert of certs) {
    if (!workerMap[cert.workerEmail]) {
      workerMap[cert.workerEmail] = { name: cert.workerName, email: cert.workerEmail, certs: [] };
    }
    workerMap[cert.workerEmail].certs.push(cert);
  }

  // Apply filters
  const filteredWorkerEntries = Object.entries(workerMap)
    .map(([email, data]) => {
      let filteredCerts = data.certs;
      if (statusFilter !== 'ALL') filteredCerts = filteredCerts.filter((c) => c.status === statusFilter);
      if (typeSearch.trim()) {
        const q = typeSearch.toLowerCase();
        filteredCerts = filteredCerts.filter((c) => c.certificationName.toLowerCase().includes(q));
      }
      return { email, name: data.name, certs: filteredCerts };
    })
    .filter((entry) => entry.certs.length > 0);

  const totalCerts = certs.length;
  const validCount = certs.filter((c) => c.status === 'VALID').length;
  const expiringCount = certs.filter((c) => c.status === 'EXPIRING_SOON').length;
  const expiredCount = certs.filter((c) => c.status === 'EXPIRED').length;

  function worstStatus(workerCerts: Certification[]): string {
    if (workerCerts.some((c) => c.status === 'EXPIRED')) return 'EXPIRED';
    if (workerCerts.some((c) => c.status === 'EXPIRING_SOON')) return 'EXPIRING_SOON';
    return 'VALID';
  }

  async function toggleHistory(cert: Certification) {
    if (!historyCache[cert.id]) {
      setLoadingHistory(cert.id);
      try {
        const h = await getCertificationHistory(cert.id);
        setHistoryCache((prev) => ({ ...prev, [cert.id]: h }));
      } catch {}
      setLoadingHistory(null);
    } else {
      setHistoryCache((prev) => {
        const next = { ...prev };
        delete next[cert.id];
        return next;
      });
    }
  }

  function openAdd(workerId?: number) {
    setEditingCert(null);
    setForm({ ...EMPTY_FORM, workerId: workerId ?? null });
    setWorkerSearch('');
    setShowModal(true);
  }

  function openEdit(cert: Certification) {
    setEditingCert(cert);
    setForm({
      workerId: cert.workerId,
      certificationName: CERT_TYPES.includes(cert.certificationName) ? cert.certificationName : 'Other',
      customCertName: CERT_TYPES.includes(cert.certificationName) ? '' : cert.certificationName,
      issuingAuthority: cert.issuingAuthority,
      issueDate: cert.issueDate,
      expiryDate: cert.expiryDate,
      notes: cert.notes ?? '',
    });
    setWorkerSearch('');
    setShowModal(true);
  }

  async function handleSave() {
    const finalName = form.certificationName === 'Other' ? form.customCertName.trim() : form.certificationName;
    if (!finalName) return Alert.alert('Required', 'Enter a certification name.');
    if (!form.issuingAuthority.trim()) return Alert.alert('Required', 'Enter the issuing authority.');
    if (!form.issueDate.match(/^\d{4}-\d{2}-\d{2}$/)) return Alert.alert('Invalid', 'Issue date must be YYYY-MM-DD.');
    if (!form.expiryDate.match(/^\d{4}-\d{2}-\d{2}$/)) return Alert.alert('Invalid', 'Expiry date must be YYYY-MM-DD.');
    if (form.issueDate >= form.expiryDate) return Alert.alert('Invalid dates', 'Expiry date must be after issue date.');
    if (!editingCert && !form.workerId) return Alert.alert('Required', 'Select a worker.');

    const payload: CertificationPayload = {
      workerId: form.workerId ?? undefined,
      certificationName: finalName,
      issuingAuthority: form.issuingAuthority.trim(),
      issueDate: form.issueDate,
      expiryDate: form.expiryDate,
      notes: form.notes.trim() || undefined,
    };

    setSaving(true);
    try {
      if (editingCert) {
        const updated = await updateCertification(editingCert.id, payload);
        setCerts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await addCertification(payload);
        setCerts((prev) => [...prev, created]);
      }
      setShowModal(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save. Try again.');
    }
    setSaving(false);
  }

  function handleDelete(cert: Certification) {
    Alert.alert(
      'Delete Certification',
      `Remove ${cert.certificationName} for ${cert.workerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteCertification(cert.id);
              setCerts((prev) => prev.filter((c) => c.id !== cert.id));
            } catch {
              Alert.alert('Error', 'Could not delete. Try again.');
            }
          },
        },
      ]
    );
  }

  const filteredWorkers = workers.filter((w) =>
    w.fullName.toLowerCase().includes(workerSearch.toLowerCase()) ||
    w.email.toLowerCase().includes(workerSearch.toLowerCase())
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1f6f5b" /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f4f6f8' }}>
      {/* Stats strip */}
      <View style={styles.strip}>
        <View style={styles.stripItem}>
          <Text style={styles.stripValue}>{totalCerts}</Text>
          <Text style={styles.stripLabel}>Total</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: '#15803d' }]}>{validCount}</Text>
          <Text style={styles.stripLabel}>Valid</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: '#92400e' }]}>{expiringCount}</Text>
          <Text style={styles.stripLabel}>Expiring</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: '#b42318' }]}>{expiredCount}</Text>
          <Text style={styles.stripLabel}>Expired</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterArea}>
        <View style={styles.filterTabs}>
          {(['ALL', 'EXPIRING_SOON', 'EXPIRED'] as StatusFilter[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterTab, statusFilter === s && styles.filterTabActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.filterTabText, statusFilter === s && styles.filterTabTextActive]}>
                {s === 'ALL' ? 'All' : s === 'EXPIRING_SOON' ? 'Expiring' : 'Expired'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Filter by cert type..."
          placeholderTextColor="#9aa5b1"
          value={typeSearch}
          onChangeText={setTypeSearch}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <TouchableOpacity style={styles.addBtn} onPress={() => openAdd()}>
          <Text style={styles.addBtnText}>+ Add Certification</Text>
        </TouchableOpacity>

        {filteredWorkerEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {certs.length === 0
                ? 'No certifications recorded yet. Tap "Add Certification" to start.'
                : 'No results match your filters.'}
            </Text>
          </View>
        ) : null}

        {filteredWorkerEntries.map(({ email, name, certs: wCerts }) => {
          const isOpen = expandedWorker === email;
          const worst = worstStatus(wCerts);
          return (
            <View key={email} style={styles.workerSection}>
              <TouchableOpacity
                style={styles.workerHeader}
                onPress={() => setExpandedWorker(isOpen ? null : email)}
              >
                <View style={[styles.workerDot, { backgroundColor: statusColor(worst) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.workerName}>{name}</Text>
                  <Text style={styles.workerEmail}>{email}</Text>
                </View>
                <View style={styles.certCountBadge}>
                  <Text style={styles.certCountText}>{wCerts.length}</Text>
                </View>
                <TouchableOpacity style={styles.addWorkerBtn} onPress={() => openAdd(workerMap[email]?.certs[0]?.workerId)}>
                  <Text style={styles.addWorkerBtnText}>+</Text>
                </TouchableOpacity>
                <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isOpen ? (
                <View style={styles.certsContainer}>
                  {wCerts.map((cert) => {
                    const histExpanded = historyCache[cert.id] !== undefined;
                    return (
                      <View
                        key={cert.id}
                        style={[styles.certCard, { backgroundColor: statusBg(cert.status) }]}
                      >
                        <View style={styles.certTop}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.certName}>{cert.certificationName}</Text>
                            <Text style={styles.certAuth}>{cert.issuingAuthority}</Text>
                          </View>
                          <View style={[styles.statusPill, { backgroundColor: statusColor(cert.status) }]}>
                            <Text style={styles.statusPillText}>
                              {cert.status === 'EXPIRING_SOON' ? 'EXPIRING' : cert.status}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.certDates}>
                          {fmt(cert.issueDate)} → {fmt(cert.expiryDate)}
                        </Text>
                        <Text style={[styles.certDays, { color: statusColor(cert.status) }]}>
                          {daysLabel(cert.daysUntilExpiry, cert.status)}
                        </Text>
                        {cert.notes ? <Text style={styles.certNotes}>{cert.notes}</Text> : null}

                        <View style={styles.certActions}>
                          <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(cert)}>
                            <Text style={styles.editBtnText}>Edit / Renew</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.histBtn} onPress={() => toggleHistory(cert)}>
                            {loadingHistory === cert.id
                              ? <ActivityIndicator size="small" color="#5d6875" />
                              : <Text style={styles.histBtnText}>{histExpanded ? 'Hide History' : 'History'}</Text>}
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(cert)}>
                            <Text style={styles.delBtnText}>Delete</Text>
                          </TouchableOpacity>
                        </View>

                        {histExpanded ? (
                          historyCache[cert.id].length === 0 ? (
                            <Text style={styles.noHistory}>No renewal history.</Text>
                          ) : (
                            historyCache[cert.id].map((h) => (
                              <View key={h.id} style={styles.historyRow}>
                                <Text style={styles.historyDate}>
                                  {new Date(h.renewedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} by {h.renewedBy}
                                </Text>
                                {h.previousExpiry && (
                                  <Text style={styles.historyDetail}>{fmt(h.previousExpiry)} → {fmt(h.newExpiry)}</Text>
                                )}
                                {h.previousAuthority && h.previousAuthority !== h.newAuthority && (
                                  <Text style={styles.historyDetail}>Authority: {h.previousAuthority} → {h.newAuthority}</Text>
                                )}
                              </View>
                            ))
                          )
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingCert ? 'Edit Certification' : 'Add Certification'}</Text>

              {/* Worker picker (add only) */}
              {!editingCert ? (
                <>
                  <Text style={styles.fieldLabel}>Worker *</Text>
                  {form.workerId ? (
                    <TouchableOpacity
                      style={styles.selectedWorker}
                      onPress={() => setForm((f) => ({ ...f, workerId: null }))}
                    >
                      <Text style={styles.selectedWorkerText}>
                        {workers.find((w) => w.id === form.workerId)?.fullName ?? 'Selected worker'} ✕
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TextInput
                        style={styles.input}
                        placeholder="Search workers..."
                        placeholderTextColor="#9aa5b1"
                        value={workerSearch}
                        onChangeText={setWorkerSearch}
                      />
                      <View style={styles.workerPickerList}>
                        {filteredWorkers.slice(0, 8).map((w) => (
                          <TouchableOpacity
                            key={w.id}
                            style={styles.workerPickerRow}
                            onPress={() => { setForm((f) => ({ ...f, workerId: w.id })); setWorkerSearch(''); }}
                          >
                            <Text style={styles.workerPickerName}>{w.fullName}</Text>
                            <Text style={styles.workerPickerEmail}>{w.email}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>Worker</Text>
                  <View style={styles.lockedField}>
                    <Text style={styles.lockedFieldText}>{editingCert.workerName}</Text>
                  </View>
                </>
              )}

              <Text style={styles.fieldLabel}>Certification Type *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[...CERT_TYPES, 'Other'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typePill, form.certificationName === type && styles.typePillActive]}
                      onPress={() => setForm((f) => ({ ...f, certificationName: type }))}
                    >
                      <Text style={[styles.typePillText, form.certificationName === type && styles.typePillTextActive]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {form.certificationName === 'Other' ? (
                <TextInput
                  style={styles.input}
                  placeholder="Certification name"
                  placeholderTextColor="#9aa5b1"
                  value={form.customCertName}
                  onChangeText={(v) => setForm((f) => ({ ...f, customCertName: v }))}
                />
              ) : null}

              <Text style={styles.fieldLabel}>Issuing Authority *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Minerals Commission Ghana"
                placeholderTextColor="#9aa5b1"
                value={form.issuingAuthority}
                onChangeText={(v) => setForm((f) => ({ ...f, issuingAuthority: v }))}
              />

              <Text style={styles.fieldLabel}>Issue Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2025-01-15"
                placeholderTextColor="#9aa5b1"
                value={form.issueDate}
                onChangeText={(v) => setForm((f) => ({ ...f, issueDate: v }))}
                keyboardType="numbers-and-punctuation"
              />

              <Text style={styles.fieldLabel}>Expiry Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2027-01-15"
                placeholderTextColor="#9aa5b1"
                value={form.expiryDate}
                onChangeText={(v) => setForm((f) => ({ ...f, expiryDate: v }))}
                keyboardType="numbers-and-punctuation"
              />

              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={[styles.input, { minHeight: 72, textAlignVertical: 'top' }]}
                placeholder="Optional notes..."
                placeholderTextColor="#9aa5b1"
                value={form.notes}
                onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)} disabled={saving}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.saveBtnText}>{editingCert ? 'Save Changes' : 'Add Certification'}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' },
  strip: { backgroundColor: '#fff', borderBottomColor: '#dde3ea', borderBottomWidth: 1, flexDirection: 'row', paddingVertical: 12 },
  stripItem: { flex: 1, alignItems: 'center' },
  stripValue: { color: '#17212b', fontSize: 20, fontWeight: '900' },
  stripLabel: { color: '#9aa5b1', fontSize: 10, fontWeight: '700', marginTop: 2 },
  stripDivider: { width: 1, backgroundColor: '#dde3ea' },
  filterArea: { backgroundColor: '#fff', borderBottomColor: '#dde3ea', borderBottomWidth: 1, padding: 12, gap: 8 },
  filterTabs: { flexDirection: 'row', gap: 6 },
  filterTab: { borderRadius: 20, borderWidth: 1.5, borderColor: '#dde3ea', paddingHorizontal: 14, paddingVertical: 5 },
  filterTabActive: { backgroundColor: '#1f6f5b', borderColor: '#1f6f5b' },
  filterTabText: { color: '#5d6875', fontSize: 12, fontWeight: '700' },
  filterTabTextActive: { color: '#fff' },
  searchInput: { backgroundColor: '#f4f6f8', borderRadius: 8, borderWidth: 1, borderColor: '#dde3ea', color: '#17212b', fontSize: 13, paddingHorizontal: 12, paddingVertical: 8 },
  container: { padding: 14, paddingBottom: 40 },
  addBtn: { backgroundColor: '#1f6f5b', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 14 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#dde3ea', padding: 20, alignItems: 'center' },
  emptyText: { color: '#9aa5b1', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  workerSection: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#dde3ea', marginBottom: 10, overflow: 'hidden' },
  workerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  workerDot: { width: 10, height: 10, borderRadius: 5 },
  workerName: { color: '#17212b', fontSize: 14, fontWeight: '800' },
  workerEmail: { color: '#9aa5b1', fontSize: 11, fontWeight: '600' },
  certCountBadge: { backgroundColor: '#f4f6f8', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  certCountText: { color: '#5d6875', fontSize: 11, fontWeight: '800' },
  addWorkerBtn: { backgroundColor: '#e8f5f0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  addWorkerBtnText: { color: '#1f6f5b', fontSize: 16, fontWeight: '900' },
  chevron: { color: '#9aa5b1', fontSize: 11, fontWeight: '700' },
  certsContainer: { borderTopColor: '#f4f6f8', borderTopWidth: 1, padding: 10, gap: 8 },
  certCard: { borderRadius: 8, padding: 12 },
  certTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  certName: { color: '#17212b', fontSize: 13, fontWeight: '900', marginBottom: 1 },
  certAuth: { color: '#5d6875', fontSize: 11, fontWeight: '700' },
  statusPill: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  statusPillText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  certDates: { color: '#5d6875', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  certDays: { fontSize: 11, fontWeight: '800', marginBottom: 4 },
  certNotes: { color: '#5d6875', fontSize: 11, fontWeight: '600', fontStyle: 'italic', marginBottom: 6 },
  certActions: { flexDirection: 'row', gap: 6, marginTop: 6 },
  editBtn: { backgroundColor: '#1f6f5b', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  editBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  histBtn: { backgroundColor: '#f4f6f8', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  histBtnText: { color: '#5d6875', fontSize: 11, fontWeight: '800' },
  delBtn: { backgroundColor: '#fff5f5', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  delBtnText: { color: '#b42318', fontSize: 11, fontWeight: '800' },
  noHistory: { color: '#9aa5b1', fontSize: 11, fontWeight: '600', marginTop: 4 },
  historyRow: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 6, marginTop: 4, padding: 8 },
  historyDate: { color: '#17212b', fontSize: 11, fontWeight: '800', marginBottom: 2 },
  historyDetail: { color: '#5d6875', fontSize: 10, fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', padding: 20 },
  modalTitle: { color: '#17212b', fontSize: 20, fontWeight: '900', marginBottom: 16 },
  fieldLabel: { color: '#5d6875', fontSize: 12, fontWeight: '800', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#f4f6f8', borderRadius: 8, borderWidth: 1, borderColor: '#dde3ea', color: '#17212b', fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 2 },
  lockedField: { backgroundColor: '#f4f6f8', borderRadius: 8, borderWidth: 1, borderColor: '#dde3ea', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 2 },
  lockedFieldText: { color: '#17212b', fontSize: 14, fontWeight: '700' },
  selectedWorker: { backgroundColor: '#e8f5f0', borderRadius: 8, padding: 10, marginBottom: 4 },
  selectedWorkerText: { color: '#1f6f5b', fontSize: 13, fontWeight: '800' },
  workerPickerList: { backgroundColor: '#f4f6f8', borderRadius: 8, borderWidth: 1, borderColor: '#dde3ea', marginBottom: 4 },
  workerPickerRow: { padding: 10, borderBottomColor: '#dde3ea', borderBottomWidth: 1 },
  workerPickerName: { color: '#17212b', fontSize: 13, fontWeight: '800' },
  workerPickerEmail: { color: '#9aa5b1', fontSize: 11, fontWeight: '600' },
  typePill: { borderRadius: 16, borderWidth: 1.5, borderColor: '#dde3ea', paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#fff' },
  typePillActive: { backgroundColor: '#1f6f5b', borderColor: '#1f6f5b' },
  typePillText: { color: '#5d6875', fontSize: 11, fontWeight: '700' },
  typePillTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16, paddingBottom: 8 },
  cancelBtn: { flex: 1, backgroundColor: '#f4f6f8', borderRadius: 8, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#5d6875', fontSize: 14, fontWeight: '800' },
  saveBtn: { flex: 2, backgroundColor: '#1f6f5b', borderRadius: 8, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
