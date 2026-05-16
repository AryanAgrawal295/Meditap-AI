import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Upload, ScanText, RefreshCcw, Smartphone } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { MedicalAttachment, RecordType, Severity, ConditionTag } from '@/types/patient';
import { cn } from '@/lib/utils';
import { DocumentScanner } from '@/components/DocumentScanner';

const recordTypes: { value: RecordType; label: string }[] = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'diagnosis', label: 'Diagnosis' },
  { value: 'lab-test', label: 'Lab Test' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'admission', label: 'Hospital Admission' },
  { value: 'discharge', label: 'Discharge Summary' },
  { value: 'emergency', label: 'Emergency Visit' },
];

const severityOptions: { value: Severity; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'critical', label: 'Critical' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'follow-up', label: 'Follow-up Required' },
];

const tagOptions: { value: ConditionTag; label: string }[] = [
  { value: 'chronic', label: 'Chronic' },
  { value: 'acute', label: 'Acute' },
  { value: 'allergy-related', label: 'Allergy-related' },
  { value: 'injury', label: 'Injury' },
  { value: 'infection', label: 'Infection' },
  { value: 'lifestyle', label: 'Lifestyle-related' },
];

const COMMON_MEDICINE_NOISE = [
  'mg',
  'ml',
  'tab',
  'tablet',
  'cap',
  'capsule',
  'syrup',
  'inj',
  'injection',
  'od',
  'bd',
  'tid',
  'qid',
];

function normalizeOCRValue(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/[,:;]+$/g, '')
    .trim();
}

function isLikelyDiagnosis(value: string) {
  const normalized = normalizeOCRValue(value);

  if (!normalized || normalized.length < 3 || normalized.length > 80) {
    return false;
  }

  const lower = normalized.toLowerCase();

  if (COMMON_MEDICINE_NOISE.some((token) => lower.includes(` ${token}`) || lower === token)) {
    return false;
  }

  if (/\b\d+\s?(mg|ml|mcg|g|iu)\b/i.test(normalized)) {
    return false;
  }

  if (/[+/]/.test(normalized)) {
    return false;
  }

  return /[a-z]{2,}/i.test(normalized);
}

function uniqueNormalized(values: string[]) {
  return [...new Set(values.map(normalizeOCRValue).filter(Boolean))];
}

function keepShortText(value?: string) {
  const normalized = normalizeOCRValue(value || '');
  return normalized.length > 160 ? normalized.slice(0, 160).trim() : normalized;
}

