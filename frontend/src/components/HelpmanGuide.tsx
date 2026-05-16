import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  HelpCircle,
  LayoutDashboard,
  MapPinned,
  MessageCircle,
  Pause,
  Pill,
  Play,
  Sparkles,
  Square,
  TrendingUp,
  UploadCloud,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type DemoStep = {
  title: string;
  path: string;
  icon: LucideIcon;
  target: string;
  shape?: 'circle' | 'rect';
  explain: string;
  doThis: string;
};

type SpotlightShape = {
  shape: 'circle' | 'rect';
  centerX: number;
  centerY: number;
  radius: number;
  top: number;
  left: number;
  width: number;
  height: number;
};

const demoSteps: DemoStep[] = [
  {
    title: 'Main dashboard',
    path: '/dashboard?helpmanDemo=1',
    icon: LayoutDashboard,
    target: 'main h1, main h2, main h3',
    explain: 'This is the main health board.',
    doThis: 'See patient summary, recent records, and quick health status in one place.',
  },
  {
    title: 'Side menu',
    path: '/dashboard?helpmanDemo=1',
    icon: MapPinned,
    target: 'aside',
    shape: 'rect',
    explain: 'This menu is the website map.',
    doThis: 'Use these buttons to move between health pages.',
  },
  {
    title: 'Medical history',
    path: '/medical-history?helpmanDemo=1',
    icon: UploadCloud,
    target: 'main h1',
    explain: 'This page stores old medical papers.',
    doThis: 'Read past visits, uploaded reports, doctor notes, and diagnosis details.',
  },
  {
    title: 'Medicines',
    path: '/prescriptions?helpman=active&helpmanDemo=1',
    icon: Pill,
    target: 'main h1',
    explain: 'This page tracks medicines.',
    doThis: 'Use this page to manage medicine schedules, dose timing, and adherence.',
  },
  {
    title: 'Merged schedule',
    path: '/prescriptions?helpman=active&helpmanDemo=1',
    icon: Pill,
    target: '[data-helpman="active-together"]',
    shape: 'rect',
    explain: 'This is the merged ongoing schedule entry.',
    doThis: 'Click Active Together to see all ongoing schedules in one combined view while separate schedules stay below.',
  },
  {
    title: 'Adherence summary',
    path: '/prescriptions?helpman=active&helpmanDemo=1',
    icon: CheckCircle2,
    target: '[data-helpman="adherence-summary"]',
    shape: 'rect',
    explain: 'These cards show medicine progress.',
    doThis: 'Check adherence percentage, taken doses, pending doses, and refill alerts quickly.',
  },
  {
    title: 'Verify dose',
    path: '/prescriptions?helpman=active&helpmanDemo=1',
    icon: Camera,
    target: '[data-helpman="dose-actions"], [data-helpman="verify-dose"], [data-helpman="adherence-timeline"]',
    shape: 'rect',
    explain: 'Verify checks the medicine with the camera.',
    doThis: 'The schedule is opened here so Verify appears with the other dose actions.',
  },
  {
    title: 'Done button',
    path: '/prescriptions?helpman=active&helpmanDemo=1',
    icon: CheckCircle2,
    target: '[data-helpman="dose-actions"], [data-helpman="done-dose"], [data-helpman="adherence-timeline"]',
    shape: 'rect',
    explain: 'Done marks the medicine as taken.',
    doThis: 'The open schedule row shows Done beside Verify, Missed, and Reschedule.',
  },
  {
    title: 'Missed button',
    path: '/prescriptions?helpman=active&helpmanDemo=1',
    icon: XCircle,
    target: '[data-helpman="dose-actions"], [data-helpman="missed-dose"], [data-helpman="adherence-timeline"]',
    shape: 'rect',
    explain: 'Missed marks a dose that was not taken.',
    doThis: 'Use it when the patient skipped or forgot that dose.',
  },
  {
    title: 'Reschedule',
    path: '/prescriptions?helpman=active&helpmanDemo=1',
    icon: Clock,
    target: '[data-helpman="dose-actions"], [data-helpman="reschedule-dose"], [data-helpman="adherence-timeline"]',
    shape: 'rect',
    explain: 'Reschedule changes the medicine time.',
    doThis: 'The open schedule row shows Reschedule so timing can be corrected.',
  },
  {
    title: 'Next medicines',
    path: '/prescriptions?helpman=active&helpmanDemo=1',
    icon: Clock,
    target: '[data-helpman="next-to-take"]',
    shape: 'rect',
    explain: 'Next to Take shows upcoming pending medicines.',
    doThis: 'Look here to know which medicine is coming next across ongoing schedules.',
  },
  {
    title: 'Medicine list',
    path: '/prescriptions?helpman=active&helpmanDemo=1',
    icon: Pill,
    target: '[data-helpman="medicine-list"]',
    shape: 'rect',
    explain: 'This list shows the medicines in the selected view.',
    doThis: 'Open it to see dosage, timing, tracked doses, refill prediction, and original schedule label.',
  },
  {
    title: 'AI assistant',
    path: '/ai-assistant?helpmanDemo=1',
    icon: Bot,
    target: 'main h1',
    explain: 'This page answers questions about the health record.',
    doThis: 'Type a simple question about reports, medicines, or patient history.',
  },
  {
    title: 'Appointments',
    path: '/appointments?helpmanDemo=1',
    icon: Calendar,
    target: 'main h1',
    explain: 'This page is for doctor visits.',
    doThis: 'Check upcoming appointments and visit details.',
  },
  {
    title: 'Analytics',
    path: '/analytics?helpmanDemo=1',
    icon: TrendingUp,
    target: 'main h1',
    explain: 'This page turns health data into charts.',
    doThis: 'Look at trends to understand changes quickly.',
  },
  {
    title: 'Messages',
    path: '/chat?helpmanDemo=1',
    icon: MessageCircle,
    target: 'main h1',
    explain: 'This page is for conversations.',
    doThis: 'Read and send updates about the patient.',
  },
  {
    title: 'Reports',
    path: '/reports?helpmanDemo=1',
    icon: FileText,
    target: 'main h1',
    explain: 'This page makes shareable summaries.',
    doThis: 'Review the patient summary and export the report when ready.',
  },
  {
    title: 'Profile',
    path: '/profile?helpmanDemo=1',
    icon: User,
    target: 'main h1',
    explain: 'This page shows basic patient details.',
    doThis: 'Check name, blood group, allergies, and emergency contact.',
  },
];

