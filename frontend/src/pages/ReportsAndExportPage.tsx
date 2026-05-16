import { useMemo, useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileText,
  Download,
  Lock,
  Eye,
} from "lucide-react";
import {
  exportAsText,
  exportAsHTML,
  exportAsJSON,
  generateHTMLReport,
  printReport,
} from "@/lib/reportGenerator";
import type { ReportData } from "@/lib/reportGenerator";
import { useApp } from "@/contexts/AppContext";

interface ExportPreferences {
  includeVitals: boolean;
  includeMedications: boolean;
  includeMedicalHistory: boolean;
  anonymize: boolean;
}

export default function ReportsAndExportPage() {
  const { currentPatientId, patient, medicalRecords, medicationPlans } = useApp();
  const [preferences, setPreferences] = useState<ExportPreferences>({
    includeVitals: true,
    includeMedications: true,
    includeMedicalHistory: true,
    anonymize: false,
  });

  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState(false);

  const reportData = useMemo<ReportData>(() => {
    const sortedRecords = [...medicalRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const latestRecord = sortedRecords[0];
    const validRecordDates = medicalRecords
      .map((record) => new Date(record.date))
      .filter((date) => !Number.isNaN(date.getTime()));
    const allMedicines = medicationPlans.flatMap((plan) =>
      plan.medicines.map((medicine) => ({
        name: medicine.name,
        dosage: medicine.dosage,
        frequency: medicine.frequency,
        startDate: new Date(plan.createdAt),
        endDate:
          medicine.durationDays > 0
            ? new Date(new Date(plan.createdAt).getTime() + medicine.durationDays * 24 * 60 * 60 * 1000)
            : undefined,
      }))
    );
    const adherence = medicationPlans.reduce(
      (totals, plan) => ({
        taken: totals.taken + (plan.adherence?.taken || 0),
        missed: totals.missed + (plan.adherence?.missed || 0),
        pending: totals.pending + (plan.adherence?.pending || 0),
      }),
      { taken: 0, missed: 0, pending: 0 }
    );
    const summaryParts = [
      `This report is generated from the patient profile and ${medicalRecords.length} medical record${medicalRecords.length === 1 ? "" : "s"} currently available in Meditap AI.`,
    ];
    const latestRecordDate = latestRecord ? new Date(latestRecord.date) : null;

    if (latestRecord && latestRecordDate && !Number.isNaN(latestRecordDate.getTime())) {
      summaryParts.push(
        `Latest recorded visit: ${latestRecordDate.toLocaleDateString()} for ${latestRecord.diagnosis || latestRecord.title}.`
      );
    }

    if (patient?.allergies?.length) {
      summaryParts.push(`Recorded allergies: ${patient.allergies.join(", ")}.`);
    }

    if (allMedicines.length > 0) {
      summaryParts.push(
        `Medication data includes ${allMedicines.length} medicine${allMedicines.length === 1 ? "" : "s"} across ${medicationPlans.length} medication plan${medicationPlans.length === 1 ? "" : "s"}.`
      );
    }

    if (adherence.taken || adherence.missed || adherence.pending) {
      summaryParts.push(
        `Dose history shows ${adherence.taken} taken, ${adherence.missed} missed, and ${adherence.pending} pending dose${adherence.pending === 1 ? "" : "s"}.`
      );
    }

    summaryParts.push("No diagnosis, condition status, or recommendation is inferred beyond the stored medical history.");

    return {
      patientName: preferences.anonymize ? "Anonymized Patient" : patient?.name || "Patient not selected",
      patientId: preferences.anonymize ? "Hidden" : currentPatientId || patient?.id || "Unavailable",
      doctorName: latestRecord?.doctorName || latestRecord?.doctor,
      hospitalName: latestRecord?.hospital,
      reportType: "medical-history",
      generatedDate: new Date(),
      period:
        validRecordDates.length > 0
          ? {
              start: new Date(Math.min(...validRecordDates.map((date) => date.getTime()))),
              end: new Date(Math.max(...validRecordDates.map((date) => date.getTime()))),
            }
          : undefined,
      medicalRecords: preferences.includeMedicalHistory
        ? sortedRecords.map((record) => ({
            type: record.recordType,
            date: new Date(record.date),
            diagnosis: record.diagnosis || record.title,
            notes: [record.description, record.doctor ? `Doctor: ${record.doctor}` : "", record.hospital ? `Hospital: ${record.hospital}` : ""]
              .filter(Boolean)
              .join("\n"),
          }))
        : undefined,
      medications: preferences.includeMedications ? allMedicines : undefined,
      summary: summaryParts.join(" "),
    };
  }, [currentPatientId, medicalRecords, medicationPlans, patient, preferences.anonymize, preferences.includeMedicalHistory, preferences.includeMedications]);

  const reportPreviewHTML = useMemo(() => generateHTMLReport(reportData), [reportData]);

  const handleExportAsText = () => {
    exportAsText(reportData);
  };

  const handleExportAsHTML = () => {
    exportAsHTML(reportData);
  };

  const handleExportAsJSON = () => {
    exportAsJSON(reportData);
  };

  const handlePrint = () => {
    printReport(reportData);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Export</h1>
          <p className="text-muted-foreground mt-2">
            Generate reports and export patient data securely
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Export Your Medical Data</CardTitle>
            <CardDescription>
              Download your health records in various formats for backup or transfer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-medium">What to include:</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="vitals"
                    checked={preferences.includeVitals}
                    onCheckedChange={(checked) =>
                      setPreferences({
                        ...preferences,
                        includeVitals: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="vitals" className="cursor-pointer">
                    Vital Signs (Blood Pressure, Heart Rate, Temperature, Weight)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="medications"
                    checked={preferences.includeMedications}
                    onCheckedChange={(checked) =>
                      setPreferences({
                        ...preferences,
                        includeMedications: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="medications" className="cursor-pointer">
                    Medications & Prescriptions
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="medical-history"
                    checked={preferences.includeMedicalHistory}
                    onCheckedChange={(checked) =>
                      setPreferences({
                        ...preferences,
                        includeMedicalHistory: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="medical-history" className="cursor-pointer">
                    Medical History & Diagnoses
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium">Export format:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  onClick={handleExportAsJSON}
                  variant="outline"
                  className="justify-start"
                >
                  <Download className="mr-2 h-4 w-4" />
                  JSON (FHIR Standard)
                </Button>
                <Button
                  onClick={handleExportAsHTML}
                  variant="outline"
                  className="justify-start"
                >
                  <Download className="mr-2 h-4 w-4" />
                  HTML (Readable)
                </Button>
                <Button
                  onClick={handleExportAsText}
                  variant="outline"
                  className="justify-start"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Text Document
                </Button>
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  className="justify-start"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Print as PDF
                </Button>
                <Dialog open={isReportPreviewOpen} onOpenChange={setIsReportPreviewOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <Eye className="mr-2 h-4 w-4" />
                      Pop Up Report
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="flex h-[85vh] max-w-5xl flex-col gap-3 overflow-hidden">
                    <DialogHeader className="shrink-0">
                      <DialogTitle>Patient Medical Report</DialogTitle>
                      <DialogDescription>
                        Preview generated from the current patient data.
                      </DialogDescription>
                    </DialogHeader>
                    <iframe
                      title="Patient Medical Report Preview"
                      srcDoc={reportPreviewHTML}
                      className="min-h-0 flex-1 w-full rounded-md border bg-white"
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="anonymize"
                  checked={preferences.anonymize}
                  onCheckedChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      anonymize: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="anonymize" className="cursor-pointer">
                  Remove personal identifiers (anonymize data)
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Privacy Info */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" />
              Data Security & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>Exports are generated locally from the patient data currently loaded in the app.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
