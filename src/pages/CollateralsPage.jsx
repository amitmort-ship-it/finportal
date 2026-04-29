import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import CollateralCard from '../components/CollateralCard';
import { Shield, Users, Scale, Building2, Plus } from 'lucide-react';

const CATEGORIES = [
  {
    key: 'חתימות לווים',
    label: 'חתימות לווים בלבד',
    icon: Users,
    color: 'border-blue-200 bg-blue-50/50',
    headerColor: 'text-blue-700 bg-blue-100/80',
    iconColor: 'text-blue-500',
  },
  {
    key: 'חתימות מול עורך דין',
    label: 'חתימות מול עורך דין',
    icon: Scale,
    color: 'border-purple-200 bg-purple-50/50',
    headerColor: 'text-purple-700 bg-purple-100/80',
    iconColor: 'text-purple-500',
  },
  {
    key: 'חתימות מוכרים/קבלן',
    label: 'חתימות מוכרים / קבלן',
    icon: Building2,
    color: 'border-orange-200 bg-orange-50/50',
    headerColor: 'text-orange-700 bg-orange-100/80',
    iconColor: 'text-orange-500',
  },
  {
    key: 'נוספים',
    label: 'נוספים',
    icon: Plus,
    color: 'border-slate-200 bg-slate-50/50',
    headerColor: 'text-slate-700 bg-slate-100/80',
    iconColor: 'text-slate-500',
  },
];

export default function CollateralsPage() {
  const { caseEmail } = useAuth();
  const [collaterals, setCollaterals] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!caseEmail) {
      setCollaterals([]);
      setLoading(false);
      return;
    }

    try {
      const data = await base44.entities.Collateral.filter({ client_email: caseEmail }, '-created_date');
      setCollaterals(data);
    } catch (err) {
      console.error('load collaterals error:', err);
    } finally {
      setLoading(false);
    }
  }, [caseEmail]);

  useEffect(() => {
    load();
  }, [caseEmail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const total = collaterals.length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">בטחונות</h1>
        <p className="text-muted-foreground mt-1">מסמכים הדורשים חתימה</p>
      </div>

      {total === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">אין מסמכים כרגע</h3>
          <p className="text-sm text-muted-foreground mt-1">כאשר יישלחו מסמכים לחתימה, הם יופיעו כאן</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {CATEGORIES.map((cat) => {
            const items = collaterals.filter((c) => (c.category || 'נוספים') === cat.key);
            const Icon = cat.icon;
            return (
              <div key={cat.key} className={`rounded-xl border ${cat.color} flex flex-col`}>
                <div className={`flex items-center gap-2 px-4 py-3 rounded-t-xl ${cat.headerColor}`} dir="rtl">
                  <Icon className={`w-4 h-4 ${cat.iconColor}`} />
                  <span className="font-semibold text-sm">{cat.label}</span>
                  <span className="mr-auto text-xs font-bold opacity-70">{items.length}</span>
                </div>
                <div className="flex-1 p-3 space-y-3">
                  {items.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">אין מסמכים בקטגוריה זו</div>
                  ) : (
                    items.map((c) => (
                      <CollateralCard key={c.id} collateral={c} onUpdate={load} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}