import { AlertTriangle, BellRing, Camera, Clock, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatTime(value) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getLevelConfig(alarmLevel) {
  if (alarmLevel === 3) {
    return {
      title: "Critical Medicine Alert",
      label: "Level 3",
      headerClass: "bg-red-700",
      borderClass: "border-red-600 shadow-red-950/50",
      iconClass: "text-red-700",
      noticeClass: "border-red-200 bg-red-50 text-red-700",
      icon: "alert",
      message:
        "This medicine is still not verified after 5 minutes. The alarm will continue until camera verification succeeds.",
    };
  }

  if (alarmLevel === 2) {
    return {
      title: "Medicine Verification Warning",
      label: "Level 2",
      headerClass: "bg-orange-600",
      borderClass: "border-orange-500 shadow-orange-950/40",
      iconClass: "text-orange-600",
      noticeClass: "border-orange-200 bg-orange-50 text-orange-700",
      icon: "alert",
      message:
        "This medicine has not been verified after 3 minutes. This warning alarm will ring for 1 minute.",
    };
  }

  return {
    title: "Medicine Time",
    label: "Level 1",
    headerClass: "bg-amber-500",
    borderClass: "border-amber-400 shadow-amber-950/30",
    iconClass: "text-amber-600",
    noticeClass: "border-amber-200 bg-amber-50 text-amber-700",
    icon: "bell",
    message:
      "This first reminder alarm will ring for 1 minute. Verification is still required if the alarm stops.",
  };
}

export default function AlarmModal({ reminder, alarmLevel, currentTime, onVerify }) {
  if (!reminder) return null;

  const config = getLevelConfig(alarmLevel);

  return (
    <div className="fixed inset-0 z-[70] flex min-h-dvh items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
      <div
        className={`w-full max-w-lg overflow-hidden rounded-lg border bg-background shadow-2xl ${config.borderClass}`}
      >
        <div className={`px-5 py-4 text-white ${config.headerClass}`}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20">
              {config.icon === "alert" ? <AlertTriangle size={24} /> : <BellRing size={24} />}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/80">{config.label}</p>
              <h2 className="font-display text-2xl text-white">{config.title}</h2>
              <p className="text-sm text-white/85">
                Scheduled at {formatTime(reminder.scheduledAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <Pill className="mt-1 shrink-0 text-primary" size={22} />
              <div className="min-w-0">
                <p className="text-sm font-medium uppercase text-muted-foreground">Medicine</p>
                <h3 className="mt-1 text-xl font-semibold text-foreground">{reminder.medicineName}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{reminder.dosage}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-secondary/50 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Clock size={16} className="text-primary" />
                Scheduled
              </div>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatTime(reminder.scheduledAt)}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/50 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <BellRing size={16} className={config.iconClass} />
                Current
              </div>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatTime(currentTime)}</p>
            </div>
          </div>

          <div className={`rounded-lg border p-3 text-sm ${config.noticeClass}`}>
            {config.message}
          </div>

          <Button type="button" variant="medical" className="w-full" size="lg" onClick={onVerify}>
            <Camera size={18} />
            Verify Medicine Intake
          </Button>
        </div>
      </div>
    </div>
  );
}
