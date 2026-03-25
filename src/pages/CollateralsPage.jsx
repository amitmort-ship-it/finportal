import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import CollateralCard from '../components/CollateralCard';
import { Shield } from 'lucide-react';

export default function CollateralsPage() {
  const { user } = useAuth();
  const [collaterals, setCollaterals] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const data = await base44.entities.Collateral.filter({ client_email: user.email }, '-created_date');
    setCollaterals(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user.email]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">בטחונות</h1>
        <p className="text-muted-foreground mt-1">מסמכים הדורשים חתימה</p>
      </div>

      {collaterals.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">אין מסמכים כרגע</h3>
          <p className="text-sm text-muted-foreground mt-1">כאשר יישלחו מסמכים לחתימה, הם יופיעו כאן</p>
        </div>
      ) : (
        <div className="space-y-4">
          {collaterals.map(c => (
            <CollateralCard key={c.id} collateral={c} onUpdate={load} />
          ))}
        </div>
      )}
    </div>
  );
}