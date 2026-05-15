import { useMemo, useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Input } from "@/components/ui/input";
import {
  FileText,
  Download,
  Share2,
  Lock,
  Clock,
  AlertCircle,
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
import QRCode from "qrcode";

interface ExportPreferences {
  includeVitals: boolean;
  includeMedications: boolean;
  includeMedicalHistory: boolean;
  anonymize: boolean;
  passwordProtect: boolean;
}

export default function ReportsAndExportPage() {
  const { currentPatientId, patient, medicalRecords, medicationPlans } = useApp();
  const [preferences, setPreferences] = useState<ExportPreferences>({
    includeVitals: true,
    includeMedications: true,
    includeMedicalHistory: true,
    anonymize: false,
    passwordProtect: false,
  });

  const [exportPassword, setExportPassword] = useState("");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareQR, setShareQR] = useState<string>("");
  const [shareExpiry, setShareExpiry] = useState("24"); // hours
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

  const handleGenerateShareToken = async () => {
    const token = Math.random().toString(36).substring(2, 15);
    setShareToken(token);

    // Generate QR code
    const shareUrl = `${window.location.origin}/share/${token}`;
    const qrUrl = await QRCode.toDataURL(shareUrl);
    setShareQR(qrUrl);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Export</h1>
          <p className="text-muted-foreground mt-2">
            Generate reports, export data, and share with healthcare providers securely
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="export" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="export">Export Data</TabsTrigger>
            <TabsTrigger value="reports">Generate Reports</TabsTrigger>
            <TabsTrigger value="sharing">Share Records</TabsTrigger>
          </TabsList>

          {/* Export Data Tab */}
          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Export Your Medical Data</CardTitle>
                <CardDescription>
                  Download your health records in various formats for backup or transfer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Export Preferences */}
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

                {/* Export Options */}
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
                  </div>
                </div>

                {/* Privacy Options */}
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
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="password"
                      checked={preferences.passwordProtect}
                      onCheckedChange={(checked) =>
                        setPreferences({
                          ...preferences,
                          passwordProtect: checked as boolean,
                        })
                      }
                    />
                    <Label htmlFor="password" className="cursor-pointer">
                      Protect with password
                    </Label>
                  </div>

                  {preferences.passwordProtect && (
                    <Input
                      type="password"
                      placeholder="Enter export password"
                      value={exportPassword}
                      onChange={(e) => setExportPassword(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Real-Time Patient Medical Report
                </CardTitle>
                <CardDescription>
                  Generated from the selected patient profile, medical history, and medication schedule.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Patient</p>
                    <p className="font-medium">{reportData.patientName}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Medical Records</p>
                    <p className="font-medium">{medicalRecords.length}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Medication Plans</p>
                    <p className="font-medium">{medicationPlans.length}</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">{reportData.summary}</p>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={handleExportAsHTML}>
                    <Download className="mr-2 h-4 w-4" />
                    Generate Report
                  </Button>
                  <Dialog open={isReportPreviewOpen} onOpenChange={setIsReportPreviewOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Eye className="mr-2 h-4 w-4" />
                        Pop Up Report
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-5xl h-[85vh]">
                      <DialogHeader>
                        <DialogTitle>Patient Medical Report</DialogTitle>
                        <DialogDescription>
                          Preview generated from the current patient data.
                        </DialogDescription>
                      </DialogHeader>
                      <iframe
                        title="Patient Medical Report Preview"
                        srcDoc={reportPreviewHTML}
                        className="h-full min-h-0 w-full rounded-md border bg-white"
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sharing Tab */}
          <TabsContent value="sharing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Share Medical Records Securely</CardTitle>
                <CardDescription>
                  Generate temporary access links to share with healthcare providers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Share validity period:</Label>
                    <div className="flex gap-2">
                      {["4", "24", "72"].map((hours) => (
                        <Button
                          key={hours}
                          variant={shareExpiry === hours ? "default" : "outline"}
                          onClick={() => setShareExpiry(hours)}
                          className="flex-1"
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          {hours}h
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        onClick={handleGenerateShareToken}
                        className="w-full"
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        Generate Share Link
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Share Medical Records</DialogTitle>
                        <DialogDescription>
                          Share this link or QR code with a healthcare provider
                        </DialogDescription>
                      </DialogHeader>

                      {shareToken && (
                        <div className="space-y-4">
                          <div className="text-center">
                            {shareQR && (
                              <img
                                src={shareQR}
                                alt="Share QR Code"
                                className="h-48 w-48 mx-auto"
                              />
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Share Link (Valid for {shareExpiry} hours):
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                readOnly
                                value={`${window.location.origin}/share/${shareToken}`}
                              />
                              <Button
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    `${window.location.origin}/share/${shareToken}`
                                  );
                                }}
                              >
                                Copy
                              </Button>
                            </div>
                          </div>

                          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                            <p className="text-xs text-blue-800 dark:text-blue-200">
                              The link will expire in {shareExpiry} hours. Only share
                              with trusted healthcare providers.
                            </p>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Active Shares */}
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Active Shares</h3>
                  <div className="space-y-2">
                    {shareToken ? (
                      <ShareItem
                        shareUrl={`${window.location.origin}/share/${shareToken}`}
                        expiresIn={`${shareExpiry} hours`}
                        onRevoke={() => {
                          setShareToken(null);
                          setShareQR("");
                        }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No active share link has been generated in this session.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
            <p>The password field is shown only when password protection is selected before export.</p>
            <p>Temporary share links can be revoked from this page during the current session.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function ShareItem({
  shareUrl,
  expiresIn,
  onRevoke,
}: {
  shareUrl: string;
  expiresIn: string;
  onRevoke: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="space-y-1">
        <p className="font-medium text-sm break-all">{shareUrl}</p>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Expires in {expiresIn}</span>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onRevoke}>
        Revoke
      </Button>
    </div>
  );
}
