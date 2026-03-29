import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import ProcessTracker from '../components/ProcessTracker';
import ClientUpdates from '../components/ClientUpdates';
import { Building2, Shield, Package, FileText } from 'lucide-react';

export default function Dashboard() {
  const { user, caseEmail } = useAuth();
  const navigate = useNavigate();
  const [processStage, setProcessStage] = useState(null);
  const [counts, setCounts] = useState({
    approvals: 0,
    files: 0,
    collaterals: 0,
    packages: 0,
  });

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

      if (stages.length > 0) {
        setProcessStage(stages[0]);
      }

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
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200',
      route: '/approvals',
    },
    {
      label: 'מסמכים',
      count: counts.files,
      icon: FileText,
      color: 'text-violet-600',
      bg: 'bg-violet-50 border-violet-200',
      route: '/files',
    },
    {
      label: 'בטחונות',
      count: counts.collaterals,
      icon: Shield,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200',
      route: '/collaterals',
    },
    {
      label: 'תמהילים',
      count: counts.packages,
      icon: Package,
      color: 'text-orange-600',
      bg: 'bg-orange-50 border-orange-200',
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
            <div className="w-10 h-10 rounded-lg bg-white/70 flex items-center justify-center mb-3">
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
