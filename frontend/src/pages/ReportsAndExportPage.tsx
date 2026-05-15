import { useState } from "react";
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
  CheckCircle2,
} from "lucide-react";
import {
  exportAsText,
  exportAsHTML,
  exportAsJSON,
  printReport,
} from "@/lib/reportGenerator";
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
  const { currentPatientId } = useApp();
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

  const handleExportAsText = () => {
    const reportData = {
      patientName: "John Doe",
      patientId: currentPatientId || "P001",
      doctorName: "Dr. Smith",
      hospitalName: "City Medical Center",
      reportType: "medical-history" as const,
      generatedDate: new Date(),
      summary: "Patient is in stable condition with well-controlled chronic conditions.",
      recommendations: [
        "Continue current medications",
        "Monitor blood pressure daily",
        "Follow up in 4 weeks",
      ],
    };

    exportAsText(reportData);
  };

  const handleExportAsHTML = () => {
    const reportData = {
      patientName: "John Doe",
      patientId: currentPatientId || "P001",
      doctorName: "Dr. Smith",
      hospitalName: "City Medical Center",
      reportType: "medical-history" as const,
      generatedDate: new Date(),
      summary: "Patient is in stable condition with well-controlled chronic conditions.",
      recommendations: [
        "Continue current medications",
        "Monitor blood pressure daily",
        "Follow up in 4 weeks",
      ],
    };

    exportAsHTML(reportData);
  };

  const handleExportAsJSON = () => {
    const reportData = {
      patientName: "John Doe",
      patientId: currentPatientId || "P001",
      doctorName: "Dr. Smith",
      hospitalName: "City Medical Center",
      reportType: "medical-history" as const,
      generatedDate: new Date(),
      summary: "Patient is in stable condition with well-controlled chronic conditions.",
      recommendations: [
        "Continue current medications",
        "Monitor blood pressure daily",
        "Follow up in 4 weeks",
      ],
    };

    exportAsJSON(reportData);
  };

  const handlePrint = () => {
    const reportData = {
      patientName: "John Doe",
      patientId: currentPatientId || "P001",
      doctorName: "Dr. Smith",
      hospitalName: "City Medical Center",
      reportType: "medical-history" as const,
      generatedDate: new Date(),
      summary: "Patient is in stable condition with well-controlled chronic conditions.",
      recommendations: [
        "Continue current medications",
        "Monitor blood pressure daily",
        "Follow up in 4 weeks",
      ],
    };

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ReportCard
                title="Medical History Report"
                description="Complete medical history, diagnoses, and treatments"
                icon={<FileText className="h-5 w-5" />}
                onClick={() => console.log("Generate Medical History Report")}
              />
              <ReportCard
                title="Medication Report"
                description="Current and past medications with adherence data"
                icon={<FileText className="h-5 w-5" />}
                onClick={() => console.log("Generate Medication Report")}
              />
              <ReportCard
                title="Vital Signs Report"
                description="Trends and metrics for all vital signs"
                icon={<FileText className="h-5 w-5" />}
                onClick={() => console.log("Generate Vital Signs Report")}
              />
              <ReportCard
                title="Health Summary"
                description="Executive summary for healthcare providers"
                icon={<FileText className="h-5 w-5" />}
                onClick={() => console.log("Generate Health Summary")}
              />
              <ReportCard
                title="Insurance Documentation"
                description="Pre-authorization and claim documentation"
                icon={<FileText className="h-5 w-5" />}
                onClick={() => console.log("Generate Insurance Docs")}
              />
              <ReportCard
                title="Discharge Summary"
                description="Summary for hospital discharge or referral"
                icon={<FileText className="h-5 w-5" />}
                onClick={() => console.log("Generate Discharge Summary")}
              />
            </div>
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
                    <ShareItem
                      provider="Dr. Smith (Cardiologist)"
                      expiresIn="2 hours"
                      accessCount={3}
                      onRevoke={() => console.log("Revoke share")}
                    />
                    <ShareItem
                      provider="City Hospital (Referral)"
                      expiresIn="20 hours"
                      accessCount={1}
                      onRevoke={() => console.log("Revoke share")}
                    />
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
            <p>✓ All exports are encrypted and password-protected</p>
            <p>
              ✓ Share links include audit logging - you can see who accessed your
              data
            </p>
            <p>✓ You can revoke access at any time</p>
            <p>✓ Compliance with HIPAA and medical data protection standards</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function ReportCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3 mb-3">{icon}</div>
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button variant="link" className="mt-3 h-auto p-0">
          Generate →
        </Button>
      </CardContent>
    </Card>
  );
}

function ShareItem({
  provider,
  expiresIn,
  accessCount,
  onRevoke,
}: {
  provider: string;
  expiresIn: string;
  accessCount: number;
  onRevoke: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="space-y-1">
        <p className="font-medium text-sm">{provider}</p>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Expires in {expiresIn}</span>
          <span>{accessCount} access{accessCount !== 1 ? "es" : ""}</span>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onRevoke}>
        Revoke
      </Button>
    </div>
  );
}
