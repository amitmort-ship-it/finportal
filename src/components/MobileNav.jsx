import { Link, useLocation } from 'react-router-dom';
import { FileText, Building2, Shield, LayoutDashboard, Settings, Package, Cloud } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { path: '/', label: 'ראשי', icon: LayoutDashboard },
  { path: '/files', label: 'מסמכים', icon: FileText },
  { path: '/my-files', label: 'שלי', icon: Cloud },
  { path: '/package', label: 'תמהיל', icon: Package },
  { path: '/approvals', label: 'בנקים', icon: Building2 },
];

export default function MobileNav() {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const items = isAdmin ? [...navItems, { path: '/admin', label: 'ניהול', icon: Settings }] : navItems;

  return (
    <div dir="rtl" className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 md:hidden">
      <div className="flex justify-around py-2">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all ${
                isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}