function toDateInputValue(value?: string) {
  const text = normalizeOCRValue(value || '');
  if (!text) return '';

  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const numericMatch = text.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/);
  if (numericMatch) {
    const first = Number(numericMatch[1]);
    const second = Number(numericMatch[2]);
    const year = numericMatch[3].length === 2 ? `20${numericMatch[3]}` : numericMatch[3];
    const day = first > 12 ? first : second > 12 ? second : first;
    const month = first > 12 ? second : second > 12 ? first : second;

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const monthMatch = text.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/i,
  );
  if (monthMatch) {
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const month = monthNames.findIndex((name) => monthMatch[1].toLowerCase().startsWith(name)) + 1;
    const day = Number(monthMatch[2]);
    const year = monthMatch[3] || String(new Date().getFullYear());

    if (month >= 1 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return '';
}

export default function AddMedicalRecordPage() {
  const navigate = useNavigate();
  const { addMedicalRecord, processPrescriptionOCR, uploadMedicalReport, uploadPrescriptionForSchedule } = useApp();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const prescriptionInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    diagnosis: '',
    doctor: '',
    hospital: '',
    department: '',
    description: '',
    recordType: '' as RecordType | '',
    severity: 'normal' as Severity,
    tags: [] as ConditionTag[],
  });

  const [attachments, setAttachments] = useState<MedicalAttachment[]>([]);
  const [prescriptions, setPrescriptions] = useState<string[]>([]);
  const [ocrSummary, setOcrSummary] = useState<{
    cleanedText: string;
    conditions: string[];
    medications: string[];
    procedures: string[];
    suggestedDate?: string;
    suggestedDoctor?: string;
    suggestedHospital?: string;
  } | null>(null);
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [isScanningPrescription, setIsScanningPrescription] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDocumentScanner, setShowDocumentScanner] = useState(false);
  const [isUploadingScannedDocument, setIsUploadingScannedDocument] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleTag = (tag: ConditionTag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.date || !formData.diagnosis || !formData.hospital || !formData.recordType) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const newRecord = {
      title: formData.title,
      date: formData.date,
      diagnosis: formData.diagnosis,
      doctorName: formData.doctor.trim() || undefined,
      hospital: formData.hospital,
      department: formData.department || undefined,
      description: formData.description,
      recordType: formData.recordType as RecordType,
      severity: formData.severity,
      tags: formData.tags,
      attachments: attachments.length > 0 ? attachments : undefined,
      prescriptions: prescriptions.length > 0 ? prescriptions : undefined,
    };

    try {
      setIsSaving(true);
      await addMedicalRecord(newRecord);

      if (prescriptionFile) {
        await uploadPrescriptionForSchedule(prescriptionFile);
      }

      toast({
        title: "Record Added",
        description: prescriptionFile
          ? "Medical record and prescription schedule were created successfully."
          : "Medical record has been successfully added.",
      });

      navigate('/medical-history');
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Could not save the medical record.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const uploadedFile = await uploadMedicalReport(file);
      setAttachments(prev => [...prev, uploadedFile]);
      toast({
        title: "File Uploaded",
        description: "Document has been attached to the record.",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Could not upload the document.",
        variant: "destructive",
      });
    } finally {
      event.target.value = '';
    }
  };

  const handleScannedDocumentCapture = async (file: File) => {
    try {
      setIsUploadingScannedDocument(true);
      const uploadedFile = await uploadMedicalReport(file);
      setAttachments(prev => [...prev, uploadedFile]);
      
      toast({
        title: "Document Scanned",
        description: "Scanned document has been attached to the record.",
      });
    } catch (error) {
      toast({
        title: "Scan Upload Failed",
        description: error instanceof Error ? error.message : "Could not upload the scanned document.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingScannedDocument(false);
    }
  };

  const handlePrescriptionScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setIsScanningPrescription(true);
      const ocrResult = await processPrescriptionOCR(file);

      const cleanedConditions = uniqueNormalized(ocrResult.conditions).filter(isLikelyDiagnosis);
      const medicationNames = ocrResult.structuredMedicines
        .map((medicine) => medicine.name?.trim())
        .filter((name): name is string => Boolean(name))
        .map(normalizeOCRValue)
        .filter((name) => name.length >= 2);

      const medicationsFromEntities = uniqueNormalized(ocrResult.medications);
      const mergedPrescriptionNames = uniqueNormalized([...medicationNames, ...medicationsFromEntities]);
      const cleanedProcedures = uniqueNormalized(ocrResult.procedures).filter((value) => value.length >= 2 && value.length <= 60);
      const diagnosisText = keepShortText(ocrResult.recordSuggestions?.diagnosis) || cleanedConditions.join(', ');
      const suggestedTitle = keepShortText(ocrResult.recordSuggestions?.title);
      const suggestedDescription = keepShortText(ocrResult.recordSuggestions?.description);
      const suggestedDate =
        toDateInputValue(ocrResult.recordSuggestions?.visitDate) ||
        toDateInputValue(ocrResult.rawText) ||
        toDateInputValue(ocrResult.cleanedText);
      const suggestedDoctor = keepShortText(ocrResult.recordSuggestions?.doctorName);
      const suggestedDepartment = keepShortText(ocrResult.recordSuggestions?.department);
      const suggestedHospital = keepShortText(ocrResult.recordSuggestions?.hospital);

      setPrescriptionFile(file);
      setPrescriptions(mergedPrescriptionNames);
      setOcrSummary({
        cleanedText: ocrResult.cleanedText,
        conditions: cleanedConditions,
        medications: mergedPrescriptionNames,
        procedures: cleanedProcedures,
        suggestedDate,
        suggestedDoctor,
        suggestedHospital,
      });

      setFormData((prev) => ({
        ...prev,
        title:
          prev.title ||
          suggestedTitle ||
          (cleanedConditions[0]
            ? `${cleanedConditions[0]} Prescription`
            : file.name.replace(/\.[^/.]+$/, '')),
        date: prev.date || suggestedDate,
        diagnosis: prev.diagnosis || diagnosisText,
        doctor: prev.doctor || suggestedDoctor,
        department: prev.department || suggestedDepartment,
        hospital: prev.hospital || suggestedHospital,
        description: prev.description || suggestedDescription,
        recordType: prev.recordType || 'diagnosis',
        tags:
          prev.tags.length > 0
            ? prev.tags
            : cleanedConditions.length > 0
              ? ['acute']
              : prev.tags,
      }));

      toast({
        title: "Prescription scanned",
        description: diagnosisText
          ? "OCR completed. Diagnosis was filled conservatively from detected conditions."
          : "OCR completed. Review detected medicines and fill diagnosis manually if needed.",
      });
    } catch (error) {
      toast({
        title: "OCR Failed",
        description: error instanceof Error ? error.message : "Could not extract data from the prescription.",
        variant: "destructive",
      });
    } finally {
      setIsScanningPrescription(false);
      event.target.value = '';
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/medical-history')}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="font-display text-2xl lg:text-3xl text-foreground">Add Medical Record</h1>
          <p className="text-muted-foreground">Create a new medical record entry</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl">
        <div className="space-y-6">
          {/* Basic Info Section */}
          <div className="medical-card">
            <h2 className="font-display text-lg text-foreground mb-4">Basic Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Title *</label>
                <Input
                  placeholder="e.g., Annual Checkup"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Date *</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Record Type *</label>
                <Select value={formData.recordType} onValueChange={(v) => handleInputChange('recordType', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {recordTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Severity *</label>
                <Select value={formData.severity} onValueChange={(v) => handleInputChange('severity', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {severityOptions.map(sev => (
                      <SelectItem key={sev.value} value={sev.value}>{sev.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Medical Details */}
          <div className="medical-card">
            <h2 className="font-display text-lg text-foreground mb-4">Medical Details</h2>
            <div className="space-y-4">
              <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-medium text-foreground flex items-center gap-2">
                      <ScanText size={16} className="text-primary" />
                      Scan Prescription
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload a PDF, JPG, JPEG, or PNG prescription to auto-fill this record and create the medication schedule when you save.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => prescriptionInputRef.current?.click()}
                    disabled={isScanningPrescription}
                  >
                    {isScanningPrescription ? <RefreshCcw size={16} className="animate-spin" /> : <ScanText size={16} />}
                    {isScanningPrescription ? 'Scanning...' : 'Upload Prescription'}
                  </Button>
                </div>
                <input
                  ref={prescriptionInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  className="hidden"
                  onChange={handlePrescriptionScan}
                />

                {(prescriptionFile || ocrSummary) && (
                  <div className="mt-4 space-y-2 text-sm">
                    {prescriptionFile && (
                      <p className="text-foreground">
                        Selected file: <span className="text-muted-foreground">{prescriptionFile.name}</span>
                      </p>
                    )}
                    {ocrSummary?.medications?.length ? (
                      <p className="text-foreground">
                        Medicines detected: <span className="text-muted-foreground">{ocrSummary.medications.join(', ')}</span>
                      </p>
                    ) : null}
                    {ocrSummary?.conditions?.length ? (
                      <p className="text-foreground">
                        Conditions detected: <span className="text-muted-foreground">{ocrSummary.conditions.join(', ')}</span>
                      </p>
                    ) : null}
                    {ocrSummary?.suggestedDate ? (
                      <p className="text-foreground">
                        Date detected: <span className="text-muted-foreground">{ocrSummary.suggestedDate}</span>
                      </p>
                    ) : null}
                    {ocrSummary?.suggestedDoctor ? (
                      <p className="text-foreground">
                        Doctor detected: <span className="text-muted-foreground">{ocrSummary.suggestedDoctor}</span>
                      </p>
                    ) : null}
                    {ocrSummary?.suggestedHospital ? (
                      <p className="text-foreground">
                        Hospital detected: <span className="text-muted-foreground">{ocrSummary.suggestedHospital}</span>
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Diagnosis *</label>
                <Input
                  placeholder="Primary diagnosis"
                  value={formData.diagnosis}
                  onChange={(e) => handleInputChange('diagnosis', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Description</label>
                <Textarea
                  placeholder="Detailed description of the visit, findings, and recommendations..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Provider Info */}
          <div className="medical-card">
            <h2 className="font-display text-lg text-foreground mb-4">Provider Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Doctor Name</label>
                <Input
                  placeholder="e.g., Dr. Emily Chen"
                  value={formData.doctor}
                  onChange={(e) => handleInputChange('doctor', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Department</label>
                <Input
                  placeholder="e.g., Cardiology"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <label className="text-sm font-medium text-foreground">Hospital/Clinic *</label>
                <Input
                  placeholder="e.g., City Medical Center"
                  value={formData.hospital}
                  onChange={(e) => handleInputChange('hospital', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Tags Section */}
          <div className="medical-card">
            <h2 className="font-display text-lg text-foreground mb-4">Condition Tags</h2>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map(tag => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleTag(tag.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                    formData.tags.includes(tag.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-secondary-foreground border-border hover:border-primary"
                  )}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Attachments */}
          <div className="medical-card">
            <h2 className="font-display text-lg text-foreground mb-4">Attachments</h2>
            <div className="space-y-3">
              <div className="flex gap-2 flex-col sm:flex-row">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingScannedDocument}
                >
                  <Upload size={16} />
                  Upload Document
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowDocumentScanner(true)}
                  disabled={isUploadingScannedDocument}
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  <Smartphone size={16} />
                  Scan Document
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleFileUpload}
              />
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Attached Documents ({attachments.length})</p>
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-2 text-sm">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-semibold text-primary">
                        {index + 1}
                      </span>
                      <span className="truncate text-foreground">{file.fileName || `Attachment ${index + 1}`}</span>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {file.format ? `.${file.format}` : file.mimeType?.split('/')[1] || 'file'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/medical-history')}>
              Cancel
            </Button>
            <Button type="submit" variant="medical" disabled={isSaving || isScanningPrescription}>
              {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
              {isSaving ? 'Saving...' : 'Save Record'}
            </Button>
          </div>
        </div>
      </form>

      {/* Document Scanner Modal */}
      {showDocumentScanner && (
        <DocumentScanner
          onCapture={handleScannedDocumentCapture}
          onClose={() => setShowDocumentScanner(false)}
          isProcessing={isUploadingScannedDocument}
        />
      )}
    </DashboardLayout>
  );
}
