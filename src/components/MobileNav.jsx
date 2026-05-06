import { Link, useLocation } from 'react-router-dom';
import { FileText, Building2, Shield, LayoutDashboard, Settings, Package, Calculator, LineChart } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { path: '/', label: 'ראשי', icon: LayoutDashboard },
  { path: '/files', label: 'מסמכים', icon: FileText },
  { path: '/package', label: 'תמהיל', icon: Package },
  { path: '/approvals', label: 'בנקים', icon: Building2 },
  { path: '/collaterals', label: 'בטחונות', icon: Shield },
  { path: '/tools', label: 'כלים', icon: Calculator },
];

const toolShortcuts = [
  { path: '/tools', label: 'כל הכלים' },
  { path: '/tools?tool=compound-interest', label: 'ריבית דריבית' },
  { path: '/tools?tool=loan-comparison', label: 'כדאיות הלוואה' },
  { path: '/tools?tool=property-purchase-costs', label: 'עלויות דירה' },
];

export default function MobileNav() {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isToolsArea = location.pathname === '/tools';

  const items = isAdmin
    ? [...navItems, { path: '/simulations', label: 'סימולציות', icon: LineChart }, { path: '/admin', label: 'ניהול', icon: Settings }]
    : navItems;

  return (
    <div
      dir="rtl"
      className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {isToolsArea ? (
        <div className="px-3 pt-3 pb-2 border-b border-border overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {toolShortcuts.map((item) => {
              const isActive = `${location.pathname}${location.search}` === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto overscroll-x-contain scrollbar-none">
        <div className="flex min-w-max gap-1 px-2 py-1">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex min-w-[72px] flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition-all select-none ${
                  isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
