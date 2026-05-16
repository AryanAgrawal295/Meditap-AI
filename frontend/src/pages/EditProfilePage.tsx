import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, Calendar, Droplets, Phone, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PatientAvatar } from '@/components/PatientAvatar';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { patient, updatePatientProfile } = useApp();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: patient?.name || '',
    dateOfBirth: patient?.dateOfBirth || '',
    gender: patient?.gender || '',
    bloodGroup: patient?.bloodGroup || '',
    allergies: patient?.allergies.join(', ') || '',
    emergencyContactName: patient?.emergencyContact.name || '',
    emergencyContactRelation: patient?.emergencyContact.relation || '',
    emergencyContactPhone: patient?.emergencyContact.phone || '',
  });

  if (!patient) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      await updatePatientProfile({
        name: formData.name,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        allergies: formData.allergies
          .split(',')
          .map((allergy) => allergy.trim())
          .filter(Boolean),
        emergencyContact: {
          name: formData.emergencyContactName,
          relation: formData.emergencyContactRelation,
          phone: formData.emergencyContactPhone,
        },
      });

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
      navigate('/profile');
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Could not update the profile.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="font-display text-2xl lg:text-3xl text-foreground">Edit Profile</h1>
            <p className="text-muted-foreground text-sm mt-1">Update patient information</p>
          </div>
        </div>

        <div className="space-y-6 pb-20 lg:pb-0">
          {/* Avatar Section */}
          <div className="medical-card text-center animate-slide-up">
            <PatientAvatar name={formData.name} photo={patient.photo} size="xl" className="mx-auto mb-4" />
            <Button variant="secondary" size="sm">
              Change Photo
            </Button>
          </div>

          {/* Personal Information */}
          <div className="medical-card space-y-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h3 className="font-display text-lg text-foreground flex items-center gap-2">
              <User size={18} className="text-primary" />
              Personal Information
            </h3>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
                    <Calendar size={14} />
                    Date of Birth
                  </Label>
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Input
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    placeholder="Enter gender"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bloodGroup" className="flex items-center gap-2">
                  <Droplets size={14} />
                  Blood Group
                </Label>
                <Input
                  id="bloodGroup"
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  placeholder="e.g., A+, B-, O+"
                />
              </div>
            </div>
          </div>

          {/* Allergies */}
          <div className="medical-card space-y-4 animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <h3 className="font-display text-lg text-foreground flex items-center gap-2">
              <AlertTriangle size={18} className="text-destructive" />
              Allergies
            </h3>

            <div className="space-y-2">
              <Label htmlFor="allergies">Known Allergies (comma-separated)</Label>
              <Input
                id="allergies"
                name="allergies"
                value={formData.allergies}
                onChange={handleChange}
                placeholder="e.g., Penicillin, Peanuts, Latex"
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="medical-card space-y-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="font-display text-lg text-foreground flex items-center gap-2">
              <Phone size={18} className="text-destructive" />
              Emergency Contact
            </h3>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Contact Name</Label>
                <Input
                  id="emergencyContactName"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  placeholder="Enter contact name"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactRelation">Relationship</Label>
                  <Input
                    id="emergencyContactRelation"
                    name="emergencyContactRelation"
                    value={formData.emergencyContactRelation}
                    onChange={handleChange}
                    placeholder="e.g., Spouse, Parent"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContactPhone">Phone Number</Label>
                  <Input
                    id="emergencyContactPhone"
                    name="emergencyContactPhone"
                    value={formData.emergencyContactPhone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 animate-slide-up" style={{ animationDelay: '0.25s' }}>
            <Button variant="secondary" className="flex-1" onClick={() => navigate('/profile')}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              <Save size={16} />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
