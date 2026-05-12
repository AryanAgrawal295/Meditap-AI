import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlarmClock,
  Bell,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  FileImage,
  HeartPulse,
  Pill,
  RefreshCcw,
  ShieldCheck,
  Upload,
  Plus,
  XCircle,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { format, startOfDay, isSameDay } from "date-fns";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import {
  MedicationDose,
  MedicationMedicine,
  MedicationPlan,
} from "@/types/patient";
import { cn } from "@/lib/utils";
import PillDetector from "@/components/PillDetector";

type TimelineDose = MedicationDose & {
  planId: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  prescriptionIndex?: number;
  prescriptionTag?: string;
};

type DayGroup = {
  date: Date;
  dateString: string;
  doses: TimelineDose[];
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDoseTone(status: MedicationDose["status"]) {
  if (status === "taken")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "missed") return "bg-red-50 text-red-700 border-red-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
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
          prescriptionIndex: medicine.prescriptionIndex,
          prescriptionTag: medicine.prescriptionTag,
        })),
      ),
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
}

function groupDosesByDay(doses: TimelineDose[]): DayGroup[] {
  const grouped: Map<string, TimelineDose[]> = new Map();

  doses.forEach((dose) => {
    const doseDate = new Date(dose.scheduledAt);
    const dayStart = startOfDay(doseDate);
    const dateString = format(dayStart, "yyyy-MM-dd");

    if (!grouped.has(dateString)) {
      grouped.set(dateString, []);
    }
    grouped.get(dateString)!.push(dose);
  });

  return Array.from(grouped.entries())
    .map(([dateString, doses]) => ({
      date: new Date(dateString),
      dateString,
      doses,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

function getPlanAdherence(plans: MedicationPlan[]) {
  const totals = plans.reduce(
    (acc, plan) => {
      acc.taken += plan.adherence.taken;
      acc.missed += plan.adherence.missed;
      acc.pending += plan.adherence.pending;
      return acc;
    },
    { taken: 0, missed: 0, pending: 0 },
  );
  const total = totals.taken + totals.missed + totals.pending;
  return {
    ...totals,
    total,
    rate: total ? Math.round((totals.taken / total) * 100) : 0,
  };
}

function getUpcomingDoses(plans: MedicationPlan[]): TimelineDose[] {
  const allDoses = plans
    .flatMap((plan) =>
      plan.medicines.flatMap((medicine) =>
        medicine.doses
          .filter((dose) => dose.status === "pending")
          .slice(0, 5)
          .map((dose) => ({
            ...dose,
            planId: plan.id,
            medicineId: medicine._id,
            medicineName: medicine.name,
            dosage: medicine.dosage,
            prescriptionIndex: medicine.prescriptionIndex,
            prescriptionTag: medicine.prescriptionTag,
          })),
      ),
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    )
    .slice(0, 5);
  return allDoses;
}

function MedicineCard({ medicine }: { medicine: MedicationMedicine }) {
  const completed = medicine.doses.filter(
    (dose) => dose.status === "taken",
  ).length;
  const refillDate = medicine.refillReminderAt
    ? formatDateTime(medicine.refillReminderAt)
    : "Not predicted";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium text-foreground truncate">
            {medicine.name}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {medicine.dosage} • {medicine.frequency} • {medicine.duration}
          </p>
        </div>
        <Pill className="text-primary shrink-0" size={20} />
      </div>
      <span className="mt-3 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
        {medicine.prescriptionTag ||
          `Prescription ${medicine.prescriptionIndex || 1}`}
      </span>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Timing</p>
          <p className="font-medium text-foreground capitalize">
            {medicine.timing.join(", ")}
          </p>
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
        <p className="text-muted-foreground mt-1">
          Reminder around {refillDate}
        </p>
      </div>
    </div>
  );
}

function DayCard({
  dayGroup,
  onDoseClick,
  onMissedClick,
}: {
  dayGroup: DayGroup;
  onDoseClick: (dose: TimelineDose) => void;
  onMissedClick: (dose: TimelineDose) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const takenCount = dayGroup.doses.filter((d) => d.status === "taken").length;
  const missedCount = dayGroup.doses.filter(
    (d) => d.status === "missed",
  ).length;
  const pendingCount = dayGroup.doses.filter(
    (d) => d.status === "pending",
  ).length;

  const dateDisplay = format(dayGroup.date, "EEEE, MMM d");
  const isToday = isSameDay(dayGroup.date, new Date());

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          <CalendarDays size={18} className="text-primary shrink-0" />
          <div>
            <p className="font-semibold text-foreground flex items-center gap-2">
              {dateDisplay}
              {isToday && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  Today
                </span>
              )}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {takenCount} taken • {pendingCount} pending • {missedCount} missed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
              {takenCount}
            </span>
            <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700">
              {pendingCount}
            </span>
            <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">
              {missedCount}
            </span>
          </div>
          <ChevronDown
            size={18}
            className={cn(
              "text-muted-foreground shrink-0 transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border bg-background/50 animate-accordion-down">
          <div className="p-4 space-y-2">
            {dayGroup.doses.map((dose) => (
              <div
                key={`${dose.planId}-${dose._id}`}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span
                    className={cn(
                      "mt-1 h-3 w-3 rounded-full border shrink-0",
                      getDoseTone(dose.status),
                    )}
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {dose.medicineName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {dose.dosage} at{" "}
                      {format(new Date(dose.scheduledAt), "hh:mm a")}
                    </p>
                    <span className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {dose.prescriptionTag ||
                        `Prescription ${dose.prescriptionIndex || 1}`}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
                      getDoseTone(dose.status),
                    )}
                  >
                    {dose.status}
                  </span>
                  {dose.status === "pending" && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onDoseClick(dose)}
                      >
                        <Camera size={14} />
                        Verify
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onMissedClick(dose)}
                      >
                        Missed
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PrescriptionsPage() {
  const {
    medicationPlans,
    uploadPrescriptionForSchedule,
    verifyDoseWithAI,
    updateDoseStatus,
  } = useApp();
  const { toast } = useToast();
  const [activeDose, setActiveDose] = useState<TimelineDose | null>(null);
  const [isUploadingPrescription, setIsUploadingPrescription] = useState(false);
  const [activeScheduleId, setActiveScheduleId] = useState<string>("");
  const [showMedicinesDrawer, setShowMedicinesDrawer] = useState(false);
  const prescriptionInputRef = useRef<HTMLInputElement>(null);

  const activePlan = useMemo(
    () => medicationPlans.find((plan) => plan.id === activeScheduleId) || null,
    [activeScheduleId, medicationPlans],
  );
  const visiblePlans = useMemo(
    () =>
      [...medicationPlans].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [medicationPlans],
  );
  const timeline = useMemo(
    () => flattenTimeline(activePlan ? [activePlan] : []),
    [activePlan],
  );
  const dayGroups = useMemo(() => groupDosesByDay(timeline), [timeline]);
  const adherence = useMemo(
    () => getPlanAdherence(activePlan ? [activePlan] : []),
    [activePlan],
  );
  const upcomingDoses = useMemo(
    () => getUpcomingDoses(medicationPlans),
    [medicationPlans],
  );
  const refillAlerts = activePlan?.refillAlerts || [];
  const prescriptionFiles = activePlan?.prescriptionFiles?.length
    ? activePlan.prescriptionFiles
    : activePlan?.sourceFileUrl
      ? [
          {
            index: 1,
            tag: "Prescription 1",
            fileUrl: activePlan.sourceFileUrl,
            fileName: activePlan.sourceFileName,
            uploadedAt: activePlan.createdAt,
          },
        ]
      : [];

  useEffect(() => {
    if (activeScheduleId === "") {
      setActiveScheduleId(medicationPlans[0]?.id || "new");
      return;
    }

    if (activeScheduleId === "new") return;
    if (!medicationPlans.some((plan) => plan.id === activeScheduleId)) {
      setActiveScheduleId(medicationPlans[0]?.id || "new");
    }
  }, [activeScheduleId, medicationPlans]);

  const handlePrescriptionUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPrescription(true);
      const plan = await uploadPrescriptionForSchedule(file, activePlan?.id);
      setActiveScheduleId(plan.id);
      toast({
        title: activePlan ? "Prescription added" : "Schedule created",
        description: activePlan
          ? "Medicines were added to this schedule with the next prescription tag."
          : "AI created a new medication schedule and adherence timeline.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not upload the prescription.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPrescription(false);
      event.target.value = "";
    }
  };

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
      title: verified ? "Dose verified" : "Verification incomplete",
      description: verified
        ? "AI marked the medicine as taken and updated adherence logs."
        : "Reminder escalation will continue until the dose is verified.",
    });
    setActiveDose(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 lg:pb-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">NFC Next Level</p>
            <h1 className="font-display text-3xl lg:text-4xl text-foreground">
              Medication Adherence
            </h1>
            <p className="text-muted-foreground mt-1">
              Open previous schedules, start a new one, or add another
              prescription to the active schedule.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveScheduleId("new")}
            >
              <Plus size={16} />
              New Schedule
            </Button>
            <Button
              type="button"
              variant="medical"
              onClick={() => prescriptionInputRef.current?.click()}
              disabled={isUploadingPrescription}
            >
              {isUploadingPrescription ? (
                <RefreshCcw size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              {isUploadingPrescription
                ? "Uploading..."
                : activePlan
                  ? "Add Prescription"
                  : "Upload Prescription"}
            </Button>
            <input
              ref={prescriptionInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="hidden"
              onChange={handlePrescriptionUpload}
            />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[20rem_1fr]">
          <aside className="space-y-4">
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl text-foreground">
                    Schedules
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Old and new medicine plans.
                  </p>
                </div>
                <CalendarDays className="text-primary" size={20} />
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setActiveScheduleId("new")}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-left transition-all flex items-center gap-2',
                    activeScheduleId === 'new'
                      ? 'border-primary bg-primary text-primary-foreground shadow-medical'
                      : 'border-dashed border-border bg-background text-foreground hover:bg-secondary/60'
                  )}
                >
                  <Plus size={14} />
                  <span className="text-sm font-medium">New Schedule</span>
                </button>

                {visiblePlans.map((plan, index) => {
                  const isActive = activeScheduleId === plan.id;
                  const fileCount =
                    plan.prescriptionFiles?.length ||
                    (plan.sourceFileUrl ? 1 : 0);
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setActiveScheduleId(plan.id)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-3 text-left transition-all",
                        isActive
                          ? "border-primary bg-primary text-primary-foreground shadow-medical"
                          : "border-border bg-background text-foreground hover:bg-secondary/60",
                      )}
                    >
                      <p className="font-medium truncate">
                        Schedule {visiblePlans.length - index}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-xs",
                          isActive
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground",
                        )}
                      >
                        {new Date(plan.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-xs",
                          isActive
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground",
                        )}
                      >
                        {plan.medicines.length} medicines • {fileCount || 1}{" "}
                        prescription{(fileCount || 1) === 1 ? "" : "s"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          </aside>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <HeartPulse size={20} className="text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Adherence</p>
                <p className="text-2xl font-semibold text-foreground">
                  {adherence.rate}%
                </p>
                <Progress value={adherence.rate} className="mt-3" />
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <CheckCircle2 size={20} className="text-emerald-600 mb-3" />
                <p className="text-sm text-muted-foreground">Taken</p>
                <p className="text-2xl font-semibold text-foreground">
                  {adherence.taken}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <Clock size={20} className="text-amber-600 mb-3" />
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-semibold text-foreground">
                  {adherence.pending}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <Bell size={20} className="text-red-600 mb-3" />
                <p className="text-sm text-muted-foreground">Refill Alerts</p>
                <p className="text-2xl font-semibold text-foreground">
                  {refillAlerts.length}
                </p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
              <section className="rounded-lg border border-border bg-card p-4 lg:p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="font-display text-xl text-foreground">
                      {activePlan ? "Medicine Timeline" : "Start New Schedule"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {activePlan
                        ? "Daily tracking organized by date."
                        : "Upload a prescription to create the first medicine timeline."}
                    </p>
                  </div>
                  <AlarmClock className="text-primary" size={22} />
                </div>

                <div className="space-y-3">
                  {timeline.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-8 text-center">
                      <FileImage
                        className="mx-auto text-muted-foreground"
                        size={32}
                      />
                      <p className="mt-3 font-medium text-foreground">
                        {activePlan
                          ? "No medicines in this schedule yet"
                          : "No schedule selected"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Upload a prescription PDF, JPG, JPEG, or PNG to generate
                        the todo timeline.
                      </p>
                      <Button
                        type="button"
                        variant="medical"
                        className="mt-4"
                        onClick={() => prescriptionInputRef.current?.click()}
                        disabled={isUploadingPrescription}
                      >
                        {isUploadingPrescription ? (
                          <RefreshCcw size={16} className="animate-spin" />
                        ) : (
                          <Upload size={16} />
                        )}
                        {isUploadingPrescription
                          ? "Uploading..."
                          : "Upload Prescription"}
                      </Button>
                    </div>
                  )}

                  {dayGroups.map((dayGroup) => (
                    <DayCard
                      key={dayGroup.dateString}
                      dayGroup={dayGroup}
                      onDoseClick={setActiveDose}
                      onMissedClick={(dose) =>
                        updateDoseStatus({
                          planId: dose.planId,
                          medicineId: dose.medicineId,
                          doseId: dose._id,
                          status: "missed",
                        })
                      }
                    />
                  ))}
                </div>
              </section>

              <aside className="space-y-6">
                {/* Next Medicines to Take */}
                <section className="rounded-lg border border-border bg-card p-4 lg:p-5">
                  <div className="mb-4">
                    <h2 className="font-display text-lg text-foreground">
                      Next to Take
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Across all schedules
                    </p>
                  </div>
                  <div className="space-y-2">
                    {upcomingDoses.length > 0 ? (
                      upcomingDoses.map((dose) => (
                        <div
                          key={`upcoming-${dose.planId}-${dose._id}`}
                          className="rounded-lg border border-border bg-background p-3 hover:bg-secondary/30 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm text-foreground truncate">
                                {dose.medicineName}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {dose.dosage} •{" "}
                                {format(new Date(dose.scheduledAt), "hh:mm a")}
                              </p>
                              <span className="mt-1.5 inline-flex rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                                {dose.prescriptionTag ||
                                  `Rx ${dose.prescriptionIndex || 1}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        <Pill
                          size={20}
                          className="mx-auto mb-2 text-muted-foreground/50"
                        />
                        No pending medicines
                      </div>
                    )}
                  </div>
                </section>

                {prescriptionFiles.length > 0 && (
                  <section className="rounded-lg border border-border bg-card p-4 lg:p-5">
                    <div>
                      <h2 className="font-display text-xl text-foreground">
                        Uploaded Prescriptions
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Files used by OCR for this schedule.
                      </p>
                    </div>
                    <div className="mt-4 space-y-3">
                      {prescriptionFiles.map((file) => (
                        <div
                          key={`${file.tag}-${file.fileName}`}
                          className="rounded-lg border border-border bg-background p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-foreground">
                                {file.tag}
                              </p>
                              <p className="mt-1 truncate text-sm text-muted-foreground">
                                {file.fileName || file.fileUrl}
                              </p>
                            </div>
                            {file.fileUrl && (
                              <Button asChild variant="outline" size="sm">
                                <a
                                  href={file.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <ExternalLink size={16} />
                                  Open
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Medicines Drawer/Panel */}
                <section className="rounded-lg border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => setShowMedicinesDrawer(!showMedicinesDrawer)}
                    className="w-full px-4 py-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Pill size={18} className="text-primary" />
                      <div className="text-left">
                        <p className="font-semibold text-foreground">
                          Medicines
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activePlan?.medicines.length || 0} active
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      size={18}
                      className={cn(
                        "text-muted-foreground transition-transform duration-200",
                        showMedicinesDrawer && "rotate-180",
                      )}
                    />
                  </button>

                  {showMedicinesDrawer && (
                    <div className="border-t border-border bg-background/50 animate-accordion-down">
                      <div className="p-4 space-y-3">
                        {activePlan && activePlan.medicines.length > 0 ? (
                          activePlan.medicines.map((medicine) => (
                            <MedicineCard
                              key={medicine._id}
                              medicine={medicine}
                            />
                          ))
                        ) : (
                          <div className="text-center py-6">
                            <Pill
                              className="mx-auto text-muted-foreground mb-2"
                              size={28}
                            />
                            <p className="text-sm text-muted-foreground">
                              No medicines in schedule
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                {activePlan && (
                  <section className="rounded-lg border border-dashed border-border bg-card p-4 lg:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="font-display text-sm font-semibold text-foreground">
                          Add Prescription
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">
                          to this schedule
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => prescriptionInputRef.current?.click()}
                        disabled={isUploadingPrescription}
                      >
                        {isUploadingPrescription ? (
                          <RefreshCcw size={14} className="animate-spin" />
                        ) : (
                          <Upload size={14} />
                        )}
                      </Button>
                    </div>
                  </section>
                )}
              </aside>
            </div>
          </div>
        </div>
      </div>

      {activeDose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl text-foreground">
                  AI Intake Verification
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Camera-based pill detection for {activeDose.medicineName}.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveDose(null)}
              >
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
