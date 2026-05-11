import { useMemo, useRef, useState } from 'react';
import {
  AlarmClock,
  Bell,
  Camera,
  CheckCircle2,
  Clock,
  FileImage,
  HeartPulse,
  Pill,
  RefreshCcw,
  ShieldCheck,
  XCircle,
  ExternalLink,
  RefreshCcw,
} from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { MedicationDose, MedicationMedicine, MedicationPlan } from '@/types/patient';
import { cn } from '@/lib/utils';
import PillDetector from '@/components/PillDetector';

type TimelineDose = MedicationDose & {
  planId: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getDoseTone(status: MedicationDose['status']) {
  if (status === 'taken') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'missed') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

function flattenTimeline(plans: MedicationPlan[]) {
  return plans
    .flatMap((plan) =>
      plan.medicines.flatMap((medicine) =>
        medicine.doses.slice(0, 10).map((dose) => ({
          ...dose,
          planId: plan.id,
          medicineId: medicine._id,
          medicineName: medicine.name,
          dosage: medicine.dosage,
        }))
      )
    )
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

function getPlanAdherence(plans: MedicationPlan[]) {
  const totals = plans.reduce(
    (acc, plan) => {
      acc.taken += plan.adherence.taken;
      acc.missed += plan.adherence.missed;
      acc.pending += plan.adherence.pending;
      return acc;
    },
    { taken: 0, missed: 0, pending: 0 }
  );
  const total = totals.taken + totals.missed + totals.pending;
  return {
    ...totals,
    total,
    rate: total ? Math.round((totals.taken / total) * 100) : 0,
  };
}

function MedicineCard({ medicine }: { medicine: MedicationMedicine }) {
  const completed = medicine.doses.filter((dose) => dose.status === 'taken').length;
  const refillDate = medicine.refillReminderAt ? formatDateTime(medicine.refillReminderAt) : 'Not predicted';

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium text-foreground truncate">{medicine.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {medicine.dosage} • {medicine.frequency} • {medicine.duration}
          </p>
        </div>
        <Pill className="text-primary shrink-0" size={20} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Timing</p>
          <p className="font-medium text-foreground capitalize">{medicine.timing.join(', ')}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Tracked</p>
          <p className="font-medium text-foreground">
            {completed}/{medicine.doses.length} doses
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-md bg-secondary/60 p-3 text-sm">
        <div className="flex items-center gap-2 text-foreground">
          <RefreshCcw size={15} className="text-primary" />
          <span className="font-medium">Refill prediction</span>
        </div>
        <p className="text-muted-foreground mt-1">Reminder around {refillDate}</p>
      </div>
    </div>
  );
}

export default function PrescriptionsPage() {
  const {
    medicationPlans,
    verifyDoseWithAI,
    updateDoseStatus,
  } = useApp();
  const { toast } = useToast();
  const [activeDose, setActiveDose] = useState<TimelineDose | null>(null);

  const timeline = useMemo(() => flattenTimeline(medicationPlans), [medicationPlans]);
  const adherence = useMemo(() => getPlanAdherence(medicationPlans), [medicationPlans]);
  const refillAlerts = medicationPlans.flatMap((plan) => plan.refillAlerts);

  const handleVerify = async (verified: boolean) => {
    if (!activeDose) return;

    await verifyDoseWithAI({
      planId: activeDose.planId,
      medicineId: activeDose.medicineId,
      doseId: activeDose._id,
      pillDetected: verified,
      gestureDetected: verified,
      confidence: verified ? 0.92 : 0.38,
    });

    toast({
      title: verified ? 'Dose verified' : 'Verification incomplete',
      description: verified
        ? 'AI marked the medicine as taken and updated adherence logs.'
        : 'Reminder escalation will continue until the dose is verified.',
    });
    setActiveDose(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 lg:pb-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">NFC Next Level</p>
            <h1 className="font-display text-3xl lg:text-4xl text-foreground">Medication Adherence</h1>
            <p className="text-muted-foreground mt-1">
              Prescription schedules are created from the Add Medical Record flow, then tracked here with reminder escalation, verification, and refill prediction.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <HeartPulse size={20} className="text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Adherence</p>
            <p className="text-2xl font-semibold text-foreground">{adherence.rate}%</p>
            <Progress value={adherence.rate} className="mt-3" />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <CheckCircle2 size={20} className="text-emerald-600 mb-3" />
            <p className="text-sm text-muted-foreground">Taken</p>
            <p className="text-2xl font-semibold text-foreground">{adherence.taken}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <Clock size={20} className="text-amber-600 mb-3" />
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-semibold text-foreground">{adherence.pending}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <Bell size={20} className="text-red-600 mb-3" />
            <p className="text-sm text-muted-foreground">Refill Alerts</p>
            <p className="text-2xl font-semibold text-foreground">{refillAlerts.length}</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
          <section className="rounded-lg border border-border bg-card p-4 lg:p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display text-xl text-foreground">Medicine Timeline</h2>
                <p className="text-sm text-muted-foreground">Daily tracking with reminder escalation levels.</p>
              </div>
              <AlarmClock className="text-primary" size={22} />
            </div>

            <div className="space-y-3">
              {timeline.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <FileImage className="mx-auto text-muted-foreground" size={32} />
                  <p className="mt-3 font-medium text-foreground">No AI medication schedule yet</p>
                  <p className="text-sm text-muted-foreground">Upload a prescription PDF, JPG, JPEG, or PNG to generate the todo timeline.</p>
                </div>
              )}

              {timeline.slice(0, 24).map((dose) => (
                <div
                  key={`${dose.planId}-${dose._id}`}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={cn('mt-1 h-3 w-3 rounded-full border', getDoseTone(dose.status))} />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{dose.medicineName}</p>
                      <p className="text-sm text-muted-foreground">
                        {dose.dosage} • {formatDateTime(dose.scheduledAt)} • {dose.timingLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full border px-2.5 py-1 text-xs font-medium capitalize', getDoseTone(dose.status))}>
                      {dose.status}
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                      Level {dose.reminderLevel || 1}
                    </span>
                    {dose.status === 'pending' && (
                      <>
                        <Button variant="secondary" size="sm" onClick={() => setActiveDose(dose)}>
                          <Camera size={15} />
                          Verify
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateDoseStatus({
                              planId: dose.planId,
                              medicineId: dose.medicineId,
                              doseId: dose._id,
                              status: 'missed',
                            })
                          }
                        >
                          Missed
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-lg border border-border bg-card p-4 lg:p-5">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="text-primary" size={20} />
                <h2 className="font-display text-xl text-foreground">Agentic AI Workflow</h2>
              </div>
              <div className="space-y-3">
                {['OCR processing agent', 'Medicine scheduling agent', 'Reminder management agent', 'Adherence monitoring agent', 'AI assistant agent'].map((agent, index) => (
                  <div key={agent} className="flex items-center gap-3 rounded-md bg-secondary/60 p-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-foreground">{agent}</span>
                  </div>
                ))}
              </div>
            </section>

            {medicationPlans[0]?.sourceFileUrl && (
              <section className="rounded-lg border border-border bg-card p-4 lg:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl text-foreground">Uploaded Prescription</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Original file stored in Cloudinary and used for OCR.
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a href={medicationPlans[0].sourceFileUrl} target="_blank" rel="noreferrer">
                      <ExternalLink size={16} />
                      Open File
                    </a>
                  </Button>
                </div>
                <p className="mt-3 text-sm text-muted-foreground truncate">
                  {medicationPlans[0].sourceFileName || medicationPlans[0].sourceFileUrl}
                </p>
              </section>
            )}

            {medicationPlans[0]?.medicines.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-xl text-foreground">Current Medicines</h2>
                {medicationPlans[0].medicines.map((medicine) => (
                  <MedicineCard key={medicine._id} medicine={medicine} />
                ))}
              </section>
            )}
          </aside>
        </div>
      </div>

      {activeDose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl text-foreground">AI Intake Verification</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Camera-based pill detection for {activeDose.medicineName}.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setActiveDose(null)}>
                <XCircle size={20} />
              </Button>
            </div>

            <div className="mt-4">
              <PillDetector
                medicineId={activeDose.medicineId}
                scheduledTime={activeDose.scheduledAt}
                onIntakeConfirmed={() => {
                  void handleVerify(true);
                }}
                onCancel={() => setActiveDose(null)}
              />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
