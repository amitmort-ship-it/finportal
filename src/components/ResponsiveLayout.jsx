import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import PageTransition from './PageTransition';
import { useAuth } from '@/lib/AuthContext';
import MobileNav from './MobileNav';
import { LogOut, MessageCircle, Package, Calculator, LineChart, ChevronDown, FolderOpen, User, Eye } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { FileText, Building2, Shield, LayoutDashboard, Settings } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import AdminClientViewPicker from './AdminClientViewPicker';
import SidebarNotes from './SidebarNotes';
import MeetingRoomAdmin from './admin/MeetingRoomAdmin';
import { useState } from 'react';
const navItems = [
  { path: '/', label: 'ראשי', icon: LayoutDashboard },
  { path: '/files', label: 'מסמכים', icon: FileText },
  { path: '/package', label: 'תמהיל נבחר', icon: Package },
  { path: '/approvals', label: 'אישורי בנקים', icon: Building2 },
  { path: '/collaterals', label: 'בטחונות', icon: Shield },
  { path: '/tools', label: 'כלים שימושיים', icon: Calculator },
];

const adminItems = [
  { path: '/simulations', label: 'סימולציות', icon: LineChart },
  { path: '/admin', label: 'ניהול', icon: Settings },
];

export default function ResponsiveLayout() {
  const location = useLocation();
  const { user, activeCase, allCases, switchCase, adminViewClient, setAdminViewClient } = useAuth();
  const isAdmin = user?.role === 'admin';
  const hasMultipleCases = !isAdmin && allCases?.length > 1;
  const [showCasePicker, setShowCasePicker] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <aside className="hidden md:flex w-64 bg-card border-l border-border flex-col fixed right-0 top-0 bottom-0 z-50 shadow-sm h-screen overflow-y-auto">
        <div className="p-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="https://media.base44.com/images/public/69c2ce93ab0a8ed34c65a4a8/9fa9af368_Group112.png"
                alt="לוגו"
                className="h-10 w-auto object-contain"
                loading="lazy"
              />
              <div>
                <h1 className="text-sm font-bold text-foreground leading-tight">עמית ייעוץ ופיננסים</h1>
                <p className="text-xs text-muted-foreground">ניהול משכנתא</p>
              </div>
            </div>
            <ThemeToggle className="shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground mt-2 truncate">{user?.full_name || user?.email}</p>

          {isAdmin && <AdminClientViewPicker />}

          {hasMultipleCases && (
            <div className="mt-2 relative">
              <button
                onClick={() => setShowCasePicker(v => !v)}
                className="w-full flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FolderOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{activeCase?.full_name || activeCase?.email || 'בחר תיק'}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${showCasePicker ? 'rotate-180' : ''}`} />
              </button>
              {showCasePicker && (
                <div className="absolute top-full mt-1 right-0 left-0 z-50 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                  {allCases.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { switchCase(c.id); setShowCasePicker(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs text-right transition-colors hover:bg-muted ${activeCase?.id === c.id ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'}`}
                    >
                      <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{c.full_name || c.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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

        {isAdmin && (
          <div className="mx-3 mb-3 rounded-xl border border-border bg-muted/30 p-3">
            <MeetingRoomAdmin />
          </div>
        )}
        {isAdmin && <SidebarNotes />}

        {isAdmin && (
          <div className="px-4 pb-3 space-y-1">
            <p className="text-xs text-muted-foreground font-medium mb-2">כלים חיצוניים</p>
            {[
              { label: 'ביטוח ישיר', url: 'https://www.555.co.il/pearl/apps/cooperation-landing-page/homeStep?attentionCode=406&cooperationCode=3618' },
              { label: 'Notion', url: 'https://www.notion.so/304051ce360080539d38c4a852b964cb?v=304051ce360081b2a665000cdc320bfc' },
              { label: 'SmartNPV', url: 'https://www.snpv.co.il/clients' },
              { label: 'Paperless', url: 'https://www.paperless.tax/admin/dashboard;sUserID=nhgp95igmi' },
              { label: 'הסכם ליווי', url: 'https://www.snpv.co.il/documents/edit/RVlveUtWUk9CaldHTXJBL3lYV0lpZz09' },
              { label: 'עוגנים', url: 'https://www.snpv.co.il/anchors' },
              { label: 'יומן', url: 'https://calendar.google.com/calendar/u/3/r/week' },
            ].map(({ label, url }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all w-full"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {label}
              </a>
            ))}
          </div>
        )}

        <div className="p-4 border-t border-border space-y-2">
          <a
            href="https://wa.me/972502155910?text=שלום%20עמית%20-%20יש%20לי%20שאלה%20על%20התמהיל"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-all w-full shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            צור קשר עם עמית
          </a>

          <Link
            to="/profile"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all w-full ${location.pathname === '/profile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
          >
            <User className="w-4 h-4" />
            פרופיל
          </Link>
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            התנתקות
          </button>
        </div>
      </aside>

      <header
        className="md:hidden fixed top-0 left-0 right-0 bg-card border-b border-border z-40"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="https://media.base44.com/images/public/69c2ce93ab0a8ed34c65a4a8/9fa9af368_Group112.png"
              alt="לוגו"
              className="h-8 w-auto object-contain"
              loading="lazy"
            />
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">עמית ייעוץ ופיננסים</h1>
              <p className="text-xs text-muted-foreground">ניהול משכנתא</p>
            </div>
          </div>
          <ThemeToggle className="shrink-0" />
        </div>
        {hasMultipleCases && (
          <div className="px-4 pb-2 relative">
            <button
              onClick={() => setShowCasePicker(v => !v)}
              className="w-full flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">{activeCase?.full_name || activeCase?.email || 'בחר תיק'}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${showCasePicker ? 'rotate-180' : ''}`} />
            </button>
            {showCasePicker && (
              <div className="absolute top-full mt-1 right-4 left-4 z-50 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                {allCases.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { switchCase(c.id); setShowCasePicker(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs text-right transition-colors hover:bg-muted ${activeCase?.id === c.id ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'}`}
                  >
                    <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{c.full_name || c.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      <main
        className={`md:mr-64 ${hasMultipleCases ? 'pt-32' : 'pt-24'} md:pt-0 pb-20 md:pb-0 h-screen overflow-y-auto`}
        ref={(el) => el && location.pathname && el.scrollTo(0, 0)}
      >
        <div className="pointer-events-none fixed inset-0 md:right-64 flex items-center justify-center opacity-[0.04] z-0">
          <img
            src="https://media.base44.com/images/public/69c2ce93ab0a8ed34c65a4a8/9fa9af368_Group112.png"
            alt=""
            className="w-96 h-96 object-contain"
            loading="lazy"
          />
        </div>

        {isAdmin && adminViewClient && (
          <div className="mx-4 md:mx-8 mt-4 rounded-xl bg-amber-50 border border-amber-300 dark:bg-amber-950/30 dark:border-amber-700 px-4 py-2.5 flex items-center justify-between gap-3" dir="rtl">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-sm font-medium">
              <Eye className="w-4 h-4 shrink-0" />
              <span>צופה כ: <span className="font-bold">{adminViewClient.full_name}</span></span>
              <span className="text-amber-600 dark:text-amber-400 text-xs font-normal" dir="ltr">({adminViewClient.email})</span>
            </div>
            <button
              onClick={() => setAdminViewClient(null)}
              className="text-xs text-amber-700 dark:text-amber-400 hover:text-amber-900 underline shrink-0"
            >
              חזור לתצוגה רגילה
            </button>
          </div>
        )}
        <div className="p-4 md:p-8 max-w-5xl mx-auto relative z-10">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>

      <a
        href="https://wa.me/972502155910?text=%D7%A9%D7%9C%D7%95%D7%9D%20%D7%A2%D7%9E%D7%99%D7%AA%20-%20%D7%99%D7%A9%20%D7%9C%D7%99%20%D7%A9%D7%90%D7%9C%D7%94%20%D7%A2%D7%9C%20%D7%94%D7%AA%D7%9E%D7%94%D7%99%D7%9C"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 md:hidden left-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full p-3 shadow-lg transition-all z-50"
      >
        <MessageCircle className="w-6 h-6" />
      </a>

      <MobileNav />
    </div>
  );
}