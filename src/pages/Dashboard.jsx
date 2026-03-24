import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { FileText, Building2, Shield, Clock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import ClientUpdates from '../components/ClientUpdates';

function StatCard({ icon: Icon, label, value, color, to }) {
  return (
    <Link to={to} className="bg-card rounded-xl border border-border p-5 hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="flex items-center gap-1 mt-4 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        <span>צפה בכל</span>
        <ArrowLeft className="w-3 h-3" />
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ files: 0, pendingFiles: 0, approvals: 0, collaterals: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [files, approvals, collaterals] = await Promise.all([
        base44.entities.FileRequest.filter({ client_email: user.email }),
        base44.entities.BankApproval.filter({ client_email: user.email }),
        base44.entities.Collateral.filter({ client_email: user.email }),
      ]);
      setStats({
        files: files.length,
        pendingFiles: files.filter(f => f.status === 'pending').length,
        approvals: approvals.length,
        collaterals: collaterals.filter(c => c.status === 'active').length,
      });
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          שלום, {user.full_name || 'לקוח יקר'} 👋
        </h1>
        <p className="text-muted-foreground mt-1">ברוך הבא לאיזור האישי שלך</p>
      </div>

      <ClientUpdates />

      {stats.pendingFiles > 0 && (
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-semibold text-amber-900">יש לך {stats.pendingFiles} מסמכים שממתינים להעלאה</h3>
              <p className="text-sm text-amber-700 mt-0.5">
                <Link to="/files" className="underline hover:no-underline">לחץ כאן</Link> כדי להעלות אותם
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}