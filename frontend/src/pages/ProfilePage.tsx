import { useNavigate } from 'react-router-dom';
import { Edit, Phone, Calendar, Heart, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { PatientAvatar } from '@/components/PatientAvatar';
import { InfoCard } from '@/components/InfoCard';
import { useApp } from '@/contexts/AppContext';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { patient, role } = useApp();

  const canEdit = role === 'doctor';

  if (!patient) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl lg:text-4xl text-foreground">Patient Profile</h1>
            <p className="text-muted-foreground mt-1">Personal information</p>
          </div>
          {canEdit && (
            <Button variant="secondary" size="default" onClick={() => navigate('/edit-profile')}>
              <Edit size={16} />
              Edit Profile
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 pb-20 lg:pb-0">
          {/* Profile Card */}
          <div className="medical-card text-center animate-slide-up">
            <PatientAvatar name={patient.name} photo={patient.photo} size="xl" className="mx-auto mb-4" />
            <h2 className="font-display text-2xl text-foreground">{patient.name}</h2>
            <p className="text-muted-foreground">Patient ID: {patient.id}</p>
            
            <div className="flex justify-center gap-2 mt-4">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                {patient.bloodGroup}
              </span>
              <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
                {patient.gender}
              </span>
            </div>
          </div>

          {/* Personal Details */}
          <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h3 className="font-display text-xl text-foreground">Personal Details</h3>
            
            <InfoCard
              icon={<Calendar size={18} />}
              label="Date of Birth"
              value={patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              }) : 'Not available'}
            />

            <InfoCard
              icon={<Heart size={18} />}
              label="Age"
              value={`${patient.age} years old`}
            />
          </div>

          {/* Allergies */}
          <div className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <h3 className="font-display text-xl text-foreground mb-4">Known Allergies</h3>
            
            <InfoCard
              icon={<AlertTriangle size={18} />}
              label="Allergies"
              value={
                patient.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {patient.allergies.map((allergy, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-medium"
                      >
                        {allergy}
                      </span>
                    ))}
                  </div>
                ) : (
                  'None reported'
                )
              }
              variant="warning"
            />
          </div>

          {/* Emergency Contact */}
          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="font-display text-xl text-foreground mb-4">Emergency Contact</h3>
            
            <div className="medical-card">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                  <Phone size={24} />
                </div>
                <div>
                  <p className="font-medium text-lg text-foreground">{patient.emergencyContact.name}</p>
                  <p className="text-sm text-muted-foreground">{patient.emergencyContact.relation}</p>
                </div>
              </div>
              
              <a
                href={`tel:${patient.emergencyContact.phone}`}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-destructive/10 text-destructive font-medium hover:bg-destructive/20 transition-colors"
              >
                <Phone size={18} />
                {patient.emergencyContact.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
