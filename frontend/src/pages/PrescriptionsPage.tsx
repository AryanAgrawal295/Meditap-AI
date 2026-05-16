import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
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
  Upload,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Trash2,
} from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
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
  Prescription,
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
  scheduleLabel?: string;
  prescriptionIndex?: number;
  prescriptionTag?: string;
};

type MedicineWithSchedule = MedicationMedicine & {
  planId: string;
  scheduleLabel: string;
};

type PrescriptionFileWithSchedule = NonNullable<
  MedicationPlan["prescriptionFiles"]
>[number] & {
  planId: string;
  scheduleLabel: string;
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

function getDoseEventTone(status: MedicationDose["status"]) {
  if (status === "taken") {
    return "bg-emerald-600 text-white hover:bg-emerald-700";
  }

  if (status === "missed") {
    return "bg-red-600 text-white hover:bg-red-700";
  }

  return "bg-amber-500 text-white hover:bg-amber-600";
}

function getScheduleLabel(plan: MedicationPlan, plans: MedicationPlan[]) {
  const sortedPlans = [...plans].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const index = sortedPlans.findIndex((item) => item.id === plan.id);

  return `Schedule ${sortedPlans.length - index}`;
}

function flattenTimeline(plans: MedicationPlan[], allPlans: MedicationPlan[] = plans) {
  return plans
    .flatMap((plan) =>
      plan.medicines.flatMap((medicine) =>
        medicine.doses.slice(0, 10).map((dose) => ({
          ...dose,
          planId: plan.id,
          medicineId: medicine._id,
          medicineName: medicine.name,
          dosage: medicine.dosage,
          scheduleLabel: getScheduleLabel(plan, allPlans),
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

function getMonthDays(monthDate: Date) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
}

function getDayCounts(doses: TimelineDose[]) {
  return {
    taken: doses.filter((dose) => dose.status === "taken").length,
    pending: doses.filter((dose) => dose.status === "pending").length,
    missed: doses.filter((dose) => dose.status === "missed").length,
  };
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

function MedicineCard({
  medicine,
  onEditName,
  isOpen,
  onToggle,
  canEdit = true,
}: {
  medicine: MedicationMedicine & { scheduleLabel?: string };
  onEditName: (medicine: MedicineWithSchedule) => void;
  isOpen: boolean;
  onToggle: () => void;
  canEdit?: boolean;
}) {
  const completed = medicine.doses.filter(
    (dose) => dose.status === "taken",
  ).length;
  const refillDate = medicine.refillReminderAt
    ? formatDateTime(medicine.refillReminderAt)
    : "Not predicted";

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 p-4 text-left transition-colors hover:bg-secondary/40"
      >
        <div className="min-w-0">
          <h3 className="font-medium text-foreground truncate">
            {medicine.name}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {medicine.dosage} • {medicine.frequency} • {medicine.duration}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Pill className="text-primary" size={20} />
          <ChevronDown
            size={18}
            className={cn(
              "text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              {medicine.prescriptionTag ||
                `Prescription ${medicine.prescriptionIndex || 1}`}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8"
              onClick={() => onEditName(medicine)}
              disabled={!canEdit}
              title="Edit medicine"
            >
              <Edit3 size={16} />
            </Button>
          </div>
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
      )}
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
  defaultOpen = false,
  showScheduleLabel = false,
  updatingDoseId,
}: {
  dayGroup: DayGroup;
  onDoseClick: (dose: TimelineDose) => void;
  onEditTime: (dose: TimelineDose) => void;
  onMarkMissed: (dose: TimelineDose) => void;
  onMarkTaken: (dose: TimelineDose) => void;
  isPaused: boolean;
  defaultOpen?: boolean;
  showScheduleLabel?: boolean;
  updatingDoseId: string | null;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const takenCount = dayGroup.doses.filter((d) => d.status === "taken").length;
  const missedCount = dayGroup.doses.filter(
    (d) => d.status === "missed",
  ).length;
  const pendingCount = dayGroup.doses.filter(
    (d) => d.status === "pending",
  ).length;

  const dateDisplay = format(dayGroup.date, "EEEE, MMM d");
  const isToday = isSameDay(dayGroup.date, new Date());

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen, dayGroup.dateString]);

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
                        {showScheduleLabel && dose.scheduleLabel && (
                          <span className="ml-2 mt-1 inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                            {dose.scheduleLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className="flex min-w-0 flex-wrap items-center gap-2 lg:max-w-[18rem] lg:justify-end"
                      data-helpman="dose-actions"
                    >
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
                          getDoseTone(dose.status),
                        )}
                      >
                        {dose.status}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={isPaused || isUpdatingDose}
                            data-helpman="dose-actions"
                          >
                            {isUpdatingDose ? (
                              <RefreshCcw size={14} className="animate-spin" />
                            ) : (
                              <MoreVertical size={16} />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => onDoseClick(dose)}
                            data-helpman="verify-dose"
                          >
                            <Camera size={14} className="mr-2" />
                            Verify
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => onMarkTaken(dose)}
                            data-helpman="done-dose"
                          >
                            <Check size={14} className="mr-2" />
                            Done
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => onMarkMissed(dose)}
                            data-helpman="missed-dose"
                          >
                            <XCircle size={14} className="mr-2" />
                            Missed
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => onEditTime(dose)}
                            data-helpman="reschedule-dose"
                          >
                            <Clock size={14} className="mr-2" />
                            Reschedule
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

function DoseMenu({
  dose,
  trigger,
  onDoseClick,
  onEditTime,
  onMarkMissed,
  onMarkTaken,
  updatingDoseId,
}: {
  dose: TimelineDose;
  trigger: ReactNode;
  onDoseClick: (dose: TimelineDose) => void;
  onEditTime: (dose: TimelineDose) => void;
  onMarkMissed: (dose: TimelineDose) => void;
  onMarkTaken: (dose: TimelineDose) => void;
  updatingDoseId: string | null;
}) {
  const doseKey = `${dose.planId}-${dose.medicineId}-${dose._id}`;
  const isUpdatingDose = updatingDoseId === doseKey;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isUpdatingDose}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => onDoseClick(dose)}>
          <Camera size={14} className="mr-2" />
          Verify
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onMarkTaken(dose)}>
          <Check size={14} className="mr-2" />
          Done
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onMarkMissed(dose)}>
          <XCircle size={14} className="mr-2" />
          Missed
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onEditTime(dose)}>
          <Clock size={14} className="mr-2" />
          Reschedule
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CalendarSchedule({
  dayGroups,
  monthDate,
  onMonthChange,
  onDoseClick,
  onEditTime,
  onMarkMissed,
  onMarkTaken,
  updatingDoseId,
}: {
  dayGroups: DayGroup[];
  monthDate: Date;
  onMonthChange: (date: Date) => void;
  onDoseClick: (dose: TimelineDose) => void;
  onEditTime: (dose: TimelineDose) => void;
  onMarkMissed: (dose: TimelineDose) => void;
  onMarkTaken: (dose: TimelineDose) => void;
  updatingDoseId: string | null;
}) {
  const [selectedDay, setSelectedDay] = useState<DayGroup | null>(null);
  const days = useMemo(() => getMonthDays(monthDate), [monthDate]);
  const groupsByDate = useMemo(
    () => new Map(dayGroups.map((group) => [group.dateString, group])),
    [dayGroups],
  );
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-display text-xl text-foreground sm:text-2xl">
            {format(monthDate, "MMMM yyyy")}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => onMonthChange(subMonths(monthDate, 1))}
              title="Previous month"
            >
              <ChevronLeft size={18} />
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-full px-3"
              onClick={() => onMonthChange(new Date())}
            >
              Today
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => onMonthChange(addMonths(monthDate, 1))}
              title="Next month"
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>

        <div className="min-w-[44rem] overflow-x-auto">
          <div className="grid grid-cols-7 border-b border-border bg-secondary/30">
            {weekDays.map((day) => (
              <div
                key={day}
                className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dateString = format(startOfDay(day), "yyyy-MM-dd");
              const dayGroup = groupsByDate.get(dateString);
              const doses = dayGroup?.doses || [];
              const visibleDoses = doses.slice(0, 3);
              const hiddenDoseCount = Math.max(0, doses.length - visibleDoses.length);
              const counts = getDayCounts(doses);
              const isCurrentMonth = isSameMonth(day, monthDate);
              const isCurrentDay = isSameDay(day, new Date());

              return (
                <div
                  key={dateString}
                  className={cn(
                    "min-h-[7rem] border-b border-r border-border p-1.5",
                    !isCurrentMonth && "bg-secondary/20 text-muted-foreground",
                    isCurrentDay && "bg-primary/5",
                  )}
                >
                  <div className="mb-1.5 flex items-start justify-between gap-1.5">
                    <div
                      className={cn(
                        "flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                        isCurrentDay
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground",
                        !isCurrentMonth && !isCurrentDay && "text-muted-foreground",
                      )}
                    >
                      {format(day, isCurrentMonth && day.getDate() === 1 ? "MMM d" : "d")}
                    </div>
                    {doses.length > 0 && (
                      <div className="flex shrink-0 items-center gap-0.5 text-[0.6rem] font-medium">
                        {counts.taken > 0 && (
                          <span className="rounded-full bg-emerald-100 px-1 py-0.5 text-emerald-700">
                            {counts.taken}
                          </span>
                        )}
                        {counts.pending > 0 && (
                          <span className="rounded-full bg-amber-100 px-1 py-0.5 text-amber-700">
                            {counts.pending}
                          </span>
                        )}
                        {counts.missed > 0 && (
                          <span className="rounded-full bg-red-100 px-1 py-0.5 text-red-700">
                            {counts.missed}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {visibleDoses.map((dose) => (
                      <DoseMenu
                        key={`${dose.planId}-${dose._id}`}
                        dose={dose}
                        onDoseClick={onDoseClick}
                        onEditTime={onEditTime}
                        onMarkMissed={onMarkMissed}
                        onMarkTaken={onMarkTaken}
                        updatingDoseId={updatingDoseId}
                        trigger={
                          <button
                            type="button"
                            className={cn(
                              "flex h-5 w-full items-center gap-1 rounded px-1.5 text-left text-[0.68rem] font-medium transition-colors",
                              getDoseEventTone(dose.status),
                            )}
                            title={`${dose.medicineName} at ${format(new Date(dose.scheduledAt), "hh:mm a")}`}
                          >
                            <Pill size={10} className="shrink-0" />
                            <span className="truncate">{dose.medicineName}</span>
                          </button>
                        }
                      />
                    ))}
                    {hiddenDoseCount > 0 && dayGroup && (
                      <button
                        type="button"
                        className="px-1 text-[0.68rem] font-medium text-muted-foreground hover:text-foreground"
                        onClick={() => setSelectedDay(dayGroup)}
                      >
                        +{hiddenDoseCount} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Dialog open={Boolean(selectedDay)} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedDay ? format(selectedDay.date, "EEEE, MMM d") : "Doses"}
            </DialogTitle>
            <DialogDescription>
              {selectedDay
                ? `${selectedDay.doses.length} scheduled medicine dose${selectedDay.doses.length === 1 ? "" : "s"}`
                : "Scheduled medicine doses"}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {selectedDay?.doses.map((dose) => (
              <div
                key={`${dose.planId}-${dose._id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{dose.medicineName}</p>
                  <p className="text-sm text-muted-foreground">
                    {dose.dosage} at {format(new Date(dose.scheduledAt), "hh:mm a")}
                  </p>
                  <span className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {dose.prescriptionTag || `Prescription ${dose.prescriptionIndex || 1}`}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
                      getDoseTone(dose.status),
                    )}
                  >
                    {dose.status}
                  </span>
                  <DoseMenu
                    dose={dose}
                    onDoseClick={onDoseClick}
                    onEditTime={onEditTime}
                    onMarkMissed={onMarkMissed}
                    onMarkTaken={onMarkTaken}
                    updatingDoseId={updatingDoseId}
                    trigger={
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8">
                        <MoreVertical size={16} />
                      </Button>
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function PrescriptionsPage() {
  const {
    medicationPlans,
    prescriptions,
    uploadPrescriptionForSchedule,
    addPrescriptionFromRecordToSchedule,
    deletePrescriptionFromSchedule,
    verifyDoseWithAI,
    updateDoseStatus,
    updateDoseSchedule,
    updateMedicine,
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
  const [editingMedicine, setEditingMedicine] = useState<MedicineWithSchedule | null>(null);
  const [medicineNameValue, setMedicineNameValue] = useState("");
  const [isUpdatingMedicine, setIsUpdatingMedicine] = useState(false);
  const [isUploadingPrescription, setIsUploadingPrescription] = useState(false);
  const [updatingDoseId, setUpdatingDoseId] = useState<string | null>(null);
  const [openMedicineId, setOpenMedicineId] = useState<string | null>(null);
  const [showPrescriptionFiles, setShowPrescriptionFiles] = useState(false);
  const [isDetailsSidebarMinimized, setIsDetailsSidebarMinimized] = useState(false);

  useEffect(() => {
    const alarmDose = (location.state as { alarmVerificationDose?: TimelineDose } | null)
      ?.alarmVerificationDose;

    if (!alarmDose) return;

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

  const timelinePlans = useMemo(
    () =>
      [...medicationPlans].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [medicationPlans],
  );
  const primaryPlan = timelinePlans[0] || null;
  const timeline = useMemo(
    () => flattenTimeline(timelinePlans, medicationPlans),
    [timelinePlans, medicationPlans],
  );
  const dayGroups = useMemo(() => groupDosesByDay(timeline), [timeline]);
  const adherence = useMemo(
    () => getPlanAdherence(timelinePlans),
    [timelinePlans],
  );
  const refillAlerts = timelinePlans.flatMap((plan) => plan.refillAlerts || []);
  const visibleMedicines = useMemo<MedicineWithSchedule[]>(
    () =>
      timelinePlans.flatMap((plan) =>
        plan.medicines.map((medicine) => ({
          ...medicine,
          planId: plan.id,
          scheduleLabel: getScheduleLabel(plan, medicationPlans),
        })),
      ),
    [timelinePlans, medicationPlans],
  );
  const prescriptionFiles = useMemo<PrescriptionFileWithSchedule[]>(
    () =>
      timelinePlans.flatMap((plan) => {
        const scheduleLabel = getScheduleLabel(plan, medicationPlans);
        const activePrescriptionIndexes = new Set(
          plan.medicines.map((medicine) => Number(medicine.prescriptionIndex) || 1),
        );
        const savedFiles = (plan.prescriptionFiles || []).filter((file) =>
          activePrescriptionIndexes.has(Number(file.index) || 1),
        );
        const files = savedFiles.length
          ? savedFiles
          : plan.sourceFileUrl && activePrescriptionIndexes.has(1)
            ? [
                {
                  index: 1,
                  tag: "Prescription 1",
                  fileUrl: plan.sourceFileUrl,
                  fileName: plan.sourceFileName,
                  uploadedAt: plan.createdAt,
                },
              ]
            : [];

        return files.map((file) => ({
          ...file,
          planId: plan.id,
          scheduleLabel,
        }));
      }),
    [timelinePlans, medicationPlans],
  );
  const uploadButtonLabel = prescriptionFiles.length === 0 ? "Upload Prescription" : "Add Prescription";

  const handlePrescriptionUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPrescription(true);
      await uploadPrescriptionForSchedule(file, primaryPlan?.id);
      toast({
        title: "Prescription added",
        description:
          "Medicines were added to the merged adherence schedule.",
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

  const handleAddPrescriptionFromRecord = async () => {
    const selectedPrescription = prescriptions.find(
      (prescription) => prescription.id === selectedPrescriptionId,
    );

    if (!selectedPrescription) return;

    try {
      setIsAddingFromRecord(true);
      await addPrescriptionFromRecordToSchedule(selectedPrescription, primaryPlan?.id);
      toast({
        title: "Prescription added",
        description: "Medicines from the selected medical record were added to the schedule.",
      });
      setSelectedPrescriptionId("");
      setIsRecordPickerOpen(false);
    } catch (error) {
      toast({
        title: "Could not add prescription",
        description:
          error instanceof Error
            ? error.message
            : "The selected prescription could not be added.",
        variant: "destructive",
      });
    } finally {
      setIsAddingFromRecord(false);
    }
  };

  const handleDeletePrescription = async (file: PrescriptionFileWithSchedule) => {
    const confirmed = window.confirm(
      `Delete ${file.tag}? Its medicines and doses will be removed from this schedule.`,
    );

    if (!confirmed) return;

    const deleteKey = `${file.planId}-${file.index}`;

    try {
      setDeletingPrescriptionKey(deleteKey);
      await deletePrescriptionFromSchedule({
        planId: file.planId,
        prescriptionIndex: file.index,
      });
      toast({
        title: "Prescription deleted",
        description: `${file.tag} and its medicines were removed from the schedule.`,
      });
    } catch (error) {
      toast({
        title: "Could not delete prescription",
        description:
          error instanceof Error
            ? error.message
            : "The prescription could not be removed.",
        variant: "destructive",
      });
    } finally {
      setDeletingPrescriptionKey(null);
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

  const openMedicineEditor = (medicine: MedicineWithSchedule) => {
    setEditingMedicine(medicine);
    setMedicineNameValue(medicine.name);
  };

  const handleMedicineSave = async () => {
    if (!editingMedicine || !medicineNameValue.trim()) return;

    try {
      setIsUpdatingMedicine(true);
      await updateMedicine({
        planId: editingMedicine.planId,
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
              Review the single adherence schedule created from all selected
              prescriptions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRecordPickerOpen(true)}
            >
              <Plus size={16} />
              Add from Records
            </Button>
            <Button
              type="button"
              variant="medical"
              onClick={() => navigate("/add-medical-record")}
            >
              {isUploadingPrescription ? (
                <RefreshCcw size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              {isUploadingPrescription
                ? "Uploading..."
                : uploadButtonLabel}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
            <div className="flex items-start gap-2" data-helpman="adherence-summary">
              <div className="grid flex-1 gap-4 md:grid-cols-4">
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
            </div>

            <div
              className={cn(
                "grid gap-6",
                isDetailsSidebarMinimized ? "xl:grid-cols-[1fr_4.5rem]" : "xl:grid-cols-[1fr_22rem]",
              )}
            >
              <section className="rounded-lg border border-border bg-card p-4 lg:p-5" data-helpman="adherence-timeline">
                <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-display text-xl text-foreground">
                      Adherence Schedule
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      All selected prescriptions are combined into this single
                      dose timeline.
                    </p>
                  </div>
                  {timeline.length === 0 && (
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
                        No schedule created yet
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Add prescriptions to generate the adherence timeline.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
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
                          : uploadButtonLabel}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4 sm:ml-2"
                        onClick={() => setIsRecordPickerOpen(true)}
                      >
                        <Plus size={16} />
                        Add from Records
                      </Button>
                    </div>
                  )}

                  {timeline.length > 0 && (
                    <CalendarSchedule
                      dayGroups={dayGroups}
                      monthDate={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      onDoseClick={(dose) => {
                        setIsAlarmVerification(false);
                        setActiveDose(dose);
                      }}
                      onEditTime={openScheduleEditor}
                      onMarkMissed={(dose) => void handleDoseStatusUpdate(dose, "missed")}
                      onMarkTaken={(dose) => void handleDoseStatusUpdate(dose, "taken")}
                      updatingDoseId={updatingDoseId}
                    />
                  )}
                </div>
              </section>

              <aside className="space-y-6">
                <section className="flex justify-end rounded-lg border border-border bg-card p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsDetailsSidebarMinimized((value) => !value)}
                    title={isDetailsSidebarMinimized ? "Expand details" : "Minimize details"}
                  >
                    {isDetailsSidebarMinimized ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
                  </Button>
                </section>
                {!isDetailsSidebarMinimized && (
                <>
                {prescriptionFiles.length > 0 && (
                  <section className="rounded-lg border border-border bg-card overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowPrescriptionFiles((value) => !value)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-secondary/50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <FileImage size={18} className="text-primary" />
                        <div className="min-w-0">
                          <h2 className="font-semibold text-foreground">
                            Uploaded Prescriptions
                          </h2>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {prescriptionFiles.length} file{prescriptionFiles.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        size={18}
                        className={cn(
                          "text-muted-foreground transition-transform duration-200",
                          showPrescriptionFiles && "rotate-180",
                        )}
                      />
                    </button>

                    {showPrescriptionFiles && (
                      <div className="border-t border-border bg-background/50 p-4 space-y-3">
                        {prescriptionFiles.map((file) => (
                          <div
                            key={`${file.scheduleLabel}-${file.tag}-${file.fileName || file.fileUrl}`}
                            className="rounded-lg border border-border bg-card p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium text-foreground">
                                    {file.tag}
                                  </p>
                                </div>
                                <p className="mt-1 truncate text-sm text-muted-foreground">
                                  {file.fileName || file.fileUrl}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                {file.fileUrl && (
                                  <Button asChild variant="outline" size="icon" className="h-8 w-8">
                                    <a
                                      href={file.fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      title="Open prescription"
                                    >
                                      <ExternalLink size={16} />
                                    </a>
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  title="Delete prescription"
                                  onClick={() => void handleDeletePrescription(file)}
                                  disabled={deletingPrescriptionKey === `${file.planId}-${file.index}`}
                                >
                                  {deletingPrescriptionKey === `${file.planId}-${file.index}` ? (
                                    <RefreshCcw size={16} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={16} />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* Medicines Panel */}
                <section className="rounded-lg border border-border bg-card overflow-hidden" data-helpman="medicine-list">
                  <div className="w-full px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Pill size={18} className="text-primary" />
                      <div className="text-left">
                        <p className="font-semibold text-foreground">
                          Medicines
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {visibleMedicines.length} active
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border bg-background/50">
                    <div className="p-4 space-y-3">
                      {visibleMedicines.length > 0 ? (
                        visibleMedicines.map((medicine) => {
                          const medicineKey = `${medicine.planId}-${medicine._id}`;

                          return (
                          <MedicineCard
                            key={medicineKey}
                            medicine={medicine}
                            onEditName={openMedicineEditor}
                            isOpen={openMedicineId === medicineKey}
                            onToggle={() =>
                              setOpenMedicineId((current) =>
                                current === medicineKey ? null : medicineKey,
                              )
                            }
                            canEdit
                          />
                          );
                        })
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
                </section>

                </>
                )}
              </aside>
            </div>
        </div>
      </div>

      <Dialog open={isRecordPickerOpen} onOpenChange={setIsRecordPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Prescription from Medical Records</DialogTitle>
            <DialogDescription>
              Select a saved prescription. Its medicines will be added to the active adherence schedule.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[24rem] space-y-3 overflow-y-auto pr-1">
            {prescriptions.length > 0 ? (
              prescriptions.map((prescription: Prescription) => {
                const isSelected = selectedPrescriptionId === prescription.id;

                return (
                  <button
                    key={prescription.id}
                    type="button"
                    onClick={() => setSelectedPrescriptionId(prescription.id)}
                    className={cn(
                      "w-full rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/60",
                      isSelected ? "border-primary ring-2 ring-primary/20" : "border-border",
                    )}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          {prescription.doctor}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(prescription.date), "MMM d, yyyy")}
                        </p>
                      </div>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                        {prescription.medicines.length} medicine{prescription.medicines.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-foreground">
                      {prescription.medicines.map((medicine) => medicine.name).join(", ")}
                    </p>
                    {prescription.notes && (
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                        {prescription.notes}
                      </p>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <FileImage className="mx-auto text-muted-foreground" size={28} />
                <p className="mt-3 font-medium text-foreground">
                  No saved prescriptions found
                </p>
                <p className="text-sm text-muted-foreground">
                  Add a medical record with prescription medicines first.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRecordPickerOpen(false)}
              disabled={isAddingFromRecord}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="medical"
              onClick={() => void handleAddPrescriptionFromRecord()}
              disabled={!selectedPrescriptionId || isAddingFromRecord}
            >
              {isAddingFromRecord ? (
                <RefreshCcw size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              {isAddingFromRecord ? "Adding..." : "Add Prescription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