function getInitialSpotlight(): SpotlightShape {
  const radius = Math.min(120, Math.min(window.innerWidth, window.innerHeight) / 5);

  return {
    shape: 'circle',
    centerX: window.innerWidth / 2,
    centerY: window.innerHeight / 2,
    radius,
    top: window.innerHeight / 2 - radius,
    left: window.innerWidth / 2 - radius,
    width: radius * 2,
    height: radius * 2,
  };
}

function getTargetElement(selector: string) {
  return document.querySelector<HTMLElement>(selector) ||
    document.querySelector<HTMLElement>('main h1, main h2, main h3') ||
    document.querySelector<HTMLElement>('main') ||
    document.body;
}

function getTargetSpotlight(selector: string, shape: SpotlightShape['shape'] = 'circle'): SpotlightShape {
  const target = getTargetElement(selector);
  const rect = target.getBoundingClientRect();
  const padding = shape === 'rect' ? 16 : 12;
  const maxWidth = window.innerWidth - 32;
  const maxHeight = window.innerHeight - 32;
  const width = Math.min(rect.width + padding * 2, maxWidth);
  const height = Math.min(rect.height + padding * 2, maxHeight);
  const left = Math.max(16, Math.min(rect.left - padding, window.innerWidth - width - 16));
  const top = Math.max(16, Math.min(rect.top - padding, window.innerHeight - height - 16));
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const diagonal = Math.sqrt(rect.width ** 2 + rect.height ** 2);
  const maxRadius = Math.min(220, (window.innerWidth - 32) / 2, (window.innerHeight - 32) / 2);
  const naturalRadius = diagonal / 2 + 18;

  return {
    shape,
    centerX,
    centerY,
    radius: Math.max(42, Math.min(naturalRadius, maxRadius)),
    top,
    left,
    width,
    height,
  };
}

