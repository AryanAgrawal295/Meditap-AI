import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthUser, MedicalAttachment, MedicalRecord, MedicationPlan, Patient, Prescription, UserRole } from '@/types/patient';
import { apiRequest } from '@/lib/api';
import {
  helpmanDemoMedicalRecords,
  helpmanDemoMedicationPlans,
  helpmanDemoPatient,
  helpmanDemoPrescriptions,
} from '@/data/helpmanDemoData';
import { derivePrescriptions, mapBackendMedicalRecord, mapBackendPatient } from '@/lib/mappers';
import {
  clearStoredSession,
  getStoredPatientId,
  getStoredRole,
  getStoredUser,
  getStoredAccessToken,
  setStoredPatientId,
  setStoredRole,
  setStoredTokens,
  setStoredUser,
} from '@/lib/storage';

type BackendMedicalRecord = {
  _id: string;
  visitDate?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
  description?: string | null;
  title?: string | null;
  hospital?: string | null;
  department?: string | null;
  doctorName?: string | null;
  recordType?: MedicalRecord['recordType'] | null;
  severity?: MedicalRecord['severity'] | null;
  tags?: string[] | null;
  prescriptions?: string[] | null;
  attachments?: Array<{
    publicId?: string | null;
    fileName?: string | null;
    mimeType?: string | null;
    resourceType?: string | null;
    format?: string | null;
    accessUrl?: string | null;
  } | string> | null;
  fileUrl?: string | null;
  doctor?: {
    name?: string | null;
  } | string | null;
};

