import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import CollateralCard from '../components/CollateralCard';
import { Shield } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function CollateralsPage() {
  const { user } = useAuth();
  const [collaterals, setCollaterals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await base44.entities.Collateral.filter({ client_email: user.email }, '-created_date');
      setCollaterals(data);
      setLoading(false);
    };
    load();
  }, [user.email]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const active = collaterals.filter(c => c.status === 'active');
  const released = collaterals.filter(c => c.status === 'released');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">בטחונות</h1>
        <p className="text-muted-foreground mt-1">ניהול הבטחונות שלך</p>
      </div>

      {collaterals.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">אין בטחונות כרגע</h3>
          <p className="text-sm text-muted-foreground mt-1">כאשר יהיו בטחונות, הם יופיעו כאן</p>
        </div>
      ) : (
        <Tabs defaultValue="active" dir="rtl">
          <TabsList className="mb-6">
            <TabsTrigger value="active">
              פעילים ({active.length})
            </TabsTrigger>
            <TabsTrigger value="released">
              שוחררו ({released.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              הכל ({collaterals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <div className="grid gap-4">
              {active.map(c => <CollateralCard key={c.id} collateral={c} />)}
              {active.length === 0 && (
                <p className="text-center text-muted-foreground py-8">אין בטחונות פעילים</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="released">
            <div className="grid gap-4">
              {released.map(c => <CollateralCard key={c.id} collateral={c} />)}
              {released.length === 0 && (
                <p className="text-center text-muted-foreground py-8">אין בטחונות שהשוחררו</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="all">
            <div className="grid gap-4">
              {collaterals.map(c => <CollateralCard key={c.id} collateral={c} />)}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}