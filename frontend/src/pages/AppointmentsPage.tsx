import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Calendar, Clock, MapPin, User, Plus, Trash2, Edit2 } from "lucide-react";
import { format, addDays, isSameDay } from "date-fns";
import { useApp } from "@/contexts/AppContext";

interface Appointment {
  id: string;
  patientId: string;
  doctorId?: string;
  patientName: string;
  doctorName?: string;
  type: string;
  date: Date;
  time: string;
  location?: string;
  notes?: string;
  status: "scheduled" | "completed" | "cancelled";
}

export default function AppointmentsPage() {
  const { currentPatientId } = useApp();
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: "1",
      patientId: currentPatientId || "",
      patientName: "Your Name",
      doctorName: "Dr. Smith",
      type: "Consultation",
      date: new Date(),
      time: "10:00 AM",
      location: "Hospital Room 101",
      status: "scheduled",
    },
    {
      id: "2",
      patientId: currentPatientId || "",
      patientName: "Your Name",
      doctorName: "Dr. Johnson",
      type: "Follow-up",
      date: addDays(new Date(), 2),
      time: "2:00 PM",
      location: "Clinic 2",
      status: "scheduled",
    },
  ]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    patientName: "",
    doctorName: "",
    type: "Consultation",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "10:00",
    location: "",
    notes: "",
  });

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setFormData({ ...formData, date: format(date, "yyyy-MM-dd") });
  };

  const handleAddAppointment = () => {
    if (!formData.patientName || !formData.time) return;

    const newAppointment: Appointment = {
      id: editingId || Date.now().toString(),
      patientId: currentPatientId || "",
      patientName: formData.patientName,
      doctorName: formData.doctorName || undefined,
      type: formData.type,
      date: new Date(formData.date),
      time: formData.time,
      location: formData.location || undefined,
      notes: formData.notes || undefined,
      status: "scheduled",
    };

    if (editingId) {
      setAppointments(
        appointments.map((apt) => (apt.id === editingId ? newAppointment : apt))
      );
      setEditingId(null);
    } else {
      setAppointments([...appointments, newAppointment]);
    }

    resetForm();
    setOpenDialog(false);
  };

  const handleDeleteAppointment = (id: string) => {
    setAppointments(appointments.filter((apt) => apt.id !== id));
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setFormData({
      patientName: appointment.patientName,
      doctorName: appointment.doctorName || "",
      type: appointment.type,
      date: format(appointment.date, "yyyy-MM-dd"),
      time: appointment.time,
      location: appointment.location || "",
      notes: appointment.notes || "",
    });
    setEditingId(appointment.id);
    setOpenDialog(true);
  };

  const resetForm = () => {
    setFormData({
      patientName: "",
      doctorName: "",
      type: "Consultation",
      date: format(new Date(), "yyyy-MM-dd"),
      time: "10:00",
      location: "",
      notes: "",
    });
  };

  const todayAppointments = appointments.filter((apt) =>
    isSameDay(apt.date, new Date())
  );
  const upcomingAppointments = appointments.filter(
    (apt) => apt.date > new Date() && !isSameDay(apt.date, new Date())
  );
  const pastAppointments = appointments.filter((apt) => apt.date < new Date());

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
            <p className="text-muted-foreground mt-2">
              Manage your medical appointments and consultations
            </p>
          </div>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  resetForm();
                  setEditingId(null);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Appointment" : "Schedule New Appointment"}
                </DialogTitle>
                <DialogDescription>
                  {editingId
                    ? "Update the appointment details"
                    : "Add a new appointment to your calendar"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patient-name">Your Name</Label>
                  <Input
                    id="patient-name"
                    value={formData.patientName}
                    onChange={(e) =>
                      setFormData({ ...formData, patientName: e.target.value })
                    }
                    placeholder="Enter your name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doctor-name">Doctor/Provider Name</Label>
                  <Input
                    id="doctor-name"
                    value={formData.doctorName}
                    onChange={(e) =>
                      setFormData({ ...formData, doctorName: e.target.value })
                    }
                    placeholder="Enter doctor name (optional)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Appointment Type</Label>
                  <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Consultation">Consultation</SelectItem>
                      <SelectItem value="Follow-up">Follow-up</SelectItem>
                      <SelectItem value="Check-up">Check-up</SelectItem>
                      <SelectItem value="Surgery">Surgery</SelectItem>
                      <SelectItem value="Lab Test">Lab Test</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) =>
                        setFormData({ ...formData, time: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="Hospital / Clinic address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Add any notes or symptoms"
                    rows={3}
                  />
                </div>

                <Button onClick={handleAddAppointment} className="w-full">
                  {editingId ? "Update Appointment" : "Schedule Appointment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayAppointments.length}</div>
              <p className="text-xs text-muted-foreground">appointments</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingAppointments.length}</div>
              <p className="text-xs text-muted-foreground">scheduled</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pastAppointments.length}</div>
              <p className="text-xs text-muted-foreground">past appointments</p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Appointments */}
        {todayAppointments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Appointments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayAppointments.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  onEdit={handleEditAppointment}
                  onDelete={handleDeleteAppointment}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
              <CardDescription>
                {upcomingAppointments.length} appointment
                {upcomingAppointments.length !== 1 ? "s" : ""} scheduled
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingAppointments.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  onEdit={handleEditAppointment}
                  onDelete={handleDeleteAppointment}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Past Appointments */}
        {pastAppointments.length > 0 && (
          <Card className="opacity-75">
            <CardHeader>
              <CardTitle className="text-muted-foreground">
                Past Appointments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pastAppointments.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  onEdit={handleEditAppointment}
                  onDelete={handleDeleteAppointment}
                  readonly
                />
              ))}
            </CardContent>
          </Card>
        )}

        {appointments.length === 0 && (
          <Card className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-2" />
            <p className="text-muted-foreground">No appointments scheduled</p>
            <p className="text-sm text-muted-foreground">
              Schedule your first appointment to get started
            </p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function AppointmentCard({
  appointment,
  onEdit,
  onDelete,
  readonly = false,
}: {
  appointment: Appointment;
  onEdit: (apt: Appointment) => void;
  onDelete: (id: string) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{appointment.type}</h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {appointment.status}
          </span>
        </div>
        {appointment.doctorName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            {appointment.doctorName}
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {format(appointment.date, "MMM dd, yyyy")} at {appointment.time}
        </div>
        {appointment.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {appointment.location}
          </div>
        )}
        {appointment.notes && (
          <p className="text-sm text-muted-foreground italic">
            Note: {appointment.notes}
          </p>
        )}
      </div>
      {!readonly && (
        <div className="flex gap-2 ml-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(appointment)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(appointment.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )}
    </div>
  );
}
