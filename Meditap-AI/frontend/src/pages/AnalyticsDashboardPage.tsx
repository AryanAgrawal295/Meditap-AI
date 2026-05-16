import { useMemo, useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/contexts/AppContext";
import type { MedicalRecord, MedicationMedicine } from "@/types/patient";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  HeartPulse,
  Pill,
  Stethoscope,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RangeKey = "3m" | "6m" | "12m" | "all";

type ConditionInsight = {
  name: string;
  count: number;
  lastSeen: string;
  source: "history" | "chronic";
};

type DoctorInsight = {
  name: string;
  visits: number;
  departments: string[];
  lastVisit: string;
};

type MedicationInsight = {
  id: string;
  name: string;
  adherenceRate: number;
  total: number;
  taken: number;
  pending: number;
  missed: number;
};

const CHART_COLORS = ["#14b8a6", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const RANGE_MONTHS: Record<Exclude<RangeKey, "all">, number> = {
  "3m": 3,
  "6m": 6,
  "12m": 12,
};

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMonth(value: Date) {
  return value.toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function monthKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function titleCaseCondition(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferConditionStatus(record: MedicalRecord) {
  if (record.tags.includes("chronic")) {
    return "Chronic";
  }
  if (record.severity === "follow-up") {
    return "Under follow-up";
  }
  if (record.severity === "critical" || record.severity === "emergency") {
    return "Needs attention";
  }
  return "Observed";
}

function getCutoffDate(range: RangeKey) {
  if (range === "all") {
    return null;
  }

  const months = RANGE_MONTHS[range];
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months + 1);
  cutoff.setDate(1);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
}

function computeMonthSeries(records: MedicalRecord[], range: RangeKey) {
  const now = new Date();
  const monthsToShow = range === "all" ? Math.min(12, Math.max(records.length, 1)) : RANGE_MONTHS[range];
  const monthBuckets = new Map<string, { month: string; visits: number; followUps: number; urgent: number }>();

  for (let index = monthsToShow - 1; index >= 0; index -= 1) {
    const month = new Date(now.getFullYear(), now.getMonth() - index, 1);
    monthBuckets.set(monthKey(month), {
      month: formatMonth(month),
      visits: 0,
      followUps: 0,
      urgent: 0,
    });
  }

  records.forEach((record) => {
    const date = new Date(record.date);
    if (Number.isNaN(date.getTime())) {
      return;
    }

    const key = monthKey(startOfMonth(date));
    const bucket = monthBuckets.get(key);
    if (!bucket) {
      return;
    }

    bucket.visits += 1;
    if (record.severity === "follow-up") {
      bucket.followUps += 1;
    }
    if (record.severity === "critical" || record.severity === "emergency") {
      bucket.urgent += 1;
    }
  });

  return Array.from(monthBuckets.values());
}

function computeCategoryTrendSeries(
  records: MedicalRecord[],
  range: RangeKey,
  getCategory: (record: MedicalRecord) => string,
  limit = 4,
) {
  const now = new Date();
  const monthsToShow = range === "all" ? Math.min(12, Math.max(records.length, 1)) : RANGE_MONTHS[range];
  const monthBuckets = new Map<string, Record<string, number | string>>();
  const totals = new Map<string, number>();

  records.forEach((record) => {
    const category = getCategory(record);
    totals.set(category, (totals.get(category) || 0) + 1);
  });

  const topCategories = Array.from(totals.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([name]) => name);

  for (let index = monthsToShow - 1; index >= 0; index -= 1) {
    const month = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const bucket: Record<string, number | string> = { month: formatMonth(month) };
    topCategories.forEach((category) => {
      bucket[category] = 0;
    });
    monthBuckets.set(monthKey(month), bucket);
  }

  records.forEach((record) => {
    const date = new Date(record.date);
    if (Number.isNaN(date.getTime())) {
      return;
    }

    const category = getCategory(record);
    if (!topCategories.includes(category)) {
      return;
    }

    const key = monthKey(startOfMonth(date));
    const bucket = monthBuckets.get(key);
    if (!bucket) {
      return;
    }

    bucket[category] = Number(bucket[category] || 0) + 1;
  });

  return {
    data: Array.from(monthBuckets.values()),
    categories: topCategories,
  };
}

function computeVisitGapDays(records: MedicalRecord[]) {
  if (records.length < 2) {
    return null;
  }

  const gaps: number[] = [];
  for (let index = 1; index < records.length; index += 1) {
    const current = new Date(records[index - 1].date);
    const previous = new Date(records[index].date);
    if (Number.isNaN(current.getTime()) || Number.isNaN(previous.getTime())) {
      continue;
    }

    const diff = Math.abs(current.getTime() - previous.getTime());
    gaps.push(Math.round(diff / (1000 * 60 * 60 * 24)));
  }

  if (gaps.length === 0) {
    return null;
  }

  return Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length);
}

function safePercentage(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function buildMedicationInsights(medicines: MedicationMedicine[]): MedicationInsight[] {
  return medicines
    .map((medicine) => {
      const total = medicine.doses.length;
      const taken = medicine.doses.filter((dose) => dose.status === "taken").length;
      const pending = medicine.doses.filter((dose) => dose.status === "pending").length;
      const missed = medicine.doses.filter((dose) => dose.status === "missed").length;

      return {
        id: medicine._id,
        name: medicine.name,
        adherenceRate: safePercentage(taken, total),
        total,
        taken,
        pending,
        missed,
      };
    })
    .sort((left, right) => right.total - left.total || right.adherenceRate - left.adherenceRate);
}

function shortenLabel(value: string, maxLength = 24) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}...`;
}

export default function AnalyticsDashboardPage() {
  const { patient, medicalRecords, medicationPlans } = useApp();
  const [timeRange, setTimeRange] = useState<RangeKey>("6m");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");
  const [selectedCondition, setSelectedCondition] = useState<string>("all");

  const sortedRecords = useMemo(() => {
    return [...medicalRecords].sort((left, right) => {
      return new Date(right.date).getTime() - new Date(left.date).getTime();
    });
  }, [medicalRecords]);

  const cutoffDate = getCutoffDate(timeRange);

  const recordsInRange = useMemo(() => {
    return sortedRecords.filter((record) => {
      const recordDate = new Date(record.date);
      if (Number.isNaN(recordDate.getTime())) {
        return false;
      }

      return cutoffDate ? recordDate >= cutoffDate : true;
    });
  }, [cutoffDate, sortedRecords]);

  const allConditionInsights = useMemo(() => {
    const map = new Map<string, ConditionInsight>();

    sortedRecords.forEach((record) => {
      const diagnosis = record.diagnosis.trim();
      if (!diagnosis || diagnosis === "No diagnosis recorded") {
        return;
      }

      const key = normalizeText(diagnosis);
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (new Date(record.date).getTime() > new Date(existing.lastSeen).getTime()) {
          existing.lastSeen = record.date;
        }
      } else {
        map.set(key, {
          name: diagnosis,
          count: 1,
          lastSeen: record.date,
          source: "history",
        });
      }
    });

    (patient?.chronicDiseases || []).forEach((condition) => {
      const trimmed = condition.trim();
      if (!trimmed) {
        return;
      }

      const key = normalizeText(trimmed);
      const existing = map.get(key);
      if (existing) {
        existing.source = "chronic";
      } else {
        map.set(key, {
          name: titleCaseCondition(trimmed),
          count: 0,
          lastSeen: sortedRecords[0]?.date || new Date().toISOString(),
          source: "chronic",
        });
      }
    });

    return Array.from(map.values()).sort((left, right) => {
      return right.count - left.count || new Date(right.lastSeen).getTime() - new Date(left.lastSeen).getTime();
    });
  }, [patient?.chronicDiseases, sortedRecords]);

  const availableDoctors = useMemo(() => {
    return Array.from(new Set(recordsInRange.map((record) => record.doctor))).filter(Boolean).sort();
  }, [recordsInRange]);

  const availableConditions = useMemo(() => {
    return allConditionInsights.map((condition) => condition.name);
  }, [allConditionInsights]);

  const scopedRecords = useMemo(() => {
    return recordsInRange.filter((record) => {
      const matchesDoctor = selectedDoctor === "all" || record.doctor === selectedDoctor;
      const matchesCondition =
        selectedCondition === "all" || normalizeText(record.diagnosis) === normalizeText(selectedCondition);

      return matchesDoctor && matchesCondition;
    });
  }, [recordsInRange, selectedCondition, selectedDoctor]);

  const monthlyVisitData = useMemo(() => computeMonthSeries(scopedRecords, timeRange), [scopedRecords, timeRange]);

  const doctorInsights = useMemo<DoctorInsight[]>(() => {
    const map = new Map<string, DoctorInsight>();

    scopedRecords.forEach((record) => {
      const existing = map.get(record.doctor);
      if (existing) {
        existing.visits += 1;
        if (record.department && !existing.departments.includes(record.department)) {
          existing.departments.push(record.department);
        }
        if (new Date(record.date).getTime() > new Date(existing.lastVisit).getTime()) {
          existing.lastVisit = record.date;
        }
      } else {
        map.set(record.doctor, {
          name: record.doctor,
          visits: 1,
          departments: record.department ? [record.department] : [],
          lastVisit: record.date,
        });
      }
    });

    return Array.from(map.values()).sort((left, right) => right.visits - left.visits);
  }, [scopedRecords]);

  const activeConditions = useMemo(() => {
    const filtered = selectedCondition === "all"
      ? allConditionInsights
      : allConditionInsights.filter((condition) => normalizeText(condition.name) === normalizeText(selectedCondition));

    return filtered.slice(0, 8);
  }, [allConditionInsights, selectedCondition]);

  const diagnosisDistribution = useMemo(() => {
    const total = scopedRecords.length || 1;
    const relevantConditions = allConditionInsights
      .filter((condition) => scopedRecords.some((record) => normalizeText(record.diagnosis) === normalizeText(condition.name)))
      .slice(0, 5);

    return relevantConditions.map((condition, index) => ({
      name: condition.name,
      value: safePercentage(condition.count, total),
      visits: condition.count,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [allConditionInsights, scopedRecords]);

  const severityDistribution = useMemo(() => {
    const map = new Map<string, number>();

    scopedRecords.forEach((record) => {
      const label = record.severity === "follow-up"
        ? "Follow-up"
        : record.severity === "critical"
          ? "Critical"
          : record.severity === "emergency"
            ? "Emergency"
            : "Normal";
      map.set(label, (map.get(label) || 0) + 1);
    });

    return Array.from(map.entries()).map(([name, visits], index) => ({
      name,
      visits,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [scopedRecords]);

  const careTypeDistribution = useMemo(() => {
    const map = new Map<string, number>();

    scopedRecords.forEach((record) => {
      const label = record.recordType
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
      map.set(label, (map.get(label) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, visits], index) => ({
        name,
        visits,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((left, right) => right.visits - left.visits);
  }, [scopedRecords]);
  const careTrend = useMemo(() => {
    return computeCategoryTrendSeries(
      scopedRecords,
      timeRange,
      (record) =>
        record.recordType
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
      4,
    );
  }, [scopedRecords, timeRange]);

  const topHospitals = useMemo(() => {
    const map = new Map<string, number>();
    scopedRecords.forEach((record) => {
      map.set(record.hospital, (map.get(record.hospital) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, visits]) => ({ name, visits }))
      .sort((left, right) => right.visits - left.visits)
      .slice(0, 4);
  }, [scopedRecords]);

  const medicationInsights = useMemo(() => {
    const activeMedicines = medicationPlans
      .filter((plan) => plan.status === "active")
      .flatMap((plan) => plan.medicines);

    return buildMedicationInsights(activeMedicines);
  }, [medicationPlans]);

  const topMedicationInsights = useMemo(() => medicationInsights.slice(0, 4), [medicationInsights]);
  const severityTrend = useMemo(() => {
    return computeCategoryTrendSeries(
      scopedRecords,
      timeRange,
      (record) => {
        if (record.severity === "follow-up") return "Follow-up";
        if (record.severity === "critical") return "Critical";
        if (record.severity === "emergency") return "Emergency";
        return "Normal";
      },
      4,
    );
  }, [scopedRecords, timeRange]);

  const totalDoses = useMemo(() => {
    return medicationInsights.reduce((sum, item) => sum + item.total, 0);
  }, [medicationInsights]);

  const takenDoses = useMemo(() => {
    return medicationInsights.reduce((sum, item) => sum + item.taken, 0);
  }, [medicationInsights]);

  const missedDoses = useMemo(() => {
    return medicationInsights.reduce((sum, item) => sum + item.missed, 0);
  }, [medicationInsights]);

  const pendingDoses = useMemo(() => {
    return medicationInsights.reduce((sum, item) => sum + item.pending, 0);
  }, [medicationInsights]);

  const overallAdherenceRate = safePercentage(takenDoses, totalDoses);
  const averageVisitGap = computeVisitGapDays(scopedRecords);
  const lastVisit = scopedRecords[0]?.date || null;
  const uniqueDoctors = doctorInsights.length;
  const urgentVisitCount = scopedRecords.filter((record) => record.severity === "critical" || record.severity === "emergency").length;
  const followUpVisits = scopedRecords.filter((record) => record.severity === "follow-up").length;
  const leadingDoctor = doctorInsights[0];
  const primaryCondition = activeConditions[0];
  const recentRecords = scopedRecords.slice(0, 5);
  const totalCareVisits = careTypeDistribution.reduce((sum, item) => sum + item.visits, 0);
  const topCareType = careTypeDistribution[0];
  const topSeverity = severityDistribution[0];

  const stats = [
    {
      label: "Visits In Range",
      value: String(scopedRecords.length),
      helper: averageVisitGap ? `Avg ${averageVisitGap} days between visits` : "Waiting for more visit history",
      icon: <Activity className="h-5 w-5" />,
      color: "bg-sky-50 text-sky-700 border-sky-100",
    },
    {
      label: "Doctors Consulted",
      value: String(uniqueDoctors),
      helper: leadingDoctor ? `${leadingDoctor.name} leads with ${leadingDoctor.visits} visits` : "No doctor activity yet",
      icon: <Users className="h-5 w-5" />,
      color: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    {
      label: "Active Conditions",
      value: String(activeConditions.length),
      helper: primaryCondition ? `${primaryCondition.name} is the top recurring condition` : "No active conditions identified",
      icon: <HeartPulse className="h-5 w-5" />,
      color: "bg-amber-50 text-amber-700 border-amber-100",
    },
    {
      label: "Medication Adherence",
      value: `${overallAdherenceRate}%`,
      helper: totalDoses > 0 ? `${takenDoses}/${totalDoses} doses taken on time` : "No active medication schedule",
      icon: <Pill className="h-5 w-5" />,
      color: "bg-violet-50 text-violet-700 border-violet-100",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Health Analytics</h1>
            <p className="mt-2 text-muted-foreground">
              Interactive care insights for {patient?.name || "the selected patient"} based on recorded visits, diagnoses, and medication activity.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as RangeKey)}>
              <SelectTrigger className="min-w-[150px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3m">Last 3 months</SelectItem>
                <SelectItem value="6m">Last 6 months</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
                <SelectItem value="all">All records</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger className="min-w-[170px]">
                <SelectValue placeholder="Doctor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All doctors</SelectItem>
                {availableDoctors.map((doctor) => (
                  <SelectItem key={doctor} value={doctor}>
                    {doctor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCondition} onValueChange={setSelectedCondition}>
              <SelectTrigger className="min-w-[190px]">
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All conditions</SelectItem>
                {availableConditions.map((condition) => (
                  <SelectItem key={condition} value={condition}>
                    {condition}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className={`border ${stat.color}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.helper}</p>
                  </div>
                  <div className="rounded-xl bg-white/80 p-3 shadow-sm">
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.65fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Visit Trends</CardTitle>
              <CardDescription>
                Track total visits, follow-ups, and urgent encounters over time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={monthlyVisitData}>
                  <defs>
                    <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="visits" stroke="#14b8a6" fill="url(#visitsFill)" strokeWidth={3} name="Visits" />
                  <Bar dataKey="followUps" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Follow-ups" />
                  <Bar dataKey="urgent" fill="#f97316" radius={[6, 6, 0, 0]} name="Urgent" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Snapshot</CardTitle>
              <CardDescription>Quick signals from the selected analytics scope.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  Last Visit
                </div>
                <p className="mt-2 text-lg font-semibold">{lastVisit ? formatShortDate(lastVisit) : "No visits yet"}</p>
              </div>

              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  Follow-up Pressure
                </div>
                <p className="mt-2 text-lg font-semibold">{followUpVisits} follow-up visits</p>
                <p className="text-xs text-muted-foreground">{urgentVisitCount} visits marked critical or emergency</p>
              </div>

              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4 text-primary" />
                  Main Facility
                </div>
                <p className="mt-2 text-lg font-semibold">{topHospitals[0]?.name || "Not available"}</p>
                <p className="text-xs text-muted-foreground">
                  {topHospitals[0] ? `${topHospitals[0].visits} recorded visits` : "No facility data in scope"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="doctors">Doctors</TabsTrigger>
            <TabsTrigger value="conditions">Conditions</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Care Distribution</CardTitle>
                  <CardDescription>See which visit types are driving the patient journey.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Top Type</p>
                      <p className="mt-2 text-lg font-semibold">{topCareType?.name || "No data"}</p>
                      <p className="text-xs text-muted-foreground">
                        {topCareType ? `${topCareType.visits} visits` : "No visits in this scope"}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Coverage</p>
                      <p className="mt-2 text-lg font-semibold">{careTypeDistribution.length}</p>
                      <p className="text-xs text-muted-foreground">distinct care categories</p>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Count</p>
                      <p className="mt-2 text-lg font-semibold">{totalCareVisits}</p>
                      <p className="text-xs text-muted-foreground">recorded visits in range</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-primary/5 p-4">
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={careTrend.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Legend />
                        {careTrend.categories.map((category, index) => (
                          <Line
                            key={category}
                            type="monotone"
                            dataKey={category}
                            stroke={CHART_COLORS[index % CHART_COLORS.length]}
                            strokeWidth={3}
                            dot={{ r: 3, strokeWidth: 2, fill: "#10181d" }}
                            activeDot={{ r: 5 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {careTypeDistribution.slice(0, 4).map((entry) => (
                      <div key={entry.name} className="rounded-xl border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold">{shortenLabel(entry.name, 26)}</p>
                            <p className="text-xs text-muted-foreground">
                              {safePercentage(entry.visits, totalCareVisits)}% of care activity
                            </p>
                          </div>
                          <Badge variant="secondary">{entry.visits}</Badge>
                        </div>
                        <div className="mt-3">
                          <Progress value={safePercentage(entry.visits, totalCareVisits)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Visit Stream</CardTitle>
                  <CardDescription>Latest patient interactions within the current filter scope.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentRecords.length > 0 ? recentRecords.map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => {
                        setSelectedDoctor(record.doctor);
                        setSelectedCondition(record.diagnosis);
                      }}
                      className="w-full rounded-xl border p-4 text-left transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">{record.title}</p>
                          <p className="text-sm text-muted-foreground">{record.doctor} at {record.hospital}</p>
                        </div>
                        <Badge variant="secondary">{record.recordType}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatShortDate(record.date)}</span>
                        <span>•</span>
                        <span>{record.diagnosis}</span>
                        <span>•</span>
                        <span>{inferConditionStatus(record)}</span>
                      </div>
                    </button>
                  )) : (
                    <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                      No records match the current filters.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {topHospitals.map((hospital) => (
                <Card key={hospital.name}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-primary/10 p-3 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{hospital.name}</p>
                        <p className="text-sm text-muted-foreground">{hospital.visits} visits in scope</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="doctors" className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Doctor Visit Frequency</CardTitle>
                  <CardDescription>How often the patient has visited each doctor.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart
                      data={doctorInsights}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip />
                      <Bar dataKey="visits" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Doctor Details</CardTitle>
                  <CardDescription>Select a doctor row using the filter for a tighter analysis scope.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {doctorInsights.length > 0 ? doctorInsights.map((doctor) => (
                    <button
                      key={doctor.name}
                      type="button"
                      onClick={() => setSelectedDoctor(doctor.name === selectedDoctor ? "all" : doctor.name)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors hover:bg-muted/40 ${
                        selectedDoctor === doctor.name ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">{doctor.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {doctor.departments.length > 0 ? doctor.departments.join(", ") : "Department not recorded"}
                          </p>
                        </div>
                        <Badge>{doctor.visits} visits</Badge>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">Last seen on {formatShortDate(doctor.lastVisit)}</p>
                    </button>
                  )) : (
                    <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                      No doctor activity found for the current range.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="conditions" className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Condition Distribution</CardTitle>
                  <CardDescription>Most frequent diagnoses and active medical concerns.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={diagnosisDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={88}
                        dataKey="value"
                        nameKey="name"
                        label={({ value }) => `${value}%`}
                      >
                        {diagnosisDistribution.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="grid gap-3">
                    {diagnosisDistribution.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between rounded-xl border px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{entry.name}</p>
                            <p className="text-xs text-muted-foreground">{entry.visits} visits</p>
                          </div>
                        </div>
                        <Badge variant="secondary">{entry.value}%</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active Conditions</CardTitle>
                  <CardDescription>Click a condition to narrow the dashboard to that diagnosis.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeConditions.length > 0 ? activeConditions.map((condition) => (
                    <button
                      key={condition.name}
                      type="button"
                      onClick={() => setSelectedCondition(condition.name === selectedCondition ? "all" : condition.name)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors hover:bg-muted/40 ${
                        selectedCondition === condition.name ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">{condition.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {condition.source === "chronic" ? "Marked as chronic in profile" : "Observed in medical history"}
                          </p>
                        </div>
                        <Badge variant="secondary">{condition.count} visits</Badge>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">Last seen on {formatShortDate(condition.lastSeen)}</p>
                    </button>
                  )) : (
                    <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                      No active conditions found in the selected scope.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Severity Mix</CardTitle>
                <CardDescription>Balance of normal, follow-up, and urgent records.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Dominant</p>
                    <p className="mt-2 text-lg font-semibold">{topSeverity?.name || "No data"}</p>
                    <p className="text-xs text-muted-foreground">
                      {topSeverity ? `${topSeverity.visits} visits` : "No severity records"}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Urgent</p>
                    <p className="mt-2 text-lg font-semibold">{urgentVisitCount}</p>
                    <p className="text-xs text-muted-foreground">critical + emergency visits</p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Follow-up</p>
                    <p className="mt-2 text-lg font-semibold">{followUpVisits}</p>
                    <p className="text-xs text-muted-foreground">records needing review</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-primary/5 p-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={severityTrend.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Legend />
                      {severityTrend.categories.map((category, index) => (
                        <Line
                          key={category}
                          type="monotone"
                          dataKey={category}
                          stroke={CHART_COLORS[index % CHART_COLORS.length]}
                          strokeWidth={3}
                          dot={{ r: 3, strokeWidth: 2, fill: "#10181d" }}
                          activeDot={{ r: 5 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medications" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Taken Doses</p>
                      <p className="text-2xl font-bold">{takenDoses}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
                      <CalendarClock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Doses</p>
                      <p className="text-2xl font-bold">{pendingDoses}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-rose-100 p-3 text-rose-700">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Missed Doses</p>
                      <p className="text-2xl font-bold">{missedDoses}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Medication Summary</CardTitle>
                <CardDescription>Short view of current treatment consistency.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {topMedicationInsights.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {topMedicationInsights.map((medicine) => (
                      <div key={medicine.id} className="rounded-xl border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{medicine.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {medicine.taken} taken • {medicine.pending} pending • {medicine.missed} missed
                            </p>
                          </div>
                          <Badge variant="secondary">{medicine.adherenceRate}%</Badge>
                        </div>
                        <div className="mt-4">
                          <Progress value={medicine.adherenceRate} />
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            {medicine.taken} logged
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
                            {medicine.total} total doses
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                    No active medication plans are available, so adherence analytics cannot be computed yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
