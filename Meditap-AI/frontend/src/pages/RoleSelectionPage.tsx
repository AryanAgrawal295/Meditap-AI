import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Eye, ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { UserRole } from '@/types/patient';
import { cn } from '@/lib/utils';

const roles = [
  {
    id: 'doctor' as UserRole,
    title: 'Uploader',
    description: 'Full access to upload, edit medical history, prescriptions, and patient data',
    icon: Upload,
    color: 'primary',
  },
  {
    id: 'receptionist' as UserRole,
    title: 'Viewer',
    description: 'Read-only access to view medical records and patient information',
    icon: Eye,
    color: 'accent',
  },
];

export default function RoleSelectionPage() {
  const navigate = useNavigate();
  const { setRole } = useApp();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleContinue = () => {
    if (selectedRole) {
      setRole(selectedRole);
      navigate('/authentication');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl lg:text-4xl font-display text-foreground">Choose Access Role</h1>
            <p className="text-sm text-muted-foreground mt-1">Select your role to continue</p>
          </div>
        </div>

        {/* Role Cards */}
        <div className="space-y-4 mb-8">
          {roles.map((role, index) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;

            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={cn(
                  'role-card w-full text-left animate-slide-up',
                  isSelected && 'selected'
                )}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'w-14 h-14 rounded-xl flex items-center justify-center transition-colors',
                      role.color === 'primary' && 'bg-primary/10 text-primary',
                      role.color === 'accent' && 'bg-accent text-accent-foreground',
                      role.color === 'destructive' && 'bg-destructive/10 text-destructive',
                      isSelected && role.color === 'primary' && 'bg-primary text-primary-foreground',
                      isSelected && role.color === 'accent' && 'bg-primary text-primary-foreground',
                      isSelected && role.color === 'destructive' && 'bg-destructive text-destructive-foreground'
                    )}
                  >
                    <Icon size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-xl text-foreground mb-1">{role.title}</h3>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                      isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                    )}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Continue Button */}
        <Button
          variant="medical"
          size="full"
          onClick={handleContinue}
          disabled={!selectedRole}
          className="group"
        >
          Continue to Authentication
          <ChevronRight size={18} className="ml-auto group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
}
