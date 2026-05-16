import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { Heart, Activity, Weight, Droplet, Thermometer, TrendingUp, Plus } from "lucide-react";
import { format, subDays } from "date-fns";

interface VitalSign {
  date: Date;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  heartRate: number;
  weight: number;
  glucose: number;
  temperature: number;
  notes?: string;
}

const generateMockData = (): VitalSign[] => {
  const data: VitalSign[] = [];
  for (let i = 30; i >= 0; i--) {
    const date = subDays(new Date(), i);
    data.push({
      date,
      bloodPressureSystolic: 110 + Math.random() * 20,
      bloodPressureDiastolic: 70 + Math.random() * 15,
      heartRate: 60 + Math.random() * 30,
      weight: 70 + Math.random() * 10,
      glucose: 90 + Math.random() * 50,
      temperature: 36.5 + Math.random() * 1,
    });
  }
  return data;
};

export default function VitalSignsPage() {
  const [vitalSigns, setVitalSigns] = useState<VitalSign[]>(generateMockData());
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    heartRate: "",
    weight: "",
    glucose: "",
    temperature: "",
    notes: "",
  });

  const chartData = vitalSigns.map((v) => ({
    date: format(v.date, "MMM dd"),
    systolic: Math.round(v.bloodPressureSystolic),
    diastolic: Math.round(v.bloodPressureDiastolic),
    heartRate: Math.round(v.heartRate),
    weight: Math.round(v.weight * 10) / 10,
    glucose: Math.round(v.glucose),
    temperature: Math.round(v.temperature * 10) / 10,
  }));

  const latestVital = vitalSigns[vitalSigns.length - 1];

  const handleAddVital = () => {
    if (
      !formData.bloodPressureSystolic ||
      !formData.heartRate
    ) {
      alert("Please fill in required fields");
      return;
    }

    const newVital: VitalSign = {
      date: new Date(formData.date),
      bloodPressureSystolic: parseFloat(formData.bloodPressureSystolic),
      bloodPressureDiastolic: parseFloat(formData.bloodPressureDiastolic) || 0,
      heartRate: parseFloat(formData.heartRate),
      weight: parseFloat(formData.weight) || 0,
      glucose: parseFloat(formData.glucose) || 0,
      temperature: parseFloat(formData.temperature) || 0,
      notes: formData.notes,
    };

    setVitalSigns([...vitalSigns, newVital].sort((a, b) => a.date.getTime() - b.date.getTime()));
    setFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      bloodPressureSystolic: "",
      bloodPressureDiastolic: "",
      heartRate: "",
      weight: "",
      glucose: "",
      temperature: "",
      notes: "",
    });
    setOpenDialog(false);
  };

  const getHealthStatus = (type: string, value: number): "normal" | "warning" | "critical" => {
    switch (type) {
      case "heartRate":
        if (value >= 60 && value <= 100) return "normal";
        if (value > 100) return "warning";
        return "critical";
      case "systolic":
        if (value < 120) return "normal";
        if (value < 140) return "warning";
        return "critical";
      case "glucose":
        if (value >= 70 && value <= 100) return "normal";
        if (value < 70 || value > 140) return "critical";
        return "warning";
      default:
        return "normal";
    }
  };

  const getStatusColor = (status: "normal" | "warning" | "critical") => {
    switch (status) {
      case "normal":
        return "text-green-600 dark:text-green-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "critical":
        return "text-red-600 dark:text-red-400";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vital Signs Monitor</h1>
            <p className="text-muted-foreground mt-2">
              Track and manage your daily health metrics
            </p>
          </div>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Log Vital Signs
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Log Vital Signs</DialogTitle>
                <DialogDescription>
                  Record your health measurements for today
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vital-date">Date</Label>
                  <Input
                    id="vital-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="systolic">
                      Blood Pressure (Systolic) *
                    </Label>
                    <Input
                      id="systolic"
                      type="number"
                      placeholder="e.g., 120"
                      value={formData.bloodPressureSystolic}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bloodPressureSystolic: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="diastolic">
                      Blood Pressure (Diastolic)
                    </Label>
                    <Input
                      id="diastolic"
                      type="number"
                      placeholder="e.g., 80"
                      value={formData.bloodPressureDiastolic}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bloodPressureDiastolic: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="heart-rate">Heart Rate * (bpm)</Label>
                    <Input
                      id="heart-rate"
                      type="number"
                      placeholder="e.g., 72"
                      value={formData.heartRate}
                      onChange={(e) =>
                        setFormData({ ...formData, heartRate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature (°C)</Label>
                    <Input
                      id="temperature"
                      type="number"
                      step="0.1"
                      placeholder="e.g., 36.5"
                      value={formData.temperature}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          temperature: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="e.g., 70"
                      value={formData.weight}
                      onChange={(e) =>
                        setFormData({ ...formData, weight: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="glucose">Glucose (mg/dL)</Label>
                    <Input
                      id="glucose"
                      type="number"
                      placeholder="e.g., 100"
                      value={formData.glucose}
                      onChange={(e) =>
                        setFormData({ ...formData, glucose: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Any additional notes (optional)"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </div>

                <Button onClick={handleAddVital} className="w-full">
                  Save Vital Signs
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Latest Vitals Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <VitalCard
            icon={<Heart className="h-5 w-5" />}
            label="Blood Pressure"
            value={`${Math.round(latestVital.bloodPressureSystolic)}/${Math.round(
              latestVital.bloodPressureDiastolic
            )}`}
            unit="mmHg"
            status={getHealthStatus("systolic", latestVital.bloodPressureSystolic)}
          />
          <VitalCard
            icon={<Activity className="h-5 w-5" />}
            label="Heart Rate"
            value={Math.round(latestVital.heartRate).toString()}
            unit="bpm"
            status={getHealthStatus("heartRate", latestVital.heartRate)}
          />
          <VitalCard
            icon={<Weight className="h-5 w-5" />}
            label="Weight"
            value={(Math.round(latestVital.weight * 10) / 10).toString()}
            unit="kg"
            status="normal"
          />
          <VitalCard
            icon={<Droplet className="h-5 w-5" />}
            label="Glucose"
            value={Math.round(latestVital.glucose).toString()}
            unit="mg/dL"
            status={getHealthStatus("glucose", latestVital.glucose)}
          />
          <VitalCard
            icon={<Thermometer className="h-5 w-5" />}
            label="Temperature"
            value={(Math.round(latestVital.temperature * 10) / 10).toString()}
            unit="°C"
            status="normal"
          />
          <VitalCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Data Points"
            value={vitalSigns.length.toString()}
            unit="records"
            status="normal"
          />
        </div>

        {/* Charts */}
        <Tabs defaultValue="blood-pressure" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="blood-pressure">Blood Pressure</TabsTrigger>
            <TabsTrigger value="heart-rate">Heart Rate</TabsTrigger>
            <TabsTrigger value="weight">Weight</TabsTrigger>
            <TabsTrigger value="glucose">Glucose</TabsTrigger>
          </TabsList>

          <TabsContent value="blood-pressure">
            <Card>
              <CardHeader>
                <CardTitle>Blood Pressure Trend</CardTitle>
                <CardDescription>
                  Last 30 days systolic and diastolic readings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[60, 160]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="systolic"
                      stroke="#ef4444"
                      dot={false}
                      name="Systolic"
                    />
                    <Line
                      type="monotone"
                      dataKey="diastolic"
                      stroke="#3b82f6"
                      dot={false}
                      name="Diastolic"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="heart-rate">
            <Card>
              <CardHeader>
                <CardTitle>Heart Rate Trend</CardTitle>
                <CardDescription>
                  Last 30 days heart rate measurements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorHR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[40, 120]} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="heartRate"
                      stroke="#06b6d4"
                      fillOpacity={1}
                      fill="url(#colorHR)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weight">
            <Card>
              <CardHeader>
                <CardTitle>Weight Trend</CardTitle>
                <CardDescription>
                  Last 30 days weight measurements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[60, 85]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#10b981"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="glucose">
            <Card>
              <CardHeader>
                <CardTitle>Glucose Level Trend</CardTitle>
                <CardDescription>
                  Last 30 days glucose measurements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[60, 180]} />
                    <Tooltip />
                    <Bar dataKey="glucose" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function VitalCard({
  icon,
  label,
  value,
  unit,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  status: "normal" | "warning" | "critical";
}) {
  const statusColor = {
    normal: "bg-green-100 dark:bg-green-900/30",
    warning: "bg-yellow-100 dark:bg-yellow-900/30",
    critical: "bg-red-100 dark:bg-red-900/30",
  };

  return (
    <Card className={statusColor[status]}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          {icon}
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground">{unit}</p>
        </div>
      </CardContent>
    </Card>
  );
}
