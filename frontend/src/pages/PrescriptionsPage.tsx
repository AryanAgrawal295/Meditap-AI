import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlarmClock,
  Bell,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  HeartPulse,
  Pill,
  RefreshCcw,
  ShieldCheck,
  XCircle,
  ExternalLink,
  ChevronDown,
  MoreVertical,
  Pause,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Trash2,
} from "lucide-react";
import { format, startOfDay, isSameDay } from "date-fns";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import { useSearchHighlight } from "@/hooks/useSearchHighlight";
import {
  MedicationDose,
  MedicationMedicine,
  MedicationPlan,
} from "@/types/patient";
import { cn } from "@/lib/utils";
import PillDetector from "@/components/PillDetector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

function getTimeInputValue(value: string) {
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function mergeDateWithTime(value: string, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const nextDate = new Date(value);
  nextDate.setHours(hours, minutes, 0, 0);

  return nextDate.toISOString();
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

function MedicineCard({
  medicine,
  onEditName,
}: {
  medicine: MedicationMedicine;
  onEditName: (medicine: MedicationMedicine) => void;
}) {
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
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => onEditName(medicine)}>
            <Edit3 size={16} />
          </Button>
          <Pill className="text-primary" size={20} />
        </div>
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
  onEditTime,
  onMarkMissed,
  onMarkTaken,
  isPaused,
  updatingDoseId,
}: {
  dayGroup: DayGroup;
  onDoseClick: (dose: TimelineDose) => void;
  onEditTime: (dose: TimelineDose) => void;
  onMarkMissed: (dose: TimelineDose) => void;
  onMarkTaken: (dose: TimelineDose) => void;
  isPaused: boolean;
  updatingDoseId: string | null;
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
            {dayGroup.doses.map((dose) => {
              const doseKey = `${dose.planId}-${dose.medicineId}-${dose._id}`;
              const isUpdatingDose = updatingDoseId === doseKey;

              return (
                  <div
                    key={`${dose.planId}-${dose._id}`}
                    className="grid gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-secondary/30 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start"
                  >
                    <div className="flex min-w-0 items-start gap-3">
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
                    <div className="flex min-w-0 flex-wrap items-center gap-2 lg:max-w-[18rem] lg:justify-end">
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
                            disabled={isPaused || isUpdatingDose}
                          >
                            <Camera size={14} />
                            Verify
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white"
                            onClick={() => onMarkTaken(dose)}
                            disabled={isPaused || isUpdatingDose}
                          >
                            {isUpdatingDose ? (
                              <RefreshCcw size={14} className="animate-spin" />
                            ) : (
                              <Check size={14} />
                            )}
                            Done
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-600 text-red-700 hover:bg-red-600 hover:text-white"
                            onClick={() => onMarkMissed(dose)}
                            disabled={isPaused || isUpdatingDose}
                          >
                            <XCircle size={14} />
                            Missed
                          </Button>
                        </>
                      )}
	                      {["pending", "missed"].includes(dose.status) && (
	                        <Button
	                          variant="outline"
	                          size="sm"
	                          onClick={() => onEditTime(dose)}
	                          disabled={isPaused || isUpdatingDose}
	                        >
	                          <Clock size={14} />
	                          Reschedule
	                        </Button>
	                      )}
                      {isPaused && dose.status === "pending" && (
                        <span className="text-xs font-medium text-muted-foreground">
                          Paused
                        </span>
                      )}
                    </div>
                  </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PrescriptionsPage() {
  const {
    medicationPlans,
    verifyDoseWithAI,
    updateDoseStatus,
    updateDoseSchedule,
    updateMedicine,
    updateMedicationPlanStatus,
    deleteMedicationPlan,
  } = useApp();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { isHighlighting } = useSearchHighlight();
  const [activeDose, setActiveDose] = useState<TimelineDose | null>(null);
  const [isAlarmVerification, setIsAlarmVerification] = useState(false);
  const [editingDose, setEditingDose] = useState<TimelineDose | null>(null);
  const [scheduleTimeValue, setScheduleTimeValue] = useState("");
  const [isUpdatingSchedule, setIsUpdatingSchedule] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<MedicationMedicine | null>(null);
  const [medicineNameValue, setMedicineNameValue] = useState("");
  const [isUpdatingMedicine, setIsUpdatingMedicine] = useState(false);
  const [isChangingPlanStatus, setIsChangingPlanStatus] = useState(false);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);
  const [updatingDoseId, setUpdatingDoseId] = useState<string | null>(null);
  const [activeScheduleId, setActiveScheduleId] = useState<string>("");
  const [showMedicinesDrawer, setShowMedicinesDrawer] = useState(false);
  const [isSchedulesSidebarMinimized, setIsSchedulesSidebarMinimized] = useState(false);
  const [isDetailsSidebarMinimized, setIsDetailsSidebarMinimized] = useState(false);

  useEffect(() => {
    const alarmDose = (location.state as { alarmVerificationDose?: TimelineDose } | null)
      ?.alarmVerificationDose;

    if (!alarmDose) return;

    setActiveScheduleId(alarmDose.planId);
    setActiveDose(alarmDose);
    setIsAlarmVerification(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!isAlarmVerification || !activeDose) return;

    window.history.pushState({ medicineAlarmLocked: true }, "", window.location.href);

    const keepVerificationOpen = () => {
      navigate("/prescriptions", {
        replace: true,
        state: {
          alarmVerificationDose: activeDose,
        },
      });
    };

    window.addEventListener("popstate", keepVerificationOpen);

    return () => {
      window.removeEventListener("popstate", keepVerificationOpen);
    };
  }, [activeDose, isAlarmVerification, navigate]);

  const activePlan = useMemo(
    () => medicationPlans.find((plan) => plan.id === activeScheduleId) || null,
    [activeScheduleId, medicationPlans],
  );
  const isActivePlanPaused = activePlan?.status === "paused";
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
      setActiveScheduleId(medicationPlans[0]?.id || "");
      return;
    }

    if (!medicationPlans.some((plan) => plan.id === activeScheduleId)) {
      setActiveScheduleId(medicationPlans[0]?.id || "");
    }
  }, [activeScheduleId, medicationPlans]);

  const handleToggleScheduleStatus = async (plan: MedicationPlan | null = activePlan) => {
    if (!plan) return;

    const nextStatus = plan.status === "paused" ? "active" : "paused";

    try {
      setIsChangingPlanStatus(true);
      await updateMedicationPlanStatus({
        planId: plan.id,
        status: nextStatus,
      });
      toast({
        title: nextStatus === "active" ? "Schedule started" : "Schedule paused",
        description:
          nextStatus === "active"
            ? "Dose tracking is available again."
            : "Dose tracking is paused until you start this schedule.",
      });
    } catch (error) {
      toast({
        title: "Could not update schedule",
        description:
          error instanceof Error
            ? error.message
            : "The schedule status could not be changed.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPlanStatus(false);
    }
  };

  const handleDeleteSchedule = async (plan: MedicationPlan | null = activePlan) => {
    if (!plan) return;

    const shouldDelete = window.confirm(
      "Delete this medication schedule? This cannot be undone.",
    );

    if (!shouldDelete) return;

    try {
      setIsDeletingPlan(true);
      const deletedPlanId = plan.id;
      const nextPlan = visiblePlans.find((plan) => plan.id !== deletedPlanId);
      await deleteMedicationPlan(deletedPlanId);
      setActiveScheduleId(nextPlan?.id || "new");
      toast({
        title: "Schedule deleted",
        description: "The medication schedule was removed.",
      });
    } catch (error) {
      toast({
        title: "Could not delete schedule",
        description:
          error instanceof Error
            ? error.message
            : "The medication schedule could not be deleted.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingPlan(false);
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
    setIsAlarmVerification(false);
  };

  const handleDoseStatusUpdate = async (
    dose: TimelineDose,
    status: "taken" | "missed",
  ) => {
    const doseKey = `${dose.planId}-${dose.medicineId}-${dose._id}`;

    try {
      setUpdatingDoseId(doseKey);
      await updateDoseStatus({
        planId: dose.planId,
        medicineId: dose.medicineId,
        doseId: dose._id,
        status,
      });
      toast({
        title: status === "taken" ? "Dose marked done" : "Dose marked missed",
        description:
          status === "taken"
            ? `${dose.medicineName} is now marked as taken.`
            : `${dose.medicineName} is now marked as missed.`,
      });
    } catch (error) {
      toast({
        title: "Could not update dose",
        description:
          error instanceof Error
            ? error.message
            : "The dose status could not be updated.",
        variant: "destructive",
      });
    } finally {
      setUpdatingDoseId(null);
    }
  };

  const openScheduleEditor = (dose: TimelineDose) => {
    setEditingDose(dose);
    setScheduleTimeValue(getTimeInputValue(dose.scheduledAt));
  };

  const handleScheduleSave = async () => {
    if (!editingDose || !scheduleTimeValue) return;

    try {
      setIsUpdatingSchedule(true);
      await updateDoseSchedule({
        planId: editingDose.planId,
        medicineId: editingDose.medicineId,
        doseId: editingDose._id,
        scheduledAt: mergeDateWithTime(editingDose.scheduledAt, scheduleTimeValue),
      });
      toast({
        title: "Dose time updated",
        description: `${editingDose.medicineName} is now pending at ${scheduleTimeValue}.`,
      });
      setEditingDose(null);
      setScheduleTimeValue("");
    } catch (error) {
      toast({
        title: "Could not update time",
        description:
          error instanceof Error
            ? error.message
            : "The medicine schedule could not be updated.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingSchedule(false);
    }
  };

  const openMedicineEditor = (medicine: MedicationMedicine) => {
    setEditingMedicine(medicine);
    setMedicineNameValue(medicine.name);
  };

  const handleMedicineSave = async () => {
    if (!activePlan || !editingMedicine || !medicineNameValue.trim()) return;

    try {
      setIsUpdatingMedicine(true);
      await updateMedicine({
        planId: activePlan.id,
        medicineId: editingMedicine._id,
        name: medicineNameValue.trim(),
      });
      toast({
        title: "Medicine name updated",
        description: `${editingMedicine.name} was renamed to ${medicineNameValue.trim()}.`,
      });
      setEditingMedicine(null);
      setMedicineNameValue("");
    } catch (error) {
      toast({
        title: "Could not update medicine",
        description:
          error instanceof Error
            ? error.message
            : "The medicine name could not be updated.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingMedicine(false);
    }
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
              Review schedules created automatically from scanned
              prescriptions in Add Medical Record.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="medical"
              onClick={() => navigate("/add-medical-record")}
            >
              Add Medical Record
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "grid gap-6",
            isSchedulesSidebarMinimized ? "xl:grid-cols-[4.5rem_1fr]" : "xl:grid-cols-[20rem_1fr]",
          )}
        >
          <aside className="space-y-4">
            <section className="rounded-lg border border-border bg-card p-4">
              <div className={cn("mb-4 flex items-center justify-between gap-3", isSchedulesSidebarMinimized && "justify-center")}>
                {!isSchedulesSidebarMinimized && (
                <div>
                  <h2 className="font-display text-xl text-foreground">
                    Schedules
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Old and new medicine plans.
                  </p>
                </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSchedulesSidebarMinimized((value) => !value)}
                  title={isSchedulesSidebarMinimized ? "Expand schedules" : "Minimize schedules"}
                >
                  {isSchedulesSidebarMinimized ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </Button>
              </div>

              <div className="space-y-2">
                {visiblePlans.map((plan, index) => {
                  const isActive = activeScheduleId === plan.id;
                  const fileCount =
                    plan.prescriptionFiles?.length ||
                    (plan.sourceFileUrl ? 1 : 0);
                  return (
	                    <div
	                      key={plan.id}
	                      className={cn(
	                        "w-full rounded-lg border px-3 py-3 transition-all",
                          isSchedulesSidebarMinimized && "px-2 py-2",
	                        isActive
	                          ? "border-primary bg-primary text-primary-foreground shadow-medical"
	                          : "border-border bg-background text-foreground hover:bg-secondary/60",
	                      )}
	                    >
	                      <div className={cn("flex items-start gap-2", isSchedulesSidebarMinimized && "justify-center")}>
	                        <button
	                          type="button"
	                          onClick={() => setActiveScheduleId(plan.id)}
	                          className={cn("min-w-0 flex-1 text-left", isSchedulesSidebarMinimized && "flex-none text-center")}
                            title={isSchedulesSidebarMinimized ? `Schedule ${visiblePlans.length - index}` : undefined}
	                        >
                            {isSchedulesSidebarMinimized ? (
                              <CalendarDays size={18} className="mx-auto" />
                            ) : (
	                            <p className="font-medium truncate">
	                              Schedule {visiblePlans.length - index}
	                            </p>
                            )}
                            {!isSchedulesSidebarMinimized && (
                            <>
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
                          <span
                            className={cn(
                              "mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                              plan.status === "paused"
                                ? isActive
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-amber-100 text-amber-700"
                                : isActive
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-emerald-100 text-emerald-700",
                            )}
	                          >
	                            {plan.status || "active"}
	                          </span>
                            </>
                            )}
	                        </button>
	                        {!isSchedulesSidebarMinimized && (
                          <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-8 w-8 shrink-0",
                                isActive
                                  ? "text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
                                  : "text-muted-foreground",
                              )}
                            >
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => void handleToggleScheduleStatus(plan)}
                              disabled={isChangingPlanStatus || isDeletingPlan}
                            >
                              {isChangingPlanStatus && activeScheduleId === plan.id ? (
                                <RefreshCcw size={14} className="mr-2 animate-spin" />
                              ) : plan.status === "paused" ? (
                                <Play size={14} className="mr-2" />
                              ) : (
                                <Pause size={14} className="mr-2" />
                              )}
                              {plan.status === "paused" ? "Start schedule" : "Pause schedule"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => void handleDeleteSchedule(plan)}
                              disabled={isChangingPlanStatus || isDeletingPlan}
                            >
                              {isDeletingPlan && activeScheduleId === plan.id ? (
                                <RefreshCcw size={14} className="mr-2 animate-spin" />
                              ) : (
                                <Trash2 size={14} className="mr-2" />
                              )}
                              Delete schedule
                            </DropdownMenuItem>
                          </DropdownMenuContent>
	                        </DropdownMenu>
                          )}
	                      </div>
	                    </div>
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

            <div
              className={cn(
                "grid gap-6",
                isDetailsSidebarMinimized ? "xl:grid-cols-[1fr_4.5rem]" : "xl:grid-cols-[1fr_22rem]",
              )}
            >
              <section className="rounded-lg border border-border bg-card p-4 lg:p-5">
                <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-display text-xl text-foreground">
                      {activePlan ? "Medicine Timeline" : "No Adherence Schedule Yet"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {activePlan
                        ? isActivePlanPaused
                          ? "This schedule is paused. Start it to continue dose tracking."
                          : "Daily tracking organized by date."
                        : "Scan the prescription in Add Medical Record. Medicines and dose timings will appear here automatically."}
                    </p>
                  </div>
                  {!activePlan && (
                    <AlarmClock className="text-primary" size={22} />
                  )}
                </div>

                <div className="space-y-3">
                  {timeline.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-8 text-center">
                      <AlarmClock
                        className="mx-auto text-muted-foreground"
                        size={32}
                      />
                      <p className="mt-3 font-medium text-foreground">
                        {activePlan
                          ? "No medicines in this schedule yet"
                          : "No schedule available"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activePlan
                          ? "This schedule exists but does not contain medicines yet."
                          : "Create a medical record from a scanned prescription to build the adherence timeline."}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4"
                        onClick={() => navigate("/add-medical-record")}
                      >
                        Add Medical Record
                      </Button>
                    </div>
                  )}

                  {dayGroups.map((dayGroup) => (
                    <DayCard
                      key={dayGroup.dateString}
                      dayGroup={dayGroup}
                      onDoseClick={(dose) => {
                        setIsAlarmVerification(false);
                        setActiveDose(dose);
                      }}
                      onEditTime={openScheduleEditor}
                      onMarkMissed={(dose) => void handleDoseStatusUpdate(dose, "missed")}
                      onMarkTaken={(dose) => void handleDoseStatusUpdate(dose, "taken")}
                      isPaused={isActivePlanPaused}
                      updatingDoseId={updatingDoseId}
                    />
                  ))}
                </div>
              </section>

              <aside className="space-y-6">
                <section className="rounded-lg border border-border bg-card p-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="w-full"
                    onClick={() => setIsDetailsSidebarMinimized((value) => !value)}
                    title={isDetailsSidebarMinimized ? "Expand details" : "Minimize details"}
                  >
                    {isDetailsSidebarMinimized ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
                  </Button>
                </section>
                {!isDetailsSidebarMinimized && (
                <>
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
                              onEditName={openMedicineEditor}
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
                </>
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
              {!isAlarmVerification && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setActiveDose(null)}
                >
                  <XCircle size={20} />
                </Button>
              )}
            </div>

            <div className="mt-4">
              <PillDetector
                medicineId={activeDose.medicineId}
                scheduledTime={activeDose.scheduledAt}
                autoStart
                onIntakeConfirmed={() => {
                  void handleVerify(true);
                }}
                onCancel={isAlarmVerification ? undefined : () => setActiveDose(null)}
              />
            </div>
          </div>
        </div>
      )}

      <Dialog open={Boolean(editingDose)} onOpenChange={(open) => !open && setEditingDose(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Intake Time</DialogTitle>
            <DialogDescription>
              Choose a new time for this medicine dose. The calendar day stays the same.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-secondary/40 p-3">
              <p className="font-medium text-foreground">{editingDose?.medicineName}</p>
              <p className="text-sm text-muted-foreground">
                {editingDose?.dosage}
                {editingDose ? ` • ${format(new Date(editingDose.scheduledAt), "EEEE, MMM d")}` : ""}
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="dose-time" className="text-sm font-medium text-foreground">
                Intake time
              </label>
              <Input
                id="dose-time"
                type="time"
                value={scheduleTimeValue}
                onChange={(event) => setScheduleTimeValue(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDose(null)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleSave} disabled={isUpdatingSchedule || !scheduleTimeValue}>
              {isUpdatingSchedule ? "Saving..." : "Save Time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingMedicine)} onOpenChange={(open) => !open && setEditingMedicine(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Medicine Name</DialogTitle>
            <DialogDescription>
              Rename this medicine across the active schedule and reminders.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label htmlFor="medicine-name" className="text-sm font-medium text-foreground">
              Medicine name
            </label>
            <Input
              id="medicine-name"
              value={medicineNameValue}
              onChange={(event) => setMedicineNameValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleMedicineSave();
                }
              }}
              placeholder="Enter medicine name"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMedicine(null)}>
              Cancel
            </Button>
            <Button onClick={handleMedicineSave} disabled={isUpdatingMedicine || !medicineNameValue.trim()}>
              {isUpdatingMedicine ? "Saving..." : "Save Name"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
