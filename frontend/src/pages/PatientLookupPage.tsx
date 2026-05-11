import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Search, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';

export default function PatientLookupPage() {
  const navigate = useNavigate();
  const { resolvePatientContext } = useApp();
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!identifier.trim()) {
      toast.error('Enter a patient email or patient ID');
      return;
    }

    try {
      setIsLoading(true);
      const patient = await resolvePatientContext(identifier.trim());
      toast.success(`Patient selected: ${patient.fullName}`);
      navigate('/patient-access');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to find patient');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
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
            <h1 className="text-3xl lg:text-4xl font-display text-foreground">Find Patient</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Load an existing patient before entering the access password
            </p>
          </div>
        </div>

        <div className="medical-card space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-medium uppercase tracking-wider">
            <Search size={14} />
            Manual Patient Selection
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-3">
              Patient email or patient ID
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="patient@example.com or 69985ce7a1f0018afce32651"
              className="input-medical text-lg"
            />
            <p className="text-xs text-muted-foreground mt-3">
              Email lookup works when the patient record has an email saved. Patient ID works immediately with existing records.
            </p>
          </div>

          <Button
            variant="medical"
            size="full"
            onClick={handleContinue}
            disabled={isLoading}
            className="group"
          >
            <User size={18} />
            {isLoading ? 'Finding Patient...' : 'Load Patient'}
            <ChevronRight size={18} className="ml-auto group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
}
