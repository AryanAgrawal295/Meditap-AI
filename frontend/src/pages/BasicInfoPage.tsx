import { useNavigate } from 'react-router-dom';
import { Shield, Droplets, AlertTriangle, Phone, User, ChevronRight, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PatientAvatar } from '@/components/PatientAvatar';
import { InfoCard } from '@/components/InfoCard';
import { useApp } from '@/contexts/AppContext';

export default function BasicInfoPage() {
  const navigate = useNavigate();
  const { patient, isInitializing, isLoadingPatient } = useApp();

  if (isInitializing || isLoadingPatient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <LoaderCircle size={20} className="animate-spin" />
          <span>Loading NFC patient information...</span>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg medical-card text-center">
          <h1 className="text-2xl font-display text-foreground mb-3">No patient loaded</h1>
          <p className="text-muted-foreground mb-6">
            NFC quick access is optional during local testing. You can continue with the normal login flow and load patient data later.
          </p>
          <div className="space-y-3">
            <Button
              variant="medical"
              size="full"
              onClick={() => navigate('/patient-lookup')}
              className="group"
            >
              <User size={18} />
              Continue Without NFC
              <ChevronRight size={18} className="ml-auto group-hover:translate-x-1 transition-transform" />
            </Button>

            <p className="text-xs text-muted-foreground">
              You can still use `?cardUID=...` later if you want to test the NFC entry flow.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/15 text-warning text-xs font-medium uppercase tracking-wider mb-4">
            <Shield size={14} />
            Limited Access View
          </div>
          <h1 className="text-3xl lg:text-4xl font-display text-foreground mb-1">Patient Information</h1>
          <p className="text-sm text-muted-foreground">NFC Quick Access</p>
        </div>

        {/* Patient Card */}
        <div className="medical-card mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-col items-center text-center mb-6">
            <PatientAvatar name={patient.name} photo={patient.photo} size="xl" />
            <h2 className="text-2xl font-display text-foreground mt-4">{patient.name}</h2>
            <p className="text-muted-foreground">{patient.age} years old • {patient.gender}</p>
          </div>

          <div className="space-y-3">
            <InfoCard
              icon={<Droplets size={18} />}
              label="Blood Group"
              value={patient.bloodGroup}
              variant="highlight"
            />

            <InfoCard
              icon={<AlertTriangle size={18} />}
              label="Known Allergies"
              value={
                patient.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {patient.allergies.map((allergy, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium"
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

            <InfoCard
              icon={<Phone size={18} />}
              label="Emergency Contact"
              value={
                <div>
                  <span className="font-medium">{patient.emergencyContact.name}</span>
                  <span className="text-muted-foreground text-sm"> ({patient.emergencyContact.relation})</span>
                  <p className="text-sm text-primary">{patient.emergencyContact.phone}</p>
                </div>
              }
            />
          </div>
        </div>

        {/* Emergency Indicator */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/20 mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
          <p className="text-sm text-destructive font-medium">Emergency services notified if emergency access is triggered</p>
        </div>

        {/* Actions */}
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <Button
            variant="medical"
            size="full"
            onClick={() => navigate('/role-selection')}
            className="group"
          >
            <User size={18} />
            Select Access Role
            <ChevronRight size={18} className="ml-auto group-hover:translate-x-1 transition-transform" />
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Medical professionals must authenticate to access full records
          </p>
        </div>
      </div>
    </div>
  );
}
