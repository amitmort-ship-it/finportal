import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PackageCard from '../components/PackageCard';
import { Package } from 'lucide-react';
import MiniProcessProgress from '../components/MiniProcessProgress';

export default function PackagePage() {
  const { caseEmail } = useAuth();

  const { data: packages = [], isLoading: loading } = useQuery({
    queryKey: ['selected-packages', caseEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCaseData', { case_email: caseEmail, entity: 'SelectedPackage' });
      return res.data.data || [];
    },
    enabled: !!caseEmail,
    staleTime: 0,
    gcTime: 0,
  });
  const { data: stageRecords = [] } = useQuery({
    queryKey: ['process-stage', caseEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCaseData', { case_email: caseEmail, entity: 'ProcessStage' });
      return res.data.data || [];
    },
    enabled: !!caseEmail,
    staleTime: 0,
    gcTime: 0,
  });
  const currentStage = stageRecords?.[0]?.current_stage || null;

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
        <p className="text-muted-foreground mt-1">התמהיל המסוכם עם היועץ שלך</p>
      </div>

      <MiniProcessProgress currentStage={currentStage} />

      {packages.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">התמהיל עוד לא הועלה</h3>
          <p className="text-sm text-muted-foreground mt-1">היועץ שלך יעלה את התמהיל המסוכם לכאן כשיהיה מוכן</p>
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
