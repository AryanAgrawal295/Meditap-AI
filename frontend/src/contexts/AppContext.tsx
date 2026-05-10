import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthUser, MedicalAttachment, MedicalRecord, MedicationPlan, Patient, Prescription, UserRole } from '@/types/patient';
import { apiRequest } from '@/lib/api';
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
  loginWithPassword: (email: string, password: string) => Promise<void>;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  addMedicalRecord: (record: {
    title: string;
    date: string;
    diagnosis: string;
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
  uploadPrescriptionForSchedule: (file: File) => Promise<MedicationPlan>;
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
    }>('/patients/resolve', {
      method: 'POST',
      body: {
        identifier,
        email: identifier,
      },
    });

    setCurrentPatientId(response.patientId);
    setStoredPatientId(response.patientId);

    return response;
  }, []);

  useEffect(() => {
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
  }, [currentPatientId, fetchMedicalTimeline, fetchPatientProfile, fetchQuickAccessPatient, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !currentPatientId) {
      return;
    }

    fetchMedicalTimeline(currentPatientId).catch((error) => {
      console.error('Failed to refresh medical timeline', error);
    });
  }, [currentPatientId, fetchMedicalTimeline, isAuthenticated]);

  useEffect(() => {
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
  }, [currentPatientId, isAuthenticated]);

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
    hospital: string;
    department?: string;
    description: string;
    recordType: MedicalRecord['recordType'];
    severity: MedicalRecord['severity'];
    tags: MedicalRecord['tags'];
    attachments?: MedicalAttachment[];
    prescriptions?: string[];
  }) => {
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
  }, [currentPatientId]);

  const uploadMedicalReport = useCallback(async (file: File) => {
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
  }, [currentPatientId]);

  const uploadPrescriptionForSchedule = useCallback(async (file: File) => {
    if (!currentPatientId) {
      throw new Error('No patient selected');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', currentPatientId);

    const response = await apiRequest<{ plan: MedicationPlan }>('/medication/prescription', {
      method: 'POST',
      auth: true,
      body: formData,
    });

    setMedicationPlans((prev) => [response.plan, ...prev]);
    return response.plan;
  }, [currentPatientId]);

  const verifyDoseWithAI = useCallback(async (payload: {
    planId: string;
    medicineId: string;
    doseId: string;
    pillDetected: boolean;
    gestureDetected: boolean;
    confidence: number;
  }) => {
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
  }, []);

  const updateDoseStatus = useCallback(async (payload: {
    planId: string;
    medicineId: string;
    doseId: string;
    status: 'pending' | 'taken' | 'missed';
  }) => {
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
  }, []);

  const updatePatientProfile = useCallback(async (payload: {
    name: string;
    dateOfBirth: string;
    gender: string;
    bloodGroup: string;
    allergies: string[];
    emergencyContact: Patient['emergencyContact'];
  }) => {
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
  }, [currentPatientId]);

  const askAssistant = useCallback(async (question: string) => {
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
  }, [currentPatientId]);

  const logout = useCallback(() => {
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

  const value = useMemo(() => ({
    patient,
    role,
    authUser,
    isAuthenticated,
    isInitializing,
    isLoadingPatient,
    medicalRecords,
    prescriptions,
    medicationPlans,
    currentPatientId,
    setRole,
    setPatientContext,
    resolvePatientContext,
    loginWithPassword,
    requestOtp,
    verifyOtp,
    addMedicalRecord,
    uploadMedicalReport,
    uploadPrescriptionForSchedule,
    verifyDoseWithAI,
    updateDoseStatus,
    updatePatientProfile,
    askAssistant,
    logout,
  }), [
    addMedicalRecord,
    askAssistant,
    authUser,
    currentPatientId,
    isAuthenticated,
    isInitializing,
    isLoadingPatient,
    loginWithPassword,
    logout,
    medicalRecords,
    medicationPlans,
    patient,
    prescriptions,
    requestOtp,
    role,
    resolvePatientContext,
    setPatientContext,
    setRole,
    updatePatientProfile,
    updateDoseStatus,
    uploadMedicalReport,
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
