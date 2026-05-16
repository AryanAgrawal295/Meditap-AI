import { MedicalRecord, MedicationPlan, Patient, Prescription } from '@/types/patient';

const today = new Date();
const isoAt = (hours: number, minutes = 0, dayOffset = 0) => {
  const date = new Date(today);
  date.setDate(today.getDate() + dayOffset);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

export const helpmanDemoPatient: Patient = {
  id: 'DEMO-JOHN-SMITH',
  name: 'John Smith',
  age: 58,
  bloodGroup: 'B+',
  allergies: ['Sulfa drugs'],
  emergencyContact: {
    name: 'Mary Smith',
    phone: '+1 (555) 014-2210',
    relation: 'Spouse',
  },
  dateOfBirth: '1967-09-12',
  gender: 'Male',
  chronicDiseases: ['Type 2 Diabetes', 'Hypertension'],
  currentMedications: ['Metformin', 'Lisinopril', 'Atorvastatin'],
};

export const helpmanDemoMedicalRecords: MedicalRecord[] = [
  {
    id: 'DEMO-MR-1',
    date: isoAt(10, 0, -4),
    title: 'Diabetes Follow-up',
    diagnosis: 'Blood sugar improving with current medication plan',
    doctor: 'Dr. Emily Carter',
    hospital: 'Green Valley Clinic',
    department: 'Endocrinology',
    description: 'Reviewed fasting glucose readings and adjusted diet guidance. Continue medication adherence monitoring.',
    recordType: 'consultation',
    severity: 'follow-up',
    tags: ['chronic'],
  },
  {
    id: 'DEMO-MR-2',
    date: isoAt(14, 30, -16),
    title: 'Blood Pressure Review',
    diagnosis: 'Hypertension controlled',
    doctor: 'Dr. Ryan Patel',
    hospital: 'City Care Hospital',
    department: 'Cardiology',
    description: 'Blood pressure readings are stable. Continue Lisinopril and reduce sodium intake.',
    recordType: 'diagnosis',
    severity: 'normal',
    tags: ['chronic', 'lifestyle'],
  },
  {
    id: 'DEMO-MR-3',
    date: isoAt(9, 15, -42),
    title: 'Lipid Panel',
    diagnosis: 'LDL cholesterol mildly elevated',
    doctor: 'Dr. Nina Brooks',
    hospital: 'City Care Hospital',
    department: 'Pathology',
    description: 'Lab results reviewed. Atorvastatin started with follow-up labs planned.',
    recordType: 'lab-test',
    severity: 'follow-up',
    tags: ['chronic'],
  },
];

export const helpmanDemoPrescriptions: Prescription[] = [
  {
    id: 'DEMO-RX-1',
    date: isoAt(10, 0, -4),
    doctor: 'Dr. Emily Carter',
    medicines: [
      {
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'Twice daily',
        duration: '30 days',
      },
      {
        name: 'Lisinopril',
        dosage: '10mg',
        frequency: 'Once daily',
        duration: '30 days',
      },
    ],
    notes: 'Take Metformin after meals. Keep daily sugar log.',
  },
];

export const helpmanDemoMedicationPlans: MedicationPlan[] = [
  {
    id: 'DEMO-PLAN-1',
    patient: helpmanDemoPatient.id,
    source: 'manual',
    status: 'active',
    sourceFileName: 'john-smith-morning-rx.pdf',
    prescriptionFiles: [
      {
        index: 1,
        tag: 'Prescription 1',
        fileName: 'john-smith-morning-rx.pdf',
        uploadedAt: isoAt(9, 0, -2),
      },
    ],
    medicines: [
      {
        _id: 'DEMO-MED-1',
        name: 'Metformin',
        dosage: '500mg',
        timing: ['morning', 'evening'],
        duration: '30 days',
        durationDays: 30,
        frequency: 'Twice daily',
        frequencyPerDay: 2,
        quantityPerDose: 1,
        stockQuantity: 24,
        prescriptionIndex: 1,
        prescriptionTag: 'Prescription 1',
        refillReminderAt: isoAt(9, 0, 12),
        doses: [
          {
            _id: 'DEMO-DOSE-1',
            scheduledAt: isoAt(8, 30),
            timingLabel: 'Morning',
            status: 'pending',
            reminderLevel: 0,
            verifiedByAI: false,
          },
          {
            _id: 'DEMO-DOSE-2',
            scheduledAt: isoAt(20, 30),
            timingLabel: 'Evening',
            status: 'pending',
            reminderLevel: 0,
            verifiedByAI: false,
          },
        ],
      },
      {
        _id: 'DEMO-MED-2',
        name: 'Lisinopril',
        dosage: '10mg',
        timing: ['morning'],
        duration: '30 days',
        durationDays: 30,
        frequency: 'Once daily',
        frequencyPerDay: 1,
        quantityPerDose: 1,
        stockQuantity: 18,
        prescriptionIndex: 1,
        prescriptionTag: 'Prescription 1',
        refillReminderAt: isoAt(8, 0, 18),
        doses: [
          {
            _id: 'DEMO-DOSE-3',
            scheduledAt: isoAt(9, 0),
            timingLabel: 'Morning',
            status: 'pending',
            reminderLevel: 1,
            verifiedByAI: false,
          },
        ],
      },
    ],
    agentTrace: [
      {
        agent: 'Helpman Demo',
        status: 'complete',
        summary: 'Demo schedule generated locally for John Smith.',
        completedAt: isoAt(9, 5, -2),
      },
    ],
    adherence: {
      doses: [],
      taken: 6,
      missed: 1,
      pending: 3,
      adherenceRate: 60,
    },
    refillAlerts: [
      {
        medicineId: 'DEMO-MED-1',
        medicineName: 'Metformin',
        refillReminderAt: isoAt(9, 0, 12),
        stockQuantity: 24,
      },
    ],
    createdAt: isoAt(9, 0, -2),
    updatedAt: isoAt(9, 5, -2),
  },
  {
    id: 'DEMO-PLAN-2',
    patient: helpmanDemoPatient.id,
    source: 'manual',
    status: 'active',
    sourceFileName: 'john-smith-heart-rx.pdf',
    medicines: [
      {
        _id: 'DEMO-MED-3',
        name: 'Atorvastatin',
        dosage: '20mg',
        timing: ['night'],
        duration: '30 days',
        durationDays: 30,
        frequency: 'Once daily',
        frequencyPerDay: 1,
        quantityPerDose: 1,
        stockQuantity: 16,
        prescriptionIndex: 1,
        prescriptionTag: 'Prescription 1',
        refillReminderAt: isoAt(21, 0, 16),
        doses: [
          {
            _id: 'DEMO-DOSE-4',
            scheduledAt: isoAt(21, 0),
            timingLabel: 'Night',
            status: 'pending',
            reminderLevel: 0,
            verifiedByAI: false,
          },
        ],
      },
    ],
    agentTrace: [
      {
        agent: 'Helpman Demo',
        status: 'complete',
        summary: 'Second ongoing schedule generated locally for John Smith.',
        completedAt: isoAt(12, 0, -1),
      },
    ],
    adherence: {
      doses: [],
      taken: 3,
      missed: 0,
      pending: 1,
      adherenceRate: 75,
    },
    refillAlerts: [],
    createdAt: isoAt(12, 0, -1),
    updatedAt: isoAt(12, 2, -1),
  },
];
