import { MedicalAttachment, MedicalRecord, Patient, Prescription } from '@/types/patient';

type BackendPatient = {
  _id?: string;
  patientId?: string;
  fullName?: string;
  name?: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  allergies?: string[] | null;
  chronicDiseases?: string[] | null;
  currentMedications?: string[] | null;
  emergencyContact?: {
    name?: string | null;
    phone?: string | null;
    relation?: string | null;
  } | null;
  photo?: string | null;
  age?: number | null;
};

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

function calculateAge(dateOfBirth: string | null | undefined, backendAge?: number | null) {
  if (typeof backendAge === 'number') {
    return backendAge;
  }

  if (!dateOfBirth) {
    return 0;
  }

  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return Number.isNaN(age) ? 0 : age;
}

export function mapBackendPatient(patient: BackendPatient): Patient {
  const dateOfBirth = patient.dateOfBirth || '';

  return {
    id: patient._id || patient.patientId || '',
    name: patient.fullName || patient.name || 'Unknown Patient',
    age: calculateAge(dateOfBirth, patient.age),
    bloodGroup: patient.bloodGroup || 'Unknown',
    allergies: patient.allergies || [],
    emergencyContact: {
      name: patient.emergencyContact?.name || 'Not available',
      phone: patient.emergencyContact?.phone || 'Not available',
      relation: patient.emergencyContact?.relation || 'Contact',
    },
    photo: patient.photo || undefined,
    dateOfBirth,
    gender: patient.gender || 'Unknown',
    chronicDiseases: patient.chronicDiseases || [],
    currentMedications: patient.currentMedications || [],
  };
}

export function mapBackendMedicalRecord(record: BackendMedicalRecord): MedicalRecord {
  const diagnosis = record.diagnosis || 'No diagnosis recorded';
  const description = record.description || record.notes || diagnosis;
  const doctorName =
    typeof record.doctor === 'string'
      ? record.doctor
      : record.doctor?.name || 'Unknown Doctor';
  const tags = (record.tags || []).filter((tag): tag is MedicalRecord['tags'][number] =>
    ['chronic', 'acute', 'allergy-related', 'injury', 'infection', 'lifestyle'].includes(tag)
  );

  const attachments: MedicalAttachment[] | undefined =
    record.attachments && record.attachments.length > 0
      ? record.attachments
          .map((attachment) =>
            typeof attachment === 'string'
              ? {
                  accessUrl: attachment,
                  fileName: null,
                  mimeType: null,
                  publicId: null,
                  resourceType: null,
                  format: null,
                }
              : {
                  accessUrl: attachment.accessUrl || null,
                  fileName: attachment.fileName || null,
                  mimeType: attachment.mimeType || null,
                  publicId: attachment.publicId || null,
                  resourceType: attachment.resourceType || null,
                  format: attachment.format || null,
                }
          )
          .filter((attachment) => Boolean(attachment.accessUrl))
      : record.fileUrl
        ? [{
            accessUrl: record.fileUrl,
            fileName: null,
            mimeType: null,
            publicId: null,
            resourceType: null,
            format: null,
          }]
        : undefined;

  return {
    id: record._id,
    date: record.visitDate || new Date().toISOString(),
    title: record.title || diagnosis,
    diagnosis,
    doctor: doctorName,
    hospital: record.hospital || 'Unknown Hospital',
    department: record.department || undefined,
    description,
    attachments,
    recordType: record.recordType || 'consultation',
    severity: record.severity || 'normal',
    tags,
  };
}

export function derivePrescriptions(records: BackendMedicalRecord[]): Prescription[] {
  return records
    .filter((record) => Array.isArray(record.prescriptions) && record.prescriptions.length > 0)
    .map((record) => {
      const doctorName =
        typeof record.doctor === 'string'
          ? record.doctor
          : record.doctor?.name || 'Unknown Doctor';

      return {
        id: `rx-${record._id}`,
        date: record.visitDate || new Date().toISOString(),
        doctor: doctorName,
        medicines: (record.prescriptions || []).map((prescription) => ({
          name: prescription,
          dosage: 'As prescribed',
          frequency: 'See doctor notes',
          duration: 'Follow medical advice',
        })),
        notes: record.notes || record.description || undefined,
      };
    });
}