export function HelpmanGuide() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isTouring, setIsTouring] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightShape>(getInitialSpotlight);

  const currentStep = demoSteps[activeStep];
  const StepIcon = currentStep.icon;
  const progress = Math.round(((activeStep + 1) / demoSteps.length) * 100);

  const refreshSpotlight = useCallback(() => {
    setSpotlight(getTargetSpotlight(currentStep.target, currentStep.shape));
  }, [currentStep.shape, currentStep.target]);

  const scrollToTarget = useCallback(() => {
    const target = getTargetElement(currentStep.target);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }, [currentStep.target]);

  const startDemo = () => {
    window.sessionStorage.setItem('meditap-helpman-demo', '1');
    window.dispatchEvent(new Event('meditap:helpman-demo'));
    setIsOpen(true);
    setIsTouring(true);
    setIsPaused(false);
    setActiveStep(0);
    navigate(demoSteps[0].path);
  };

  const stopDemo = useCallback(() => {
    window.sessionStorage.removeItem('meditap-helpman-demo');
    const params = new URLSearchParams(location.search);
    params.delete('helpmanDemo');
    params.delete('helpman');
    const nextSearch = params.toString();
    navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true });
    setIsTouring(false);
    setIsPaused(false);
    setIsOpen(false);
    window.setTimeout(() => {
      window.dispatchEvent(new Event('meditap:helpman-demo'));
    }, 0);
  }, [location.pathname, location.search, navigate]);

  const goToStep = useCallback((stepIndex: number) => {
    const nextStep = Math.min(Math.max(stepIndex, 0), demoSteps.length - 1);
    setActiveStep(nextStep);
    navigate(demoSteps[nextStep].path);
  }, [navigate]);

  const goNext = useCallback(() => {
    if (activeStep === demoSteps.length - 1) {
      stopDemo();
      return;
    }

    goToStep(activeStep + 1);
  }, [activeStep, goToStep, stopDemo]);

  useEffect(() => {
    if (!isTouring) return undefined;

    const scrollFrame = window.setTimeout(scrollToTarget, 120);
    const firstFrame = window.setTimeout(refreshSpotlight, 420);
    const secondFrame = window.setTimeout(refreshSpotlight, 700);
    window.addEventListener('resize', refreshSpotlight);
    window.addEventListener('scroll', refreshSpotlight, true);

    return () => {
      window.clearTimeout(scrollFrame);
      window.clearTimeout(firstFrame);
      window.clearTimeout(secondFrame);
      window.removeEventListener('resize', refreshSpotlight);
      window.removeEventListener('scroll', refreshSpotlight, true);
    };
  }, [isTouring, refreshSpotlight, scrollToTarget, activeStep]);

  useEffect(() => {
    if (!isTouring || isPaused) return undefined;

    const timer = window.setTimeout(goNext, 5200);
    return () => window.clearTimeout(timer);
  }, [goNext, isPaused, isTouring]);

  return (
    <>
      {isTouring && (
        <div className="fixed inset-0 z-[90] pointer-events-none">
          {spotlight.shape === 'circle' ? (
            <div
              className="absolute inset-0 transition-all duration-500"
              style={{
                background: `radial-gradient(circle at ${spotlight.centerX}px ${spotlight.centerY}px, transparent 0, transparent ${spotlight.radius}px, rgba(2,6,23,0.56) ${spotlight.radius + 2}px)`,
              }}
            />
          ) : (
            <>
              <div
                className="absolute left-0 right-0 top-0 bg-slate-950/55 transition-all duration-500"
                style={{ height: spotlight.top }}
              />
              <div
                className="absolute left-0 bg-slate-950/55 transition-all duration-500"
                style={{ top: spotlight.top, width: spotlight.left, height: spotlight.height }}
              />
              <div
                className="absolute bg-slate-950/55 transition-all duration-500"
                style={{
                  top: spotlight.top,
                  left: spotlight.left + spotlight.width,
                  right: 0,
                  height: spotlight.height,
                }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 bg-slate-950/55 transition-all duration-500"
                style={{ top: spotlight.top + spotlight.height }}
              />
            </>
          )}
          <div
            className="absolute border-2 border-white bg-transparent shadow-[0_0_38px_rgba(20,184,166,0.75)] transition-all duration-500"
            style={spotlight.shape === 'circle'
              ? {
                  borderRadius: '9999px',
                  top: spotlight.centerY - spotlight.radius,
                  left: spotlight.centerX - spotlight.radius,
                  width: spotlight.radius * 2,
                  height: spotlight.radius * 2,
                }
              : {
                  borderRadius: '14px',
                  top: spotlight.top,
                  left: spotlight.left,
                  width: spotlight.width,
                  height: spotlight.height,
                }}
          />
        </div>
      )}

      <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-3">
        {isOpen && (
          <section className="w-[min(calc(100vw-2rem),25rem)] overflow-hidden rounded-2xl border border-white/20 bg-card/95 text-card-foreground shadow-2xl backdrop-blur-xl">
            <div className="bg-gradient-to-br from-primary via-primary to-emerald-700 p-4 text-primary-foreground">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h2 className="font-sans text-lg font-semibold tracking-normal">Helpman Demo</h2>
                    <p className="text-sm text-primary-foreground/80">Auto website walkthrough</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={stopDemo}
                  className="rounded-xl p-2 text-primary-foreground/80 transition-colors hover:bg-white/15 hover:text-primary-foreground"
                  aria-label="Close Helpman demo"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {!isTouring ? (
              <div className="p-5">
                <div className="mb-5 rounded-2xl bg-accent p-4">
                  <p className="text-sm font-semibold text-accent-foreground">Click Start Demo once.</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Helpman will start from the dashboard, move through the website by itself, shine a circular spotlight on each feature, and explain it in easy words.
                  </p>
                </div>
                <Button type="button" variant="medical" size="full" onClick={startDemo}>
                  <Play size={18} />
                  Start Demo
                </Button>
              </div>
            ) : (
              <div className="p-5">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <StepIcon size={22} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Step {activeStep + 1} of {demoSteps.length}
                    </p>
                    <h3 className="mt-1 font-sans text-xl font-semibold tracking-normal">{currentStep.title}</h3>
                    <p className="mt-2 text-base font-semibold leading-6 text-foreground">{currentStep.explain}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{currentStep.doThis}</p>
                  </div>
                </div>

                <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>

                <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={() => goToStep(activeStep - 1)}
                    disabled={activeStep === 0}
                    aria-label="Previous demo step"
                  >
                    <ChevronLeft size={18} />
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setIsPaused((value) => !value)}>
                    {isPaused ? <Play size={18} /> : <Pause size={18} />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button type="button" variant="medical" size="icon" onClick={goNext} aria-label="Next demo step">
                    <ChevronRight size={18} />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={stopDemo} aria-label="End demo">
                    <Square size={16} />
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        <button
          type="button"
          onClick={() => (isOpen ? stopDemo() : setIsOpen(true))}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={isOpen ? 'Close Helpman' : 'Open Helpman'}
          title="Helpman"
        >
          {isOpen ? <X size={24} /> : <HelpCircle size={26} />}
        </button>
      </div>
    </>
  );
}
