import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { TrendingUp, Users, Pill, AlertCircle, Activity } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

export default function AnalyticsDashboardPage() {
  const { medicalRecords } = useApp();

  // Mock analytics data
  const visitData = [
    { month: "Jan", visits: 4, consultations: 2, follow_ups: 2 },
    { month: "Feb", visits: 3, consultations: 1, follow_ups: 2 },
    { month: "Mar", visits: 5, consultations: 3, follow_ups: 2 },
    { month: "Apr", visits: 4, consultations: 2, follow_ups: 2 },
    { month: "May", visits: 6, consultations: 4, follow_ups: 2 },
    { month: "Jun", visits: 5, consultations: 3, follow_ups: 2 },
  ];

  const diagnosisData = [
    { name: "Hypertension", value: 35, color: "#ef4444" },
    { name: "Diabetes", value: 25, color: "#f59e0b" },
    { name: "Asthma", value: 20, color: "#3b82f6" },
    { name: "Other", value: 20, color: "#10b981" },
  ];

  const medicationAdherence = [
    { name: "Medicine A", adherence: 95, compliance: 92 },
    { name: "Medicine B", adherence: 87, compliance: 85 },
    { name: "Medicine C", adherence: 92, compliance: 90 },
    { name: "Medicine D", adherence: 78, compliance: 75 },
    { name: "Medicine E", adherence: 88, compliance: 86 },
  ];

  const healthScoreData = [
    { category: "Vitals", score: 85 },
    { category: "Medication", score: 88 },
    { category: "Activity", score: 72 },
    { category: "Nutrition", score: 80 },
    { category: "Sleep", score: 75 },
  ];

  const timelineData = [
    { x: 1, y: 120, type: "Consultation" },
    { x: 2, y: 125, type: "Follow-up" },
    { x: 3, y: 118, type: "Check-up" },
    { x: 4, y: 130, type: "Lab Test" },
    { x: 5, y: 115, type: "Consultation" },
    { x: 6, y: 128, type: "Follow-up" },
  ];

  const stats = [
    {
      label: "Total Visits",
      value: "27",
      icon: <Activity className="h-5 w-5" />,
      color: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "Medications",
      value: "5",
      icon: <Pill className="h-5 w-5" />,
      color: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: "Diagnoses",
      value: "3",
      icon: <AlertCircle className="h-5 w-5" />,
      color: "bg-yellow-100 dark:bg-yellow-900/30",
    },
    {
      label: "Adherence Rate",
      value: "88%",
      icon: <TrendingUp className="h-5 w-5" />,
      color: "bg-purple-100 dark:bg-purple-900/30",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Health Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive insights into your health and medical history
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <Card key={idx} className={stat.color}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  {stat.icon}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="adherence">Adherence</TabsTrigger>
            <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
            <TabsTrigger value="health-score">Health Score</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Visit Trends</CardTitle>
                <CardDescription>
                  Number of medical visits over the last 6 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={visitData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="visits" fill="#3b82f6" />
                    <Bar dataKey="consultations" fill="#10b981" />
                    <Bar dataKey="follow_ups" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Visit Timeline</CardTitle>
                <CardDescription>
                  Medical visits and events correlation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="x" name="Timeline" />
                    <YAxis dataKey="y" name="Metric" />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                    <Scatter name="Visits" data={timelineData} fill="#8b5cf6" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Adherence Tab */}
          <TabsContent value="adherence" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Medication Adherence</CardTitle>
                <CardDescription>
                  Adherence rates for your current medications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={medicationAdherence}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="adherence" fill="#10b981" name="Adherence %" />
                    <Bar dataKey="compliance" fill="#3b82f6" name="Compliance %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Adherence Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-sm">Overall Adherence Rate</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    88%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm">Most Consistent Medicine</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    Medicine A (95%)
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <span className="text-sm">Needs Improvement</span>
                  <span className="font-bold text-yellow-600 dark:text-yellow-400">
                    Medicine D (78%)
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Diagnoses Tab */}
          <TabsContent value="diagnoses" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Diagnosis Distribution</CardTitle>
                  <CardDescription>
                    Breakdown of your medical diagnoses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={diagnosisData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) =>
                          `${name}: ${value}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {diagnosisData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active Conditions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {diagnosisData.map((diagnosis, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: diagnosis.color }}
                        />
                        <span className="text-sm font-medium">
                          {diagnosis.name}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {diagnosis.value}%
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Health Score Tab */}
          <TabsContent value="health-score" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Overall Health Score</CardTitle>
                <CardDescription>
                  Comprehensive health assessment across multiple dimensions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={healthScoreData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="Health Score"
                      dataKey="score"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {healthScoreData.map((data, idx) => (
                <Card key={idx}>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        {data.category}
                      </p>
                      <div className="text-3xl font-bold">{data.score}</div>
                      <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${data.score}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex-shrink-0">✓</div>
                  <div>
                    <p className="font-medium text-sm">Maintain Current Vitals</p>
                    <p className="text-xs text-muted-foreground">
                      Your vital signs are stable. Keep up with regular monitoring.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex-shrink-0">!</div>
                  <div>
                    <p className="font-medium text-sm">Improve Activity Level</p>
                    <p className="text-xs text-muted-foreground">
                      Increase daily physical activity to boost overall health score.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex-shrink-0">→</div>
                  <div>
                    <p className="font-medium text-sm">Schedule Follow-up</p>
                    <p className="text-xs text-muted-foreground">
                      Your next check-up is due in 2 weeks. Schedule an appointment.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
