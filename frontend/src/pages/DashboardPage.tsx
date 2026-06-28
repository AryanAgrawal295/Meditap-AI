import { useNavigate } from 'react-router-dom';
import { ChevronRight, Activity, Calendar, AlertTriangle, Phone } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { PatientAvatar } from '@/components/PatientAvatar';
import { useApp } from '@/contexts/AppContext';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { patient, medicalRecords } = useApp();

  if (!patient) {
    return null;
  }

  const recentRecords = medicalRecords.slice(0, 3);
  const emergencyPhone = patient.emergencyContact.phone;
  const emergencyPhoneHref = emergencyPhone.replace(/[^\d+]/g, '');
  const canCallEmergencyContact = emergencyPhoneHref.length >= 7;

  return (
    <DashboardLayout>
      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left Column - Patient Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Patient Summary Card */}
          <div className="medical-card animate-slide-up">
            <div className="flex flex-col items-center text-center">
              <PatientAvatar name={patient.name} photo={patient.photo} size="lg" />
              <h2 className="font-display text-xl text-foreground mt-4">{patient.name}</h2>
              <p className="text-sm text-muted-foreground">
                {patient.age} yrs • {patient.gender}
              </p>
              
              <div className="flex gap-2 mt-4">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  {patient.bloodGroup}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                  <AlertTriangle size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Allergies</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {patient.allergies.length > 0 ? patient.allergies.map((allergy, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium"
                      >
                        {allergy}
                      </span>
                    )) : <span className="text-sm text-muted-foreground">No allergies reported</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Phone size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Emergency Contact</p>
                  <p className="text-sm font-medium text-foreground">{patient.emergencyContact.name}</p>
                  {canCallEmergencyContact ? (
                    <a href={`tel:${emergencyPhoneHref}`} className="text-xs text-primary hover:underline">
                      {emergencyPhone}
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">No number available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity */}
          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl text-foreground">Recent Activity</h3>
              <button
                onClick={() => navigate('/medical-history')}
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                View All
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid gap-3 lg:gap-4">
              {recentRecords.map((record) => (
                <div key={record.id} className="medical-card p-4 lg:p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Activity size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-medium text-foreground">{record.title}</h4>
                          <p className="text-sm text-muted-foreground">{record.diagnosis}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                          <Calendar size={12} />
                          {new Date(record.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                      <p className="text-sm text-primary mt-2">{record.doctor} • {record.hospital}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
