import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Bell, Home, Landmark, FileText, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProcessTracker from '@/components/ProcessTracker';

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [mortgage, setMortgage] = useState(null);
  const [processStage, setProcessStage] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [stats, setStats] = useState({ refinance: 0, collateral: 0, document: 0, approval: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const userEmail = user?.email;
        if (!userEmail) return;

        const [
          packageData,
          mortgageData,
          stageData,
          updateData,
          collaterals,
          fileRequests,
          approvals,
        ] = await Promise.all([
          base44.entities.SelectedPackage.filter({ client_email: userEmail }, '-created_date'),
          base44.entities.FinalMortgage.filter({ client_email: userEmail }, '-created_date'),
          base44.entities.ProcessStage.filter({ client_email: userEmail }),
          base44.entities.ClientUpdate.filter({ client_email: userEmail }, '-created_date'),
          base44.entities.Collateral.filter({ client_email: userEmail }),
          base44.entities.FileRequest.filter({ client_email: userEmail }),
          base44.entities.BankApproval.filter({ client_email: userEmail }),
        ]);

        setSelectedPackage(packageData?.[0] || null);
        setMortgage(mortgageData?.[0] || null);
        setProcessStage(stageData?.[0] || null);
        setUpdates(updateData.slice(0, 3));

        setStats({
          refinance: mortgageData.length,
          collateral: collaterals.filter(c => c.status !== 'completed').length,
          document: fileRequests.filter(f => f.status === 'pending').length,
          approval: approvals.length,
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.email]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            שלום, {user?.full_name?.split(' ')?.[0] || 'משתמש'}
            <span className="text-4xl">👋</span>
          </h1>
          <p className="text-muted-foreground mt-1">ברוכים הבאים ליישום ניהול המשכנתא שלך</p>
        </div>
      </div>

      {/* Mortgage Forecast Alert */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900/50">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <span className="font-semibold">מדווח משכנתא:</span> המשכנתא שלך תוקצתה בבנק הנבחר. כל המסמכים דרושים וההזמנות על הדרך למחזור שוטף להשוואה.
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">בדיקה אחרונה: {new Date().toLocaleDateString('he-IL')}</p>
        </CardContent>
      </Card>

      {/* Mortgage Details */}
      {mortgage && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50">
          <CardHeader>
            <CardTitle className="text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <Landmark className="w-5 h-5" />
              המשכנתא שלך
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">בנק מבצע</p>
                  <p className="font-semibold">{mortgage.bank_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">סכום כולל</p>
                  <p className="font-semibold">
                    {(mortgage.tracks?.reduce((sum, t) => sum + (t.principal || 0), 0) || 0).toLocaleString('he-IL')} ₪
                  </p>
                </div>
              </div>
              {mortgage.tracks?.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-amber-200 dark:border-amber-900/50">
                  {mortgage.tracks.map((track, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{track.track_type}</span>
                      <span className="font-medium">{track.interest_rate}% • {track.years} שנים</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Updates */}
        <Card className="md:col-span-2 border-blue-200 dark:border-blue-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              עדכונים חדשים
            </CardTitle>
          </CardHeader>
          <CardContent>
            {updates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">אין עדכונים חדשים כרגע</p>
            ) : (
              <div className="space-y-3">
                {updates.map((update) => (
                  <div key={update.id} className="p-3 rounded-lg bg-muted/30 text-sm">
                    <p className="text-foreground">{update.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(update.created_date).toLocaleDateString('he-IL', {
                        year: '2-digit',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Process Stage */}
        {processStage && (
          <Card className="border-blue-200 dark:border-blue-900/50">
            <CardHeader>
              <CardTitle className="text-lg">שלבי התהליך</CardTitle>
            </CardHeader>
            <CardContent>
              <ProcessTracker currentStage={processStage.current_stage} notes={processStage.notes} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900/50">
          <CardContent className="pt-6 text-center">
            <Home className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.refinance}</p>
            <p className="text-xs text-orange-600 dark:text-orange-400">מחזורים</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/50">
          <CardContent className="pt-6 text-center">
            <Landmark className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.collateral}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">בטחונות</p>
          </CardContent>
        </Card>

        <Card className="border-violet-200 bg-violet-50 dark:bg-violet-950/20 dark:border-violet-900/50">
          <CardContent className="pt-6 text-center">
            <FileText className="w-6 h-6 text-violet-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">{stats.document}</p>
            <p className="text-xs text-violet-600 dark:text-violet-400">מסמכים</p>
          </CardContent>
        </Card>

        <Card className="border-cyan-200 bg-cyan-50 dark:bg-cyan-950/20 dark:border-cyan-900/50">
          <CardContent className="pt-6 text-center">
            <Building2 className="w-6 h-6 text-cyan-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">{stats.approval}</p>
            <p className="text-xs text-cyan-600 dark:text-cyan-400">אישורים בנקאיים</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}