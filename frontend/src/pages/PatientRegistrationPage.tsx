import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Eye, EyeOff, Save, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';

export default function PatientRegistrationPage() {
  const navigate = useNavigate();
  const { registerPatient } = useApp();
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'other',
    bloodGroup: '',
    allergies: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: '',
    uploaderPassword: '',
    viewerPassword: '',
  });

  const setField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !formData.fullName.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      !formData.uploaderPassword ||
      !formData.viewerPassword
    ) {
      toast.error('Fill name, email, mobile number, and both passwords');
      return;
    }

    if (formData.uploaderPassword === formData.viewerPassword) {
      toast.error('Uploader and viewer passwords must be different');
      return;
    }

    try {
      setIsLoading(true);
      await registerPatient({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup.trim(),
        allergies: formData.allergies,
        emergencyContact: {
          name: formData.emergencyName.trim(),
          phone: formData.emergencyPhone.trim(),
          relation: formData.emergencyRelation.trim(),
        },
        uploaderPassword: formData.uploaderPassword,
        viewerPassword: formData.viewerPassword,
      });
      toast.success('Patient registered');
      navigate('/patient-access');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="shrink-0">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl lg:text-4xl font-display text-foreground">New Patient</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Register basic details and set uploader/viewer passwords
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="medical-card space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-medium uppercase tracking-wider">
            <UserPlus size={14} />
            Patient Registration
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-sm text-muted-foreground">Full name *</span>
              <input
                className="input-medical"
                value={formData.fullName}
                onChange={(event) => setField('fullName', event.target.value)}
                placeholder="Patient name"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm text-muted-foreground">Email *</span>
              <input
                type="email"
                className="input-medical"
                value={formData.email}
                onChange={(event) => setField('email', event.target.value)}
                placeholder="patient@example.com"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm text-muted-foreground">Mobile number *</span>
              <input
                className="input-medical"
                value={formData.phone}
                onChange={(event) => setField('phone', event.target.value)}
                placeholder="Mobile number"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm text-muted-foreground">Date of birth</span>
              <input
                type="date"
                className="input-medical"
                value={formData.dateOfBirth}
                onChange={(event) => setField('dateOfBirth', event.target.value)}
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm text-muted-foreground">Gender</span>
              <select
                className="input-medical"
                value={formData.gender}
                onChange={(event) => setField('gender', event.target.value)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="block text-sm text-muted-foreground">Blood group</span>
              <input
                className="input-medical"
                value={formData.bloodGroup}
                onChange={(event) => setField('bloodGroup', event.target.value)}
                placeholder="O+, A-, AB+"
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="block text-sm text-muted-foreground">Allergic to</span>
            <input
              className="input-medical"
              value={formData.allergies}
              onChange={(event) => setField('allergies', event.target.value)}
              placeholder="Comma separated allergies"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-2">
              <span className="block text-sm text-muted-foreground">Emergency contact</span>
              <input
                className="input-medical"
                value={formData.emergencyName}
                onChange={(event) => setField('emergencyName', event.target.value)}
                placeholder="Contact name"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm text-muted-foreground">Emergency phone</span>
              <input
                className="input-medical"
                value={formData.emergencyPhone}
                onChange={(event) => setField('emergencyPhone', event.target.value)}
                placeholder="Phone number"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm text-muted-foreground">Relation</span>
              <input
                className="input-medical"
                value={formData.emergencyRelation}
                onChange={(event) => setField('emergencyRelation', event.target.value)}
                placeholder="Parent, spouse, friend"
              />
            </label>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg text-foreground">Access Passwords</h2>
                <p className="text-sm text-muted-foreground">Dashboard role is chosen by the password entered after NFC/lookup.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setShowPasswords(!showPasswords)}>
                {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-sm text-muted-foreground">Uploader password *</span>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  className="input-medical"
                  value={formData.uploaderPassword}
                  onChange={(event) => setField('uploaderPassword', event.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </label>

              <label className="space-y-2">
                <span className="block text-sm text-muted-foreground">Viewer password *</span>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  className="input-medical"
                  value={formData.viewerPassword}
                  onChange={(event) => setField('viewerPassword', event.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </label>
            </div>
          </div>

          <Button variant="medical" size="full" disabled={isLoading}>
            <Save size={18} />
            {isLoading ? 'Registering...' : 'Register Patient'}
            <ChevronRight size={18} className="ml-auto" />
          </Button>
        </form>
      </div>
    </div>
  );
}
