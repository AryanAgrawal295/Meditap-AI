import { useNavigate } from 'react-router-dom';
import { ChevronRight, User, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PatientStartPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg medical-card text-center">
        <h1 className="text-2xl font-display text-foreground mb-3">Start Patient Access</h1>
        <p className="text-muted-foreground mb-6">
          Select whether this is a new patient registration or an old patient lookup.
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
        </div>
      </div>
    </div>
  );
}
