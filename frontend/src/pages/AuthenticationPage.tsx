import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Smartphone, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type AuthMethod = 'otp' | 'password';

export default function AuthenticationPage() {
  const navigate = useNavigate();
  const { role, loginWithPassword, requestOtp, verifyOtp } = useApp();
  const [authMethod, setAuthMethod] = useState<AuthMethod>('otp');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const roleLabels = {
    doctor: 'Uploader',
    receptionist: 'Viewer',
    emergency: 'Emergency Staff',
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async () => {
    setIsLoading(true);

    try {
      if (!email.trim()) {
        toast.error('Enter your email address');
        return;
      }

      if (authMethod === 'otp') {
        const otpValue = otp.join('');

        if (otpValue.length !== 6) {
          toast.error('Please enter complete OTP');
          return;
        }

        await verifyOtp(email.trim(), otpValue);
        toast.success('Authentication successful');
        navigate('/dashboard');
      } else {
        if (!password.trim()) {
          toast.error('Enter your password');
          return;
        }

        await loginWithPassword(email.trim(), password);
        toast.success('Authentication successful');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email.trim()) {
      toast.error('Enter your email address first');
      return;
    }

    try {
      setIsLoading(true);
      await requestOtp(email.trim());
      setOtp(['', '', '', '', '', '']);
      setOtpSent(true);
      toast.success('OTP sent to your registered email');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send OTP');
    } finally {
      setIsLoading(false);
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
            onClick={() => navigate('/role-selection')}
            className="shrink-0"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl lg:text-4xl font-display text-foreground">Verify Identity</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Accessing as <span className="text-primary font-medium">{role && roleLabels[role]}</span>
            </p>
          </div>
        </div>

        {/* Auth Method Toggle */}
        <div className="flex gap-2 p-1 bg-secondary rounded-xl mb-8">
          <button
            onClick={() => setAuthMethod('otp')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all',
              authMethod === 'otp' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
            )}
          >
            <Smartphone size={18} />
            OTP
          </button>
          <button
            onClick={() => setAuthMethod('password')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all',
              authMethod === 'password' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
            )}
          >
            <KeyRound size={18} />
            Password
          </button>
        </div>

        {/* Auth Form */}
        <div className="medical-card mb-6 animate-scale-in">
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-2">Registered email</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@hospital.com"
              className="input-medical"
            />
          </div>

          {authMethod === 'otp' ? (
            <div>
              <p className="text-center text-muted-foreground mb-6">
                Enter the 6-digit code sent to your registered email
              </p>
              <div className="flex justify-center gap-3 mb-6">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-14 h-16 text-center text-2xl font-semibold rounded-xl border-2 border-input bg-background focus:border-primary focus:outline-none transition-colors"
                  />
                ))}
              </div>
              <button
                onClick={handleResendOtp}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 w-full text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <RefreshCw size={16} />
                {otpSent ? 'Resend OTP' : 'Send OTP'}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-center text-muted-foreground mb-6">
                Enter your role-specific password
              </p>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
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
              <button
                onClick={() => toast.info('Password reset link sent to your registered email')}
                className="mt-3 text-sm text-primary hover:text-primary/80 transition-colors w-full text-right"
              >
                Forgot Password?
              </button>
            </div>
          )}
        </div>

        {/* Verify Button */}
        <Button
          variant="medical"
          size="full"
          onClick={handleVerify}
          disabled={isLoading}
        >
          {isLoading ? (
            <RefreshCw size={18} className="animate-spin" />
          ) : (
            <>
              <KeyRound size={18} />
              Verify & Continue
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          All access is logged for security purposes
        </p>
      </div>
    </div>
  );
}
