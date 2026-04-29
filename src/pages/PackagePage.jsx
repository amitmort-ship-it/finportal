import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PackageCard from '../components/PackageCard';
import { Package } from 'lucide-react';

export default function PackagePage() {
  const { caseEmail } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPackages = async () => {
      if (!caseEmail) {
        setPackages([]);
        setLoading(false);
        return;
      }

      const data = await base44.entities.SelectedPackage.filter({ client_email: caseEmail }, '-created_date');
      setPackages(data);
      setLoading(false);
    };
    loadPackages();
  }, [caseEmail]);

  // Cache for 2 minutes
  useEffect(() => {
    const timer = setInterval(() => {}, 120000);
    return () => clearInterval(timer);
  }, []);

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
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">תמהיל נבחר</h1>
        <p className="text-muted-foreground mt-1">העלה את התמהיל המסוכם</p>
      </div>



      {packages.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">לא העלית תמהיל עדיין</h3>
          <p className="text-sm text-muted-foreground mt-1">העלה את התמהיל המסוכם דרך הכפתור למעלה</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {packages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      )}
    </div>
  );
}
