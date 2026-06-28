import { useMemo, useRef, useState } from 'react';
import {
  AlarmClock,
  Bell,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileImage,
  HeartPulse,
  MoreVertical,
  Pill,
  RefreshCcw,
  Upload,
  XCircle,
} from 'lucide-react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { MedicationDose, MedicationMedicine, MedicationPlan } from '@/types/patient';
import { cn } from '@/lib/utils';
import PillDetector from '@/components/PillDetector';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type TimelineDose = MedicationDose & {
  planId: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  prescriptionIndex?: number;
  prescriptionTag?: string;
};

type MedicineWithSchedule = MedicationMedicine & {
  planId: string;
};

type PrescriptionFileWithSchedule = NonNullable<MedicationPlan['prescriptionFiles']>[number] & {
  scheduleLabel: string;
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

function getScheduleLabel(plan: MedicationPlan, plans: MedicationPlan[]) {
  const sortedPlans = [...plans].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const index = sortedPlans.findIndex((item) => item.id === plan.id);

  return `Schedule ${sortedPlans.length - index}`;
}

function flattenTimeline(plans: MedicationPlan[]) {
  return plans
    .flatMap((plan) =>
      plan.medicines.flatMap((medicine) =>
        medicine.doses.map((dose) => ({
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
    { taken: 0, missed: 0, pending: 0 },
  );
  const total = totals.taken + totals.missed + totals.pending;
  return {
    ...totals,
    total,
    rate: total ? Math.round((totals.taken / total) * 100) : 0,
  };
}

function MedicineCard({ medicine }: { medicine: MedicineWithSchedule }) {
  const completed = medicine.doses.filter((dose) => dose.status === 'taken').length;
  const refillDate = medicine.refillReminderAt ? formatDateTime(medicine.refillReminderAt) : 'Not predicted';

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium text-foreground">{medicine.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {medicine.dosage} • {medicine.frequency} • {medicine.duration}
          </p>
        </div>
        <Pill className="shrink-0 text-primary" size={20} />
      </div>
      <span className="mt-3 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
        {medicine.prescriptionTag || `Prescription ${medicine.prescriptionIndex || 1}`}
      </span>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Timing</p>
          <p className="font-medium capitalize text-foreground">{medicine.timing.join(', ')}</p>
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
        <p className="mt-1 text-muted-foreground">Reminder around {refillDate}</p>
      </div>
    </div>
  );
}

function CalendarSchedule({
  doses,
  onDoseClick,
  onMarkMissed,
  onMarkTaken,
  updatingDoseId,
}: {
  doses: TimelineDose[];
  onDoseClick: (dose: TimelineDose) => void;
  onMarkMissed: (dose: TimelineDose) => void;
  onMarkTaken: (dose: TimelineDose) => void;
  updatingDoseId: string | null;
}) {
  const firstDoseDate = doses[0]?.scheduledAt ? new Date(doses[0].scheduledAt) : new Date();
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(firstDoseDate));
  const [selectedDay, setSelectedDay] = useState<{ date: Date; doses: TimelineDose[] } | null>(null);
  const today = new Date();
  const calendarDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(visibleMonth)),
        end: endOfWeek(endOfMonth(visibleMonth)),
      }),
    [visibleMonth],
  );
  const dosesByDate = useMemo(() => {
    const grouped = new Map<string, TimelineDose[]>();

    doses.forEach((dose) => {
      const dateKey = format(new Date(dose.scheduledAt), 'yyyy-MM-dd');
      grouped.set(dateKey, [...(grouped.get(dateKey) || []), dose]);
    });

    grouped.forEach((dayDoses, dateKey) => {
      grouped.set(
        dateKey,
        dayDoses.sort(
          (left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime(),
        ),
      );
    });

    return grouped;
  }, [doses]);

  const renderDoseActions = (dose: TimelineDose, size: 'compact' | 'default' = 'default') => {
    const doseKey = `${dose.planId}-${dose.medicineId}-${dose._id}`;
    const isUpdatingDose = updatingDoseId === doseKey;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant={size === 'compact' ? 'ghost' : 'outline'}
            size="icon"
            className={cn(
              'shrink-0 rounded-full',
              size === 'compact' ? 'h-6 w-6' : 'h-10 w-10 border-primary text-primary',
            )}
            disabled={isUpdatingDose}
            data-helpman="dose-actions"
          >
            {isUpdatingDose ? (
              <RefreshCcw size={size === 'compact' ? 12 : 16} className="animate-spin" />
            ) : (
              <MoreVertical size={size === 'compact' ? 14 : 18} />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onDoseClick(dose)} data-helpman="verify-dose">
            <Camera size={14} className="mr-2" />
            Verify
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onMarkTaken(dose)} data-helpman="done-dose">
            <Check size={14} className="mr-2" />
            Done
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onMarkMissed(dose)} data-helpman="missed-dose">
            <XCircle size={14} className="mr-2" />
            Missed
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-display text-2xl text-foreground">{format(visibleMonth, 'MMMM yyyy')}</h3>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => setVisibleMonth((month) => subMonths(month, 1))}
              title="Previous month"
            >
              <ChevronLeft size={18} />
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full px-5 text-primary"
              onClick={() => setVisibleMonth(startOfMonth(today))}
            >
              Today
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
              title="Next month"
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="grid min-w-[48rem] grid-cols-7 border-b border-border bg-secondary/30 text-center text-sm font-medium text-muted-foreground">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => (
              <div key={weekday} className="px-3 py-3">
                {weekday}
              </div>
            ))}
          </div>
          <div className="grid min-w-[48rem] grid-cols-7">
            {calendarDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayDoses = dosesByDate.get(dateKey) || [];
              const isCurrentMonth = isSameMonth(day, visibleMonth);
              const isToday = isSameDay(day, today);
              const takenCount = dayDoses.filter((dose) => dose.status === 'taken').length;
              const remainingCount = dayDoses.length - takenCount;

              return (
                <div
                  key={dateKey}
                  className={cn(
                    'relative h-28 border-b border-r border-border p-2 transition-colors',
                    !isCurrentMonth && 'text-muted-foreground/70',
                    isToday && 'bg-primary/10',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-7 w-fit min-w-7 items-center justify-center whitespace-nowrap rounded-full px-1.5 text-sm font-semibold',
                      isToday && 'bg-primary text-primary-foreground',
                    )}
                  >
                    {format(day, isCurrentMonth && day.getDate() === 1 ? 'MMM d' : 'd')}
                  </div>

                  {dayDoses.length > 0 && (
                    <div className="absolute right-2 top-2 flex items-center gap-1">
                      {takenCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-100 px-1 text-xs font-bold text-emerald-700">
                          {takenCount}
                        </span>
                      )}
                      {remainingCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1 text-xs font-bold text-amber-700">
                          {remainingCount}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="absolute inset-x-2 bottom-1.5 space-y-0.5">
                    {dayDoses.slice(0, 3).map((dose) => {
                      const doseKey = `${dose.planId}-${dose.medicineId}-${dose._id}`;
                      const isUpdatingDose = updatingDoseId === doseKey;
                      const isTaken = dose.status === 'taken';

                      return (
                        <button
                          key={doseKey}
                          type="button"
                          onClick={() => onDoseClick(dose)}
                          className={cn(
                            'flex h-[18px] w-full items-center gap-1 rounded px-1.5 text-left text-[10px] font-semibold leading-none text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                            isTaken ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600',
                          )}
                          disabled={isUpdatingDose}
                        >
                          <Pill size={11} className="shrink-0" />
                          <span className="truncate">{dose.medicineName}</span>
                        </button>
                      );
                    })}
                    {dayDoses.length > 3 && (
                      <button
                        type="button"
                        className="block text-[11px] font-semibold leading-3 text-muted-foreground transition-colors hover:text-primary"
                        onClick={() => setSelectedDay({ date: day, doses: dayDoses })}
                      >
                        +{dayDoses.length - 3} more
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
        <DialogContent className="max-h-[82vh] max-w-3xl overflow-hidden p-0">
          <DialogHeader className="px-6 pb-2 pt-6">
            <DialogTitle className="font-display text-2xl">
              {selectedDay ? format(selectedDay.date, 'EEEE, MMM d') : 'Day schedule'}
            </DialogTitle>
            <DialogDescription>
              {selectedDay?.doses.length || 0} scheduled medicine dose
              {(selectedDay?.doses.length || 0) === 1 ? '' : 's'}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto px-6 pb-6 pt-3">
            {selectedDay?.doses.map((dose) => (
              <div key={`${dose.planId}-${dose.medicineId}-${dose._id}`} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-4">
                  <button type="button" onClick={() => onDoseClick(dose)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-lg font-semibold text-foreground">{dose.medicineName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {dose.dosage} at {format(new Date(dose.scheduledAt), 'hh:mm a')}
                    </p>
                    <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {dose.prescriptionTag || `Prescription ${dose.prescriptionIndex || 1}`}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={cn('rounded-full border px-3 py-1 text-sm font-semibold capitalize', getDoseTone(dose.status))}>
                      {dose.status}
                    </span>
                    {renderDoseActions(dose)}
                  </div>
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
  const { medicationPlans, uploadPrescriptionForSchedule, verifyDoseWithAI, updateDoseStatus } = useApp();
  const { toast } = useToast();
  const [activeDose, setActiveDose] = useState<TimelineDose | null>(null);
  const [isUploadingPrescription, setIsUploadingPrescription] = useState(false);
  const [updatingDoseId, setUpdatingDoseId] = useState<string | null>(null);
  const [showPrescriptionFiles, setShowPrescriptionFiles] = useState(false);
  const prescriptionInputRef = useRef<HTMLInputElement>(null);

  const timelinePlans = useMemo(
    () => [...medicationPlans].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [medicationPlans],
  );
  const primaryPlan = timelinePlans[0] || null;
  const timeline = useMemo(() => flattenTimeline(timelinePlans), [timelinePlans]);
  const adherence = useMemo(() => getPlanAdherence(timelinePlans), [timelinePlans]);
  const refillAlerts = timelinePlans.flatMap((plan) => plan.refillAlerts || []);
  const visibleMedicines = useMemo<MedicineWithSchedule[]>(
    () => timelinePlans.flatMap((plan) => plan.medicines.map((medicine) => ({ ...medicine, planId: plan.id }))),
    [timelinePlans],
  );
  const prescriptionFiles = useMemo<PrescriptionFileWithSchedule[]>(
    () =>
      timelinePlans.flatMap((plan) => {
        const scheduleLabel = getScheduleLabel(plan, medicationPlans);
        const files = plan.prescriptionFiles?.length
          ? plan.prescriptionFiles
          : plan.sourceFileUrl
            ? [
                {
                  index: 1,
                  tag: 'Prescription 1',
                  fileUrl: plan.sourceFileUrl,
                  fileName: plan.sourceFileName,
                  uploadedAt: plan.createdAt,
                },
              ]
            : [];

        return files.map((file) => ({
          ...file,
          scheduleLabel,
        }));
      }),
    [timelinePlans, medicationPlans],
  );

  const handlePrescriptionUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPrescription(true);
      await uploadPrescriptionForSchedule(file, primaryPlan?.id);
      toast({
        title: 'Prescription added',
        description: 'Medicines were added to the merged adherence schedule.',
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Could not upload the prescription.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingPrescription(false);
      event.target.value = '';
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
      title: verified ? 'Dose verified' : 'Verification incomplete',
      description: verified
        ? 'AI marked the medicine as taken and updated adherence logs.'
        : 'Reminder escalation will continue until the dose is verified.',
    });
    setActiveDose(null);
  };

  const handleDoseStatusUpdate = async (dose: TimelineDose, status: 'taken' | 'missed') => {
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
        title: status === 'taken' ? 'Dose marked done' : 'Dose marked missed',
        description:
          status === 'taken'
            ? `${dose.medicineName} is now marked as taken.`
            : `${dose.medicineName} is now marked as missed.`,
      });
    } catch (error) {
      toast({
        title: 'Could not update dose',
        description: error instanceof Error ? error.message : 'The dose status could not be updated.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingDoseId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 lg:pb-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">NFC Next Level</p>
            <h1 className="font-display text-3xl text-foreground lg:text-4xl">Medication Adherence</h1>
            <p className="mt-1 text-muted-foreground">
              Review the single adherence schedule created from all selected prescriptions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="medical"
              onClick={() => prescriptionInputRef.current?.click()}
              disabled={isUploadingPrescription}
            >
              {isUploadingPrescription ? <RefreshCcw size={16} className="animate-spin" /> : <Upload size={16} />}
              {isUploadingPrescription ? 'Uploading...' : 'Add Prescription'}
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

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4" data-helpman="adherence-summary">
            <div className="rounded-lg border border-border bg-card p-4">
              <HeartPulse size={20} className="mb-3 text-primary" />
              <p className="text-sm text-muted-foreground">Adherence</p>
              <p className="text-2xl font-semibold text-foreground">{adherence.rate}%</p>
              <Progress value={adherence.rate} className="mt-3" />
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <CheckCircle2 size={20} className="mb-3 text-emerald-600" />
              <p className="text-sm text-muted-foreground">Taken</p>
              <p className="text-2xl font-semibold text-foreground">{adherence.taken}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <Clock size={20} className="mb-3 text-amber-600" />
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-semibold text-foreground">{adherence.pending}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <Bell size={20} className="mb-3 text-red-600" />
              <p className="text-sm text-muted-foreground">Refill Alerts</p>
              <p className="text-2xl font-semibold text-foreground">{refillAlerts.length}</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
            <section className="rounded-lg border border-border bg-card p-4 lg:p-5" data-helpman="adherence-timeline">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-xl text-foreground">Adherence Schedule</h2>
                  <p className="text-sm text-muted-foreground">
                    All selected prescriptions are combined into this single dose timeline.
                  </p>
                </div>
                {timeline.length === 0 && <AlarmClock className="text-primary" size={22} />}
              </div>

              <div className="space-y-3">
                {timeline.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <FileImage className="mx-auto text-muted-foreground" size={32} />
                    <p className="mt-3 font-medium text-foreground">No schedule created yet</p>
                    <p className="text-sm text-muted-foreground">
                      Add prescriptions to generate the adherence timeline.
                    </p>
                    <Button
                      type="button"
                      variant="medical"
                      className="mt-4"
                      onClick={() => prescriptionInputRef.current?.click()}
                      disabled={isUploadingPrescription}
                    >
                      {isUploadingPrescription ? <RefreshCcw size={16} className="animate-spin" /> : <Upload size={16} />}
                      {isUploadingPrescription ? 'Uploading...' : 'Add Prescription'}
                    </Button>
                  </div>
                )}

                {timeline.length > 0 && (
                  <CalendarSchedule
                    doses={timeline}
                    onDoseClick={setActiveDose}
                    onMarkMissed={(dose) => void handleDoseStatusUpdate(dose, 'missed')}
                    onMarkTaken={(dose) => void handleDoseStatusUpdate(dose, 'taken')}
                    updatingDoseId={updatingDoseId}
                  />
                )}
              </div>
            </section>

            <aside className="space-y-6">
              {prescriptionFiles.length > 0 && (
                <section className="overflow-hidden rounded-lg border border-border bg-card">
                  <button
                    type="button"
                    onClick={() => setShowPrescriptionFiles((value) => !value)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-secondary/50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FileImage size={18} className="text-primary" />
                      <div className="min-w-0">
                        <h2 className="font-semibold text-foreground">Uploaded Prescriptions</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {prescriptionFiles.length} file{prescriptionFiles.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      size={18}
                      className={cn('text-muted-foreground transition-transform duration-200', showPrescriptionFiles && 'rotate-180')}
                    />
                  </button>

                  {showPrescriptionFiles && (
                    <div className="space-y-3 border-t border-border bg-background/50 p-4">
                      {prescriptionFiles.map((file) => (
                        <div key={`${file.scheduleLabel}-${file.tag}-${file.fileName || file.fileUrl}`} className="rounded-lg border border-border bg-card p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-foreground">{file.tag}</p>
                              <p className="mt-1 truncate text-sm text-muted-foreground">{file.fileName || file.fileUrl}</p>
                            </div>
                            {file.fileUrl && (
                              <Button asChild variant="outline" size="icon" className="h-8 w-8">
                                <a href={file.fileUrl} target="_blank" rel="noreferrer" title="Open prescription">
                                  <ExternalLink size={16} />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <section className="overflow-hidden rounded-lg border border-border bg-card" data-helpman="medicine-list">
                <div className="flex w-full items-center justify-between px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Pill size={18} className="text-primary" />
                    <div className="text-left">
                      <p className="font-semibold text-foreground">Medicines</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{visibleMedicines.length} active</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border bg-background/50">
                  <div className="space-y-3 p-4">
                    {visibleMedicines.length > 0 ? (
                      visibleMedicines.map((medicine) => (
                        <MedicineCard key={`${medicine.planId}-${medicine._id}`} medicine={medicine} />
                      ))
                    ) : (
                      <div className="py-6 text-center">
                        <Pill className="mx-auto mb-2 text-muted-foreground" size={28} />
                        <p className="text-sm text-muted-foreground">No medicines in schedule</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>

      {activeDose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl text-foreground">AI Intake Verification</h2>
                <p className="mt-1 text-sm text-muted-foreground">
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
