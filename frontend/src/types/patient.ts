export interface Patient {
  id: string;
  name: string;
  age: number;
  bloodGroup: string;
  phone?: string;
  allergies: string[];
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  photo?: string;
  dateOfBirth: string;
  gender: string;
  chronicDiseases?: string[];
  currentMedications?: string[];
}

export type RecordType = 'consultation' | 'diagnosis' | 'lab-test' | 'surgery' | 'admission' | 'discharge' | 'emergency';
export type Severity = 'normal' | 'critical' | 'emergency' | 'follow-up';
export type ConditionTag = 'chronic' | 'acute' | 'allergy-related' | 'injury' | 'infection' | 'lifestyle';

export interface MedicalAttachment {
  publicId?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  resourceType?: string | null;
  format?: string | null;
  accessUrl: string | null;
}

export interface MedicalRecord {
  id: string;
  date: string;
  title: string;
  diagnosis: string;
  doctor: string;
  hospital: string;
  department?: string;
  description: string;
  attachments?: MedicalAttachment[];
  recordType: RecordType;
  severity: Severity;
  tags: ConditionTag[];
}

export interface Prescription {
  id: string;
  date: string;
  doctor: string;
  medicines: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }[];
  notes?: string;
}

export type DoseStatus = 'pending' | 'taken' | 'missed';

export interface MedicationDose {
  _id: string;
  scheduledAt: string;
  timingLabel: string;
  status: DoseStatus;
  reminderLevel: number;
  verifiedByAI: boolean;
  verificationNotes?: string;
  takenAt?: string;
  missedAt?: string;
}

export interface MedicationMedicine {
  _id: string;
  name: string;
  dosage: string;
  timing: string[];
  duration: string;
  durationDays: number;
  frequency: string;
  frequencyPerDay: number;
  quantityPerDose: number;
  stockQuantity: number;
  refillReminderAt?: string;
  doses: MedicationDose[];
}

export interface MedicationPlan {
  id: string;
  patient: string;
  source: 'ocr' | 'manual' | 'import';
  prescriptionText?: string;
  sourceFileUrl?: string;
  sourceFilePublicId?: string;
  sourceFileName?: string;
  medicines: MedicationMedicine[];
  agentTrace: {
    agent: string;
    status: string;
    summary: string;
    completedAt?: string;
  }[];
  adherence: {
    doses: Array<MedicationDose & {
      planId?: string;
      medicineId?: string;
      medicineName?: string;
      doseId?: string;
    }>;
    taken: number;
    missed: number;
    pending: number;
    adherenceRate: number;
  };
  refillAlerts: {
    medicineId: string;
    medicineName: string;
    refillReminderAt: string;
    stockQuantity: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'doctor' | 'receptionist' | 'emergency';

export interface AuthState {
  isAuthenticated: boolean;
  role: UserRole | null;
  patient: Patient | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
