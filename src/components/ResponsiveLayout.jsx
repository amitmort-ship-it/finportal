import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import MobileNav from './MobileNav';
import { LogOut, MessageCircle, Package, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Building2, Shield, LayoutDashboard, Settings, Cloud } from 'lucide-react';

const navItems = [
  { path: '/', label: 'ראשי', icon: LayoutDashboard },
  { path: '/files', label: 'מסמכים', icon: FileText },
  { path: '/my-files', label: 'הקבצים שלי', icon: Cloud },
  { path: '/package', label: 'תמהיל נבחר', icon: Package },
  { path: '/approvals', label: 'אישורי בנקים', icon: Building2 },
  { path: '/collaterals', label: 'בטחונות', icon: Shield },
  { path: '/profile', label: 'פרופיל', icon: User },
];

const adminItems = [
  { path: '/admin', label: 'ניהול', icon: Settings },
];

export default function ResponsiveLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-card border-l border-border flex-col fixed right-0 top-0 bottom-0 z-30 shadow-sm">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-foreground tracking-tight">האיזור האישי</h1>
          <p className="text-xs text-muted-foreground mt-1 truncate">{user?.full_name || user?.email}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}>
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <>
              <div className="pt-4 pb-2"><div className="border-t border-border" /></div>
              {adminItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link key={item.path} to={item.path}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}>
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          <a href="https://wa.me/972502155910?text=שלום%20עמית%20-%20יש%20לי%20שאלה%20על%20התמהיל"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 transition-all w-full">
            <MessageCircle className="w-4 h-4" />
            צור קשר עם עמית
          </a>
          <button onClick={() => base44.auth.logout()}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all w-full">
            <LogOut className="w-4 h-4" />
            התנתקות
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-card border-b border-border p-4 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">האיזור האישי</h1>
          <button onClick={() => base44.auth.logout()} className="text-muted-foreground hover:text-destructive">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="md:mr-64 pb-20 md:pb-0">
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Floating WhatsApp Button */}
      <a href="https://wa.me/972502155910?text=שלום%20עמית%20-%20יש%20לי%20שאלה%20על%20התמהיל"
        target="_blank" rel="noopener noreferrer"
        className="fixed bottom-20 md:hidden left-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full p-3 shadow-lg transition-all">
        <MessageCircle className="w-6 h-6" />
      </a>

      {/* Mobile Bottom Nav */}
      <MobileNav />
    </div>
  );
}