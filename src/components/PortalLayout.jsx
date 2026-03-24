import { Outlet, Link, useLocation } from 'react-router-dom';
import { FileText, Building2, Shield, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { path: '/', label: 'ראשי', icon: LayoutDashboard },
  { path: '/files', label: 'מסמכים', icon: FileText },
  { path: '/approvals', label: 'אישורי בנקים', icon: Building2 },
  { path: '/collaterals', label: 'בטחונות', icon: Shield },
];

const adminItems = [
  { path: '/admin', label: 'ניהול', icon: Settings },
];

export default function PortalLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div dir="rtl" className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-l border-border flex flex-col fixed right-0 top-0 bottom-0 z-30 shadow-sm">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-foreground tracking-tight">האיזור האישי</h1>
          <p className="text-xs text-muted-foreground mt-1">{user?.full_name || user?.email}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="pt-4 pb-2">
                <div className="border-t border-border" />
              </div>
              {adminItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            התנתקות
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 mr-64">
        <div className="p-8 max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}