interface AppContextType {
  patient: Patient | null;
  role: UserRole | null;
  authUser: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoadingPatient: boolean;
  medicalRecords: MedicalRecord[];
  prescriptions: Prescription[];
  medicationPlans: MedicationPlan[];
  currentPatientId: string | null;
  setRole: (role: UserRole | null) => void;
  setPatientContext: (patientId: string | null) => Promise<void>;
  resolvePatientContext: (identifier: string) => Promise<{ patientId: string; fullName: string; email?: string | null }>;
  registerPatient: (payload: {
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
    bloodGroup: string;
    allergies: string;
    emergencyContact: {
      name: string;
      phone: string;
      relation: string;
    };
    uploaderPassword: string;
    viewerPassword: string;
  }) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  loginWithPatientPassword: (password: string) => Promise<UserRole>;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  addMedicalRecord: (record: {
    title: string;
    date: string;
    diagnosis: string;
    doctorName?: string;
    hospital: string;
    department?: string;
    description: string;
    recordType: MedicalRecord['recordType'];
    severity: MedicalRecord['severity'];
    tags: MedicalRecord['tags'];
    attachments?: MedicalAttachment[];
    prescriptions?: string[];
  }) => Promise<void>;
  uploadMedicalReport: (file: File) => Promise<MedicalAttachment>;
  processPrescriptionOCR: (file: File) => Promise<{
    fileUrl?: string;
    rawText: string;
    cleanedText: string;
    conditions: string[];
    medications: string[];
    procedures: string[];
    recordSuggestions?: {
      title?: string;
      diagnosis?: string;
      description?: string;
      visitDate?: string;
      doctorName?: string;
      department?: string;
      hospital?: string;
    };
    structuredMedicines: Array<{
      name?: string;
      dosage?: string;
      timing?: string[];
      duration?: string;
      durationDays?: number;
      frequency?: string;
      frequencyPerDay?: number;
      quantityPerDose?: number;
    }>;
  }>;
  uploadPrescriptionForSchedule: (file: File, scheduleId?: string) => Promise<MedicationPlan>;
  addPrescriptionFromRecordToSchedule: (prescription: Prescription, scheduleId?: string) => Promise<MedicationPlan>;
  deletePrescriptionFromSchedule: (payload: {
    planId: string;
    prescriptionIndex: number;
  }) => Promise<void>;
  verifyDoseWithAI: (payload: {
    planId: string;
    medicineId: string;
    doseId: string;
    pillDetected: boolean;
    gestureDetected: boolean;
    confidence: number;
  }) => Promise<void>;
  updateDoseStatus: (payload: {
    planId: string;
    medicineId: string;
    doseId: string;
    status: 'pending' | 'taken' | 'missed';
  }) => Promise<void>;
  updateDoseSchedule: (payload: {
    planId: string;
    medicineId: string;
    doseId: string;
    scheduledAt: string;
  }) => Promise<void>;
  updateMedicine: (payload: {
    planId: string;
    medicineId: string;
    name: string;
  }) => Promise<void>;
  updateMedicationPlanStatus: (payload: {
    planId: string;
    status: MedicationPlan['status'];
  }) => Promise<void>;
  deleteMedicationPlan: (planId: string) => Promise<void>;
  updatePatientProfile: (payload: {
    name: string;
    dateOfBirth: string;
    gender: string;
    bloodGroup: string;
    allergies: string[];
    emergencyContact: Patient['emergencyContact'];
  }) => Promise<void>;
  askAssistant: (question: string) => Promise<string>;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function parseRole(role: string | null): UserRole | null {
  if (role === 'doctor' || role === 'receptionist' || role === 'emergency') {
    return role;
  }

  return null;
}

function getBootstrapPatientHints() {
  const params = new URLSearchParams(window.location.search);

  return {
    patientIdFromQuery: params.get('patientId'),
    cardUidFromQuery: params.get('cardUID') || params.get('card'),
    patientIdFromEnv: import.meta.env.VITE_DEFAULT_PATIENT_ID || null,
    cardUidFromEnv: import.meta.env.VITE_DEFAULT_NFC_CARD_UID || null,
  };
}

function isHelpmanDemoRequested() {
  const params = new URLSearchParams(window.location.search);
  return params.get('helpmanDemo') === '1' || window.sessionStorage.getItem('meditap-helpman-demo') === '1';
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [role, setRoleState] = useState<UserRole | null>(parseRole(getStoredRole()));
  const [authUser, setAuthUserState] = useState<AuthUser | null>(getStoredUser<AuthUser>());
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getStoredAccessToken()));
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [medicationPlans, setMedicationPlans] = useState<MedicationPlan[]>([]);
  const [demoMedicationPlans, setDemoMedicationPlans] = useState<MedicationPlan[]>(helpmanDemoMedicationPlans);
  const [isHelpmanDemo, setIsHelpmanDemo] = useState(isHelpmanDemoRequested);
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(getStoredPatientId());

  const setRole = useCallback((nextRole: UserRole | null) => {
    setRoleState(nextRole);
    setStoredRole(nextRole);
  }, []);

  const setAuthUser = useCallback((nextUser: AuthUser | null) => {
    setAuthUserState(nextUser);
    setStoredUser(nextUser);
  }, []);

  const syncMedicalData = useCallback((records: BackendMedicalRecord[]) => {
    const mappedRecords = records.map(mapBackendMedicalRecord);
    setMedicalRecords(mappedRecords);
    setPrescriptions(derivePrescriptions(records));
  }, []);

  const resetSession = useCallback(() => {
    clearStoredSession();
    setIsAuthenticated(false);
    setRole(null);
    setAuthUser(null);
    setCurrentPatientId(null);
    setPatient(null);
    setMedicalRecords([]);
    setPrescriptions([]);
    setMedicationPlans([]);
  }, [setAuthUser, setRole]);

  useEffect(() => {
    window.addEventListener('meditap:auth-expired', resetSession);

    return () => {
      window.removeEventListener('meditap:auth-expired', resetSession);
    };
  }, [resetSession]);

  useEffect(() => {
    const syncDemoMode = () => {
      setIsHelpmanDemo(isHelpmanDemoRequested());
    };

    window.addEventListener('meditap:helpman-demo', syncDemoMode);
    window.addEventListener('popstate', syncDemoMode);

    return () => {
      window.removeEventListener('meditap:helpman-demo', syncDemoMode);
      window.removeEventListener('popstate', syncDemoMode);
    };
  }, []);

  const fetchPatientProfile = useCallback(async (patientId: string) => {
    setIsLoadingPatient(true);

    try {
      const backendPatient = await apiRequest<Record<string, unknown>>(`/patients/${patientId}`, {
        auth: true,
      });
      setPatient(mapBackendPatient(backendPatient));
    } finally {
      setIsLoadingPatient(false);
    }
  }, []);

  const fetchQuickAccessPatient = useCallback(async (cardUID: string) => {
    setIsLoadingPatient(true);

    try {
      const quickAccessPatient = await apiRequest<Record<string, unknown>>('/nfc/tap', {
        method: 'POST',
        body: { cardUID },
      });

      const mappedPatient = mapBackendPatient(quickAccessPatient);
      setPatient(mappedPatient);
      setCurrentPatientId(mappedPatient.id);
      setStoredPatientId(mappedPatient.id);
    } finally {
      setIsLoadingPatient(false);
    }
  }, []);

  const fetchMedicalTimeline = useCallback(async (patientId: string) => {
    const records = await apiRequest<BackendMedicalRecord[]>(`/medical/${patientId}`, {
      auth: true,
    });

    syncMedicalData(records);
  }, [syncMedicalData]);

  const setPatientContext = useCallback(async (patientId: string | null) => {
    setCurrentPatientId(patientId);
    setStoredPatientId(patientId);

    if (!patientId) {
      setPatient(null);
      setMedicalRecords([]);
      setPrescriptions([]);
      setMedicationPlans([]);
      return;
    }

    if (isAuthenticated) {
      await Promise.all([fetchPatientProfile(patientId), fetchMedicalTimeline(patientId)]);
    }
  }, [fetchMedicalTimeline, fetchPatientProfile, isAuthenticated]);

  const resolvePatientContext = useCallback(async (identifier: string) => {
    const response = await apiRequest<{
      patientId: string;
      fullName: string;
      email?: string | null;
      [key: string]: unknown;
    }>('/patients/resolve', {
      method: 'POST',
      body: {
        identifier,
        email: identifier,
      },
    });

    setCurrentPatientId(response.patientId);
    setStoredPatientId(response.patientId);
    setPatient(mapBackendPatient(response));

    return response;
  }, []);

  const registerPatient = useCallback(async (payload: {
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
    bloodGroup: string;
    allergies: string;
    emergencyContact: {
      name: string;
      phone: string;
      relation: string;
    };
    uploaderPassword: string;
    viewerPassword: string;
  }) => {
    const response = await apiRequest<{
      patientId: string;
      patient?: Record<string, unknown>;
      fullName: string;
      email?: string | null;
    }>('/patients/register', {
      method: 'POST',
      body: payload,
    });

    setCurrentPatientId(response.patientId);
    setStoredPatientId(response.patientId);
    setPatient(mapBackendPatient(response.patient || response));
  }, []);

  useEffect(() => {
    if (isHelpmanDemo) {
      setIsInitializing(false);
      return undefined;
    }

    let cancelled = false;

    async function bootstrap() {
      try {
        const hints = getBootstrapPatientHints();
        const initialPatientId = currentPatientId || hints.patientIdFromQuery || hints.patientIdFromEnv;
        const initialCardUID = hints.cardUidFromQuery || hints.cardUidFromEnv;

        if (initialPatientId) {
          setCurrentPatientId(initialPatientId);
          setStoredPatientId(initialPatientId);

          if (isAuthenticated) {
            await Promise.all([fetchPatientProfile(initialPatientId), fetchMedicalTimeline(initialPatientId)]);
          }
        } else if (!isAuthenticated && initialCardUID) {
          await fetchQuickAccessPatient(initialCardUID);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to initialize app context', error);
        }
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [currentPatientId, fetchMedicalTimeline, fetchPatientProfile, fetchQuickAccessPatient, isAuthenticated, isHelpmanDemo]);

  useEffect(() => {
    if (isHelpmanDemo) {
      return;
    }

    if (!isAuthenticated || !currentPatientId) {
      return;
    }

    fetchMedicalTimeline(currentPatientId).catch((error) => {
      console.error('Failed to refresh medical timeline', error);
    });
  }, [currentPatientId, fetchMedicalTimeline, isAuthenticated, isHelpmanDemo]);

  useEffect(() => {
    if (isHelpmanDemo) {
      return;
    }

    if (!isAuthenticated || !currentPatientId) {
      return;
    }

    apiRequest<MedicationPlan[]>(`/medication/${currentPatientId}`, {
      auth: true,
    })
      .then(setMedicationPlans)
      .catch((error) => {
        console.error('Failed to refresh medication plans', error);
      });
  }, [currentPatientId, isAuthenticated, isHelpmanDemo]);

  const completeAuthentication = useCallback(async ({
    accessToken,
    refreshToken,
    resolvedRole,
    user,
  }: {
    accessToken: string;
    refreshToken: string;
    resolvedRole: UserRole;
    user: AuthUser;
  }) => {
    setStoredTokens(accessToken, refreshToken);
    setRole(resolvedRole);
    setAuthUser(user);
    setIsAuthenticated(true);

    if (currentPatientId) {
      await Promise.all([fetchPatientProfile(currentPatientId), fetchMedicalTimeline(currentPatientId)]);
    }
  }, [currentPatientId, fetchMedicalTimeline, fetchPatientProfile, setAuthUser, setRole]);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    const response = await apiRequest<{
      accessToken: string;
      refreshToken: string;
      role: UserRole;
      user: AuthUser;
    }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    await completeAuthentication({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      resolvedRole: response.role,
      user: response.user,
    });
  }, [completeAuthentication]);

  const loginWithPatientPassword = useCallback(async (password: string) => {
    if (!currentPatientId) {
      throw new Error('No patient selected');
    }

    const response = await apiRequest<{
      accessToken: string;
      refreshToken: string;
      role: UserRole;
      user: AuthUser;
    }>('/auth/patient-access', {
      method: 'POST',
      body: {
        patientId: currentPatientId,
        password,
      },
    });

    await completeAuthentication({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      resolvedRole: response.role,
      user: response.user,
    });

    return response.role;
  }, [completeAuthentication, currentPatientId]);

  const requestOtp = useCallback(async (email: string) => {
    await apiRequest('/auth/send-otp', {
      method: 'POST',
      body: {
        email,
        role,
      },
    });
  }, [role]);

  const verifyOtp = useCallback(async (email: string, otp: string) => {
    const response = await apiRequest<{
      accessToken: string;
      refreshToken: string;
      role: UserRole;
      user: AuthUser;
    }>('/auth/verify-otp', {
      method: 'POST',
      body: {
        email,
        role,
        otp,
      },
    });

    await completeAuthentication({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      resolvedRole: response.role,
      user: response.user,
    });
  }, [completeAuthentication, role]);

  const addMedicalRecord = useCallback(async (record: {
    title: string;
    date: string;
    diagnosis: string;
    doctorName?: string;
    hospital: string;
    department?: string;
    description: string;
    recordType: MedicalRecord['recordType'];
    severity: MedicalRecord['severity'];
    tags: MedicalRecord['tags'];
    attachments?: MedicalAttachment[];
    prescriptions?: string[];
  }) => {
    if (isHelpmanDemo) {
      throw new Error('Demo mode uses local John Smith data only.');
    }

    if (!currentPatientId) {
      throw new Error('No patient selected');
    }

    const createdRecord = await apiRequest<BackendMedicalRecord>('/medical', {
      method: 'POST',
      auth: true,
      body: {
        patient: currentPatientId,
        title: record.title,
        visitDate: record.date,
        diagnosis: record.diagnosis,
        doctorName: record.doctorName,
        hospital: record.hospital,
        department: record.department,
        description: record.description,
        notes: record.description,
        recordType: record.recordType,
        severity: record.severity,
        tags: record.tags,
        attachments: record.attachments,
        prescriptions: record.prescriptions || [],
      },
    });

    setMedicalRecords((prev) => [mapBackendMedicalRecord(createdRecord), ...prev]);
    setPrescriptions((prev) => [...derivePrescriptions([createdRecord]), ...prev]);
  }, [currentPatientId, isHelpmanDemo]);

  const uploadMedicalReport = useCallback(async (file: File) => {
    if (isHelpmanDemo) {
      throw new Error('Demo mode does not upload files.');
    }

    if (!currentPatientId) {
      throw new Error('No patient selected');
    }

    const formData = new FormData();
    formData.append('report', file);

    const response = await apiRequest<{
      file: {
        publicId?: string | null;
        fileName?: string | null;
        mimeType?: string | null;
        resourceType?: string | null;
        format?: string | null;
        accessUrl?: string | null;
      };
    }>("/medical/upload-report/" + currentPatientId, {
      method: 'POST',
      auth: true,
      body: formData,
    });

    return {
      publicId: response.file.publicId || null,
      fileName: response.file.fileName || file.name,
      mimeType: response.file.mimeType || file.type || null,
      resourceType: response.file.resourceType || null,
      format: response.file.format || null,
      accessUrl: response.file.accessUrl || null,
    };
  }, [currentPatientId, isHelpmanDemo]);

  const uploadPrescriptionForSchedule = useCallback(async (file: File, scheduleId?: string) => {
    if (isHelpmanDemo) {
      return demoMedicationPlans.find((plan) => plan.id === scheduleId) || demoMedicationPlans[0];
    }

    if (!currentPatientId) {
      throw new Error('No patient selected');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', currentPatientId);

    const targetScheduleId = scheduleId || medicationPlans[0]?.id;

    const response = await apiRequest<{ plan: MedicationPlan }>(
      targetScheduleId ? `/medication/${targetScheduleId}/prescription` : '/medication/prescription',
      {
      method: 'POST',
      auth: true,
      body: formData,
      }
    );

    setMedicationPlans((prev) => {
      if (targetScheduleId) {
        return prev.map((plan) => (plan.id === response.plan.id ? response.plan : plan));
      }

      return [response.plan, ...prev];
    });
    return response.plan;
  }, [currentPatientId, demoMedicationPlans, isHelpmanDemo, medicationPlans]);

  const addPrescriptionFromRecordToSchedule = useCallback(async (prescription: Prescription, scheduleId?: string) => {
    const targetScheduleId = scheduleId || medicationPlans[0]?.id;

    if (isHelpmanDemo) {
      const nextIndex = Math.max(
        0,
        ...demoMedicationPlans.flatMap((plan) => [
          ...(plan.prescriptionFiles || []).map((file) => Number(file.index) || 0),
          ...plan.medicines.map((medicine) => Number(medicine.prescriptionIndex) || 0),
        ]),
      ) + 1;
      const tag = `Prescription ${nextIndex}`;
      const importedMedicines = prescription.medicines.map((medicine, index) => ({
        _id: `DEMO-IMPORTED-${nextIndex}-${index}`,
        name: medicine.name,
        dosage: medicine.dosage || 'As prescribed',
        timing: ['morning'],
        duration: medicine.duration || '7 days',
        durationDays: 7,
        frequency: medicine.frequency || 'Once daily',
        frequencyPerDay: 1,
        quantityPerDose: 1,
        stockQuantity: 7,
        prescriptionIndex: nextIndex,
        prescriptionTag: tag,
        sourceFileName: 'Medical record',
        refillReminderAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        doses: Array.from({ length: 7 }, (_, doseIndex) => {
          const scheduledAt = new Date();
          scheduledAt.setDate(scheduledAt.getDate() + doseIndex);
          scheduledAt.setHours(8, 0, 0, 0);
          return {
            _id: `DEMO-IMPORTED-${nextIndex}-${index}-DOSE-${doseIndex}`,
            scheduledAt: scheduledAt.toISOString(),
            timingLabel: 'morning',
            status: 'pending' as const,
            reminderLevel: 0,
            verifiedByAI: false,
          };
        }),
      }));

      let updatedPlan: MedicationPlan | null = null;
      setDemoMedicationPlans((prev) => {
        const targetId = targetScheduleId || prev[0]?.id;
        if (targetId) {
          return prev.map((plan) => {
            if (plan.id !== targetId) return plan;
            updatedPlan = {
              ...plan,
              prescriptionFiles: [
                ...(plan.prescriptionFiles || []),
                {
                  index: nextIndex,
                  tag,
                  fileName: `Medical record - ${prescription.doctor}`,
                  uploadedAt: prescription.date,
                },
              ],
              medicines: [...plan.medicines, ...importedMedicines],
              updatedAt: new Date().toISOString(),
            };
            return updatedPlan;
          });
        }

        updatedPlan = {
          id: `DEMO-PLAN-${Date.now()}`,
          patient: helpmanDemoPatient.id,
          source: 'import',
          status: 'active',
          prescriptionFiles: [
            {
              index: nextIndex,
              tag,
              fileName: `Medical record - ${prescription.doctor}`,
              uploadedAt: prescription.date,
            },
          ],
          medicines: importedMedicines,
          agentTrace: [],
          adherence: { doses: [], taken: 0, missed: 0, pending: importedMedicines.length * 7, adherenceRate: 0 },
          refillAlerts: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return [updatedPlan, ...prev];
      });

      return updatedPlan || demoMedicationPlans[0];
    }

    if (!currentPatientId) {
      throw new Error('No patient selected');
    }

    const response = await apiRequest<{ plan: MedicationPlan }>(
      targetScheduleId ? `/medication/${targetScheduleId}/prescription/import` : '/medication/prescription/import',
      {
        method: 'POST',
        auth: true,
        body: {
          patientId: currentPatientId,
          planId: targetScheduleId,
          prescriptionId: prescription.id,
          doctor: prescription.doctor,
          date: prescription.date,
          notes: prescription.notes,
          medicines: prescription.medicines,
        },
      }
    );

    setMedicationPlans((prev) => {
      if (targetScheduleId) {
        return prev.map((plan) => (plan.id === response.plan.id ? response.plan : plan));
      }

      return [response.plan, ...prev];
    });
    return response.plan;
  }, [currentPatientId, demoMedicationPlans, isHelpmanDemo, medicationPlans]);

  const deletePrescriptionFromSchedule = useCallback(async (payload: {
    planId: string;
    prescriptionIndex: number;
  }) => {
    if (isHelpmanDemo) {
      setDemoMedicationPlans((prev) =>
        prev.map((plan) =>
          plan.id === payload.planId
            ? {
                ...plan,
                prescriptionFiles: (plan.prescriptionFiles || []).filter(
                  (file) => Number(file.index) !== payload.prescriptionIndex,
                ),
                medicines: plan.medicines.filter(
                  (medicine) => (Number(medicine.prescriptionIndex) || 1) !== payload.prescriptionIndex,
                ),
                updatedAt: new Date().toISOString(),
              }
            : plan,
        ),
      );
      return;
    }

    const plan = await apiRequest<MedicationPlan>(
      `/medication/plans/${payload.planId}/prescriptions/${payload.prescriptionIndex}`,
      {
        method: 'DELETE',
        auth: true,
      }
    );

    setMedicationPlans((prev) => prev.map((item) => (item.id === plan.id ? plan : item)));
  }, [isHelpmanDemo]);

  const processPrescriptionOCR = useCallback(async (file: File) => {
    if (isHelpmanDemo) {
      throw new Error('Demo mode does not process uploaded files.');
    }

    const formData = new FormData();
    formData.append('file', file);

    return apiRequest<{
      fileUrl?: string;
      rawText: string;
      cleanedText: string;
      conditions: string[];
      medications: string[];
      procedures: string[];
      recordSuggestions?: {
        title?: string;
        diagnosis?: string;
        description?: string;
        visitDate?: string;
        doctorName?: string;
        department?: string;
        hospital?: string;
      };
      structuredMedicines: Array<{
        name?: string;
        dosage?: string;
        timing?: string[];
        duration?: string;
        durationDays?: number;
        frequency?: string;
        frequencyPerDay?: number;
        quantityPerDose?: number;
      }>;
    }>('/ocr/process', {
      method: 'POST',
      body: formData,
    });
  }, [isHelpmanDemo]);

  const verifyDoseWithAI = useCallback(async (payload: {
    planId: string;
    medicineId: string;
    doseId: string;
    pillDetected: boolean;
    gestureDetected: boolean;
    confidence: number;
  }) => {
    if (isHelpmanDemo) {
      setDemoMedicationPlans((prev) =>
        prev.map((plan) =>
          plan.id === payload.planId
            ? {
                ...plan,
                medicines: plan.medicines.map((medicine) =>
                  medicine._id === payload.medicineId
                    ? {
                        ...medicine,
                        doses: medicine.doses.map((dose) =>
                          dose._id === payload.doseId
                            ? {
                                ...dose,
                                status: payload.pillDetected && payload.gestureDetected ? 'taken' : dose.status,
                                verifiedByAI: payload.pillDetected && payload.gestureDetected,
                                takenAt: payload.pillDetected && payload.gestureDetected ? new Date().toISOString() : dose.takenAt,
                              }
                            : dose,
                        ),
                      }
                    : medicine,
                ),
              }
            : plan,
        ),
      );
      return;
    }

    const response = await apiRequest<{ plan: MedicationPlan }>(
      `/medication/${payload.planId}/medicines/${payload.medicineId}/doses/${payload.doseId}/verify`,
      {
        method: 'POST',
        auth: true,
        body: {
          pillDetected: payload.pillDetected,
          gestureDetected: payload.gestureDetected,
          confidence: payload.confidence,
        },
      }
    );

    setMedicationPlans((prev) => prev.map((plan) => (plan.id === response.plan.id ? response.plan : plan)));
  }, [isHelpmanDemo]);

  const updateDoseStatus = useCallback(async (payload: {
    planId: string;
    medicineId: string;
    doseId: string;
    status: 'pending' | 'taken' | 'missed';
  }) => {
    if (isHelpmanDemo) {
      setDemoMedicationPlans((prev) =>
        prev.map((plan) =>
          plan.id === payload.planId
            ? {
                ...plan,
                medicines: plan.medicines.map((medicine) =>
                  medicine._id === payload.medicineId
                    ? {
                        ...medicine,
                        doses: medicine.doses.map((dose) =>
                          dose._id === payload.doseId
                            ? {
                                ...dose,
                                status: payload.status,
                                takenAt: payload.status === 'taken' ? new Date().toISOString() : dose.takenAt,
                                missedAt: payload.status === 'missed' ? new Date().toISOString() : dose.missedAt,
                              }
                            : dose,
                        ),
                      }
                    : medicine,
                ),
              }
            : plan,
        ),
      );
      return;
    }

    const plan = await apiRequest<MedicationPlan>(
      `/medication/${payload.planId}/medicines/${payload.medicineId}/doses/${payload.doseId}/status`,
      {
        method: 'PATCH',
        auth: true,
        body: {
          status: payload.status,
        },
      }
    );

    setMedicationPlans((prev) => prev.map((item) => (item.id === plan.id ? plan : item)));
  }, [isHelpmanDemo]);

  const updateDoseSchedule = useCallback(async (payload: {
    planId: string;
    medicineId: string;
    doseId: string;
    scheduledAt: string;
  }) => {
    if (isHelpmanDemo) {
      setDemoMedicationPlans((prev) =>
        prev.map((plan) =>
          plan.id === payload.planId
            ? {
                ...plan,
                medicines: plan.medicines.map((medicine) =>
                  medicine._id === payload.medicineId
                    ? {
                        ...medicine,
                        doses: medicine.doses.map((dose) =>
                          dose._id === payload.doseId
                            ? {
                                ...dose,
                                scheduledAt: payload.scheduledAt,
                              }
                            : dose,
                        ),
                      }
                    : medicine,
                ),
              }
            : plan,
        ),
      );
      return;
    }

    const plan = await apiRequest<MedicationPlan>(
      `/medication/${payload.planId}/medicines/${payload.medicineId}/doses/${payload.doseId}/schedule`,
      {
        method: 'PATCH',
        auth: true,
        body: {
          scheduledAt: payload.scheduledAt,
        },
      }
    );

    setMedicationPlans((prev) => prev.map((item) => (item.id === plan.id ? plan : item)));
  }, [isHelpmanDemo]);

  const updateMedicine = useCallback(async (payload: {
    planId: string;
    medicineId: string;
    name: string;
  }) => {
    if (isHelpmanDemo) {
      setDemoMedicationPlans((prev) =>
        prev.map((plan) =>
          plan.id === payload.planId
            ? {
                ...plan,
                medicines: plan.medicines.map((medicine) =>
                  medicine._id === payload.medicineId
                    ? {
                        ...medicine,
                        name: payload.name,
                      }
                    : medicine,
                ),
              }
            : plan,
        ),
      );
      return;
    }

    const plan = await apiRequest<MedicationPlan>(
      `/medication/${payload.planId}/medicines/${payload.medicineId}`,
      {
        method: 'PATCH',
        auth: true,
        body: {
          name: payload.name,
        },
      }
    );

    setMedicationPlans((prev) => prev.map((item) => (item.id === plan.id ? plan : item)));
  }, [isHelpmanDemo]);

  const updateMedicationPlanStatus = useCallback(async (payload: {
    planId: string;
    status: MedicationPlan['status'];
  }) => {
    if (isHelpmanDemo) {
      setDemoMedicationPlans((prev) =>
        prev.map((plan) =>
          plan.id === payload.planId
            ? {
                ...plan,
                status: payload.status,
              }
            : plan,
        ),
      );
      return;
    }

    const plan = await apiRequest<MedicationPlan>(
      `/medication/plans/${payload.planId}/status`,
      {
        method: 'PATCH',
        auth: true,
        body: {
          status: payload.status,
        },
      }
    );

    setMedicationPlans((prev) => prev.map((item) => (item.id === plan.id ? plan : item)));
  }, [isHelpmanDemo]);

  const deleteMedicationPlan = useCallback(async (planId: string) => {
    if (isHelpmanDemo) {
      setDemoMedicationPlans((prev) => prev.filter((plan) => plan.id !== planId));
      return;
    }

    await apiRequest<void>(`/medication/plans/${planId}`, {
      method: 'DELETE',
      auth: true,
    });

    setMedicationPlans((prev) => prev.filter((plan) => plan.id !== planId));
  }, [isHelpmanDemo]);

  const updatePatientProfile = useCallback(async (payload: {
    name: string;
    dateOfBirth: string;
    gender: string;
    bloodGroup: string;
    allergies: string[];
    emergencyContact: Patient['emergencyContact'];
  }) => {
    if (isHelpmanDemo) {
      throw new Error('Demo mode uses local John Smith data only.');
    }

    if (!currentPatientId) {
      throw new Error('No patient selected');
    }

    const updatedPatient = await apiRequest<Record<string, unknown>>(`/patients/${currentPatientId}`, {
      method: 'PUT',
      auth: true,
      body: {
        fullName: payload.name,
        dateOfBirth: payload.dateOfBirth,
        gender: payload.gender.toLowerCase(),
        bloodGroup: payload.bloodGroup,
        allergies: payload.allergies,
        emergencyContact: payload.emergencyContact,
      },
    });

    setPatient(mapBackendPatient(updatedPatient));
  }, [currentPatientId, isHelpmanDemo]);

  const askAssistant = useCallback(async (question: string) => {
    if (isHelpmanDemo) {
      return `Demo answer for John Smith: use the adherence page to review pending doses, verify medicine intake, and keep Metformin, Lisinopril, and Atorvastatin on schedule.`;
    }

    if (!currentPatientId) {
      throw new Error('No patient selected');
    }

    const response = await apiRequest<{ answer: string }>('/ai', {
      method: 'POST',
      auth: true,
      body: {
        patientId: currentPatientId,
        question,
      },
    });

    return response.answer;
  }, [currentPatientId, isHelpmanDemo]);

  const logout = useCallback(() => {
    resetSession();
  }, [resetSession]);

  const effectivePatient = isHelpmanDemo ? helpmanDemoPatient : patient;
  const effectiveRole = isHelpmanDemo ? 'doctor' : role;
  const effectiveAuthUser = useMemo(
    () =>
      isHelpmanDemo
        ? {
            id: 'DEMO-USER',
            name: 'Helpman Demo',
            email: 'demo@meditap.local',
            role: 'doctor' as UserRole,
          }
        : authUser,
    [authUser, isHelpmanDemo],
  );
  const effectiveIsAuthenticated = isHelpmanDemo || isAuthenticated;
  const effectiveMedicalRecords = isHelpmanDemo ? helpmanDemoMedicalRecords : medicalRecords;
  const effectivePrescriptions = isHelpmanDemo ? helpmanDemoPrescriptions : prescriptions;
  const effectiveMedicationPlans = isHelpmanDemo ? demoMedicationPlans : medicationPlans;
  const effectiveCurrentPatientId = isHelpmanDemo ? helpmanDemoPatient.id : currentPatientId;

  const value = useMemo(() => ({
    patient: effectivePatient,
    role: effectiveRole,
    authUser: effectiveAuthUser,
    isAuthenticated: effectiveIsAuthenticated,
    isInitializing,
    isLoadingPatient,
    medicalRecords: effectiveMedicalRecords,
    prescriptions: effectivePrescriptions,
    medicationPlans: effectiveMedicationPlans,
    currentPatientId: effectiveCurrentPatientId,
    setRole,
    setPatientContext,
    resolvePatientContext,
    registerPatient,
    loginWithPassword,
    loginWithPatientPassword,
    requestOtp,
    verifyOtp,
    addMedicalRecord,
    uploadMedicalReport,
    processPrescriptionOCR,
    uploadPrescriptionForSchedule,
    addPrescriptionFromRecordToSchedule,
    deletePrescriptionFromSchedule,
    verifyDoseWithAI,
    updateDoseStatus,
    updateDoseSchedule,
    updateMedicine,
    updateMedicationPlanStatus,
    deleteMedicationPlan,
    updatePatientProfile,
    askAssistant,
    logout,
  }), [
    addMedicalRecord,
    addPrescriptionFromRecordToSchedule,
    askAssistant,
    deleteMedicationPlan,
    deletePrescriptionFromSchedule,
    effectiveAuthUser,
    effectiveCurrentPatientId,
    effectiveIsAuthenticated,
    effectiveMedicalRecords,
    effectiveMedicationPlans,
    effectivePatient,
    effectivePrescriptions,
    effectiveRole,
    isInitializing,
    isLoadingPatient,
    loginWithPassword,
    loginWithPatientPassword,
    logout,
    registerPatient,
    requestOtp,
    resolvePatientContext,
    setPatientContext,
    setRole,
    updatePatientProfile,
    updateDoseStatus,
    updateDoseSchedule,
    updateMedicine,
    updateMedicationPlanStatus,
    uploadMedicalReport,
    processPrescriptionOCR,
    uploadPrescriptionForSchedule,
    verifyDoseWithAI,
    verifyOtp,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
