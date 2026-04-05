import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import ProcessTracker from '../components/ProcessTracker';
import ClientUpdates from '../components/ClientUpdates';
import { Building2, Shield, Package, FileText, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const { user, caseEmail } = useAuth();
  const navigate = useNavigate();
  const [processStage, setProcessStage] = useState(null);
  const [counts, setCounts] = useState({ approvals: 0, files: 0, collaterals: 0, packages: 0 });
  const [rejectedFilesCount, setRejectedFilesCount] = useState(0);

  useEffect(() => {
    if (!caseEmail) return;

    const load = async () => {
      const [stages, approvals, fileRequests, collaterals, packages] = await Promise.all([
        base44.entities.ProcessStage.filter({ client_email: caseEmail }),
        base44.entities.BankApproval.filter({ client_email: caseEmail }),
        base44.entities.FileRequest.filter({ client_email: caseEmail }),
        base44.entities.Collateral.filter({ client_email: caseEmail }),
        base44.entities.SelectedPackage.filter({ client_email: caseEmail }),
      ]);

      if (stages.length > 0) setProcessStage(stages[0]);
      setRejectedFilesCount(fileRequests.filter((request) => request.status === 'rejected').length);
      setCounts({
        approvals: approvals.length,
        files: fileRequests.length,
        collaterals: collaterals.length,
        packages: packages.length,
      });
    };

    load();
  }, [caseEmail]);

  const summaryCards = [
    {
      label: 'אישורים עקרוניים',
      count: counts.approvals,
      icon: Building2,
      color: 'text-blue-600 dark:text-blue-300',
      bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50',
      route: '/approvals',
    },
    {
      label: 'מסמכים',
      count: counts.files,
      icon: FileText,
      color: 'text-violet-600 dark:text-violet-300',
      bg: 'bg-violet-50 border-violet-200 dark:bg-violet-950/25 dark:border-violet-900/50',
      route: '/files',
    },
    {
      label: 'בטחונות',
      count: counts.collaterals,
      icon: Shield,
      color: 'text-emerald-600 dark:text-emerald-300',
      bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/25 dark:border-emerald-900/50',
      route: '/collaterals',
    },
    {
      label: 'תמהילים',
      count: counts.packages,
      icon: Package,
      color: 'text-orange-600 dark:text-orange-300',
      bg: 'bg-orange-50 border-orange-200 dark:bg-orange-950/25 dark:border-orange-900/50',
      route: '/package',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          שלום, {user?.full_name || 'לקוח'} 👋
        </h1>
        <p className="text-muted-foreground mt-1">ברוך הבא לאיזור האישי שלך</p>
      </div>

      {rejectedFilesCount > 0 ? (
        <button
          type="button"
          onClick={() => navigate('/files?tab=uploaded')}
          className="w-full rounded-2xl border border-red-200 bg-red-50 p-4 text-right transition-all hover:shadow-md dark:border-red-900/50 dark:bg-red-950/25"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/80 dark:bg-slate-950/70">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-300" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-red-700 dark:text-red-300">
                יש מסמכים שדורשים תיקון
              </div>
              <p className="mt-1 text-sm leading-6 text-red-700/90 dark:text-red-300/90">
                {rejectedFilesCount === 1
                  ? 'מסמך אחד סומן כלא תקין. לחץ כדי לעבור למסמכים שהועלו, לראות את ההערה ולהעלות קובץ חדש.'
                  : `${rejectedFilesCount} מסמכים סומנו כלא תקינים. לחץ כדי לעבור למסמכים שהועלו, לראות את ההערות ולהעלות קבצים חדשים.`}
              </p>
            </div>
          </div>
        </button>
      ) : null}

      <div className="grid md:grid-cols-2 gap-4">
        <ProcessTracker
          currentStage={processStage?.current_stage || null}
          notes={processStage?.notes || ''}
        />
        <ClientUpdates />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map(({ label, count, icon: Icon, color, bg, route }) => (
          <button
            key={label}
            onClick={() => navigate(route)}
            className={`rounded-xl border p-5 text-right hover:shadow-md transition-all duration-200 cursor-pointer ${bg}`}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white/70 dark:bg-slate-950/70">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{count}</p>
            <p className={`text-sm font-medium mt-0.5 ${color}`}>{label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
