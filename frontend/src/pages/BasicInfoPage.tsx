import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Droplets, AlertTriangle, Phone, User, ChevronRight, LoaderCircle, KeyRound, Eye, EyeOff, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PatientAvatar } from '@/components/PatientAvatar';
import { InfoCard } from '@/components/InfoCard';
import { useApp } from '@/contexts/AppContext';

export default function BasicInfoPage() {
  const navigate = useNavigate();
  const { patient, isInitializing, isLoadingPatient, loginWithPatientPassword } = useApp();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handlePatientPassword = async () => {
    if (!password.trim()) {
      toast.error('Enter the uploader or viewer password');
      return;
    }

    try {
      setIsAuthenticating(true);
      const role = await loginWithPatientPassword(password);
      toast.success(role === 'doctor' ? 'Uploader access granted' : 'Viewer access granted');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

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
          <h1 className="text-2xl font-display text-foreground mb-3">Start Patient Access</h1>
          <p className="text-muted-foreground mb-6">
            Register a new patient, find an old patient, or tap an NFC card to load the limited patient information first.
          </p>
          <div className="space-y-3">
            <Button
              variant="medical"
              size="full"
              onClick={() => navigate('/register-patient')}
              className="group"
            >
              <UserPlus size={18} />
              New Patient Registration
              <ChevronRight size={18} className="ml-auto group-hover:translate-x-1 transition-transform" />
            </Button>

            <Button
              variant="outline"
              size="full"
              onClick={() => navigate('/patient-lookup')}
              className="group"
            >
              <User size={18} />
              Old Patient Lookup
              <ChevronRight size={18} className="ml-auto group-hover:translate-x-1 transition-transform" />
            </Button>

            <p className="text-xs text-muted-foreground">
              NFC links can open this page with `?cardUID=...`.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const emergencyPhone = patient.emergencyContact.phone;
  const emergencyPhoneHref = emergencyPhone.replace(/[^\d+]/g, '');
  const canCallEmergencyContact = emergencyPhoneHref.length >= 7;

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
              icon={<User size={18} />}
              label="Mobile Number"
              value={patient.phone || 'Not available'}
            />

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
                  {canCallEmergencyContact ? (
                    <a href={`tel:${emergencyPhoneHref}`} className="block text-sm text-primary hover:underline">
                      {emergencyPhone}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">No emergency number available</p>
                  )}
                </div>
              }
            />
          </div>
        </div>

        <div className="medical-card space-y-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div>
            <h3 className="font-display text-lg text-foreground">Enter Access Password</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Uploader and viewer passwords open the same dashboard with the correct permissions.
            </p>
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handlePatientPassword();
                }
              }}
              placeholder="Uploader or viewer password"
              className="input-medical pr-12 text-lg"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <Button
            variant="medical"
            size="full"
            onClick={handlePatientPassword}
            disabled={isAuthenticating}
            className="group"
          >
            {isAuthenticating ? <LoaderCircle size={18} className="animate-spin" /> : <KeyRound size={18} />}
            {isAuthenticating ? 'Verifying...' : 'Open Dashboard'}
            <ChevronRight size={18} className="ml-auto group-hover:translate-x-1 transition-transform" />
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Uploader can add records. Viewer gets read-only access.
          </p>
        </div>
      </div>
    </div>
  );
}
