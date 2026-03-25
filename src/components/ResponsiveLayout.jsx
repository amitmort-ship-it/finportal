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
  { path: '/package', label: 'תמהיל נבחר', icon: Package },
  { path: '/approvals', label: 'אישורי בנקים', icon: Building2 },
  { path: '/collaterals', label: 'בטחונות', icon: Shield },
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
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <img src="https://media.base44.com/images/public/69c2ce93ab0a8ed34c65a4a8/9fa9af368_Group112.png" alt="לוגו" className="h-10 w-auto object-contain" />
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">עמית ייעוץ ופיננסים</h1>
              <p className="text-xs text-muted-foreground">ניהול משכנתא</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 truncate">{user?.full_name || user?.email}</p>
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
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-all w-full shadow-sm">
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
      <header className="md:hidden bg-card border-b border-border p-3 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="https://media.base44.com/images/public/69c2ce93ab0a8ed34c65a4a8/9fa9af368_Group112.png" alt="לוגו" className="h-8 w-auto object-contain" />
            <span className="text-sm font-bold text-foreground">עמית ייעוץ ופיננסים</span>
          </div>
          <button onClick={() => base44.auth.logout()} className="text-muted-foreground hover:text-destructive">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="md:mr-64 pb-20 md:pb-0 relative">
        <div className="pointer-events-none fixed inset-0 md:right-64 flex items-center justify-center opacity-[0.04] z-0">
          <img src="https://media.base44.com/images/public/69c2ce93ab0a8ed34c65a4a8/9fa9af368_Group112.png" alt="" className="w-96 h-96 object-contain" />
        </div>
        <div className="p-4 md:p-8 max-w-5xl mx-auto relative z-10">
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