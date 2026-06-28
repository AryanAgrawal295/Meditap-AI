import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { History, Pill, Bot, User, LogOut, Menu, X, PanelLeftClose, PanelLeftOpen, TrendingUp, MessageSquare, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SmartSearch } from '@/components/SmartSearch';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/medical-history', icon: History, label: 'Medical History' },
  { path: '/prescriptions', icon: Pill, label: 'Adherence' },
  { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
  { path: '/chat', icon: MessageSquare, label: 'Messages' },
  { path: '/reports', icon: FileText, label: 'Reports' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isInitializing, role, logout } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isInitializing, navigate]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (isInitializing || !isAuthenticated) return null;

  const roleLabels = {
    doctor: 'Uploader',
    receptionist: 'Viewer',
    emergency: 'Emergency Staff',
  };

  const roleColors = {
    doctor: 'bg-primary/10 text-primary',
    receptionist: 'bg-accent text-accent-foreground',
    emergency: 'bg-destructive/10 text-destructive',
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const openAiAssistant = () => {
    navigate('/ai-assistant');
  };

  const aiAssistantButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={location.pathname === '/ai-assistant' ? 'default' : 'ghost'}
          size="icon"
          className="h-9 w-9"
          onClick={openAiAssistant}
          aria-label="AI Assistant"
        >
          <Bot size={18} />
        </Button>
      </TooltipTrigger>
      <TooltipContent align="end">
        AI Assistant
      </TooltipContent>
    </Tooltip>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-card border-r border-border sticky top-0 h-screen overflow-y-auto transition-all duration-200",
          sidebarMinimized ? "w-20 p-4" : "w-72 p-6",
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center gap-3 mb-8", sidebarMinimized && "justify-center")}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-lg">M</span>
          </div>
          {!sidebarMinimized && (
          <div>
            <h1 className="font-display font-semibold text-xl text-foreground">NFC Next Level</h1>
            {role && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[role]}`}>
                {roleLabels[role]}
              </span>
            )}
          </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSidebarMinimized((value) => !value)}
          className={cn(
            "mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground",
            !sidebarMinimized && "self-start",
          )}
          title={sidebarMinimized ? "Expand sidebar" : "Minimize sidebar"}
        >
          {sidebarMinimized ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
	                className={cn(
	                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left',
                    sidebarMinimized && 'justify-center px-0',
	                  isActive
	                    ? 'bg-primary text-primary-foreground shadow-medical'
	                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
	                )}
                  title={sidebarMinimized ? label : undefined}
	              >
	                <Icon size={20} />
	                {!sidebarMinimized && <span className="font-medium">{label}</span>}
	              </button>
            );
          })}
        </nav>

        {/* Logout */}
	        <button
	          onClick={handleLogout}
	          className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200",
              sidebarMinimized && "justify-center px-0",
            )}
            title={sidebarMinimized ? "Logout" : undefined}
	        >
	          <LogOut size={20} />
	          {!sidebarMinimized && <span className="font-medium">Logout</span>}
	        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar for Mobile */}
        <header className="lg:hidden sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <span className="text-primary-foreground font-display font-bold text-sm">M</span>
              </div>
              <div>
                <h1 className="font-display font-semibold text-foreground">NFC Next Level</h1>
                {role && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[role]}`}>
                    {roleLabels[role]}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {aiAssistantButton}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive">
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="absolute top-full left-0 right-0 bg-card border-b border-border shadow-lg z-50">
              <nav className="p-2 space-y-1">
                {navItems.map(({ path, icon: Icon, label }) => {
                  const isActive = location.pathname === path;
                  return (
                    <button
                      key={path}
                      onClick={() => {
                        navigate(path);
                        setMobileMenuOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Icon size={20} />
                      <span className="font-medium">{label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 flex flex-col min-h-screen">
          {/* Desktop Top Bar with Search and Theme */}
          <header className="hidden lg:flex sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border items-center justify-between px-8 py-3 gap-4">
            <SmartSearch />
            <div className="flex items-center gap-2">
              {aiAssistantButton}
              <ThemeToggle />
            </div>
          </header>

          <div className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
