import { Link, useLocation } from 'react-router-dom';
import { FileText, Building2, Shield, LayoutDashboard, Settings, Package } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { path: '/', label: 'ראשי', icon: LayoutDashboard },
  { path: '/files', label: 'מסמכים', icon: FileText },
  { path: '/package', label: 'תמהיל', icon: Package },
  { path: '/approvals', label: 'בנקים', icon: Building2 },
  { path: '/collaterals', label: 'בטחונות', icon: Shield },
];

export default function MobileNav() {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const items = isAdmin ? [...navItems, { path: '/admin', label: 'ניהול', icon: Settings }] : navItems;

  return (
    <div dir="rtl" className="fixed top-0 left-0 right-0 bg-card border-b border-border z-40 md:hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <img src="https://media.base44.com/images/public/69c2ce93ab0a8ed34c65a4a8/9fa9af368_Group112.png" alt="לוגו" className="h-8 w-auto object-contain" />
          <span className="text-sm font-bold text-foreground">עמית ייעוץ ופיננסים</span>
        </div>
      </div>
      <div className="flex justify-start py-1 overflow-x-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
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