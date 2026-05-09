import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { LayoutDashboard, History, Pill, Bot, User, LogOut, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/medical-history', icon: History, label: 'Medical History' },
  { path: '/prescriptions', icon: Pill, label: 'Adherence' },
  { path: '/ai-assistant', icon: Bot, label: 'AI Assistant' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isInitializing, role, logout } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    doctor: 'Doctor',
    receptionist: 'Receptionist',
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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-card border-r border-border p-6 sticky top-0 h-screen overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-lg">M</span>
          </div>
          <div>
            <h1 className="font-display font-semibold text-xl text-foreground">NFC Next Level</h1>
            {role && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[role]}`}>
                {roleLabels[role]}
              </span>
            )}
          </div>
        </div>

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
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-medical'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon size={20} />
                <span className="font-medium">{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
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
        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
