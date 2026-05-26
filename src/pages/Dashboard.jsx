import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Bell, Package, Shield, FileText, Building2, Activity, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProcessTracker from '@/components/ProcessTracker';

export default function Dashboard() {
  const { user, caseEmail, adminViewClient } = useAuth();
  const isAdmin = user?.role === 'admin';
  // Admin with no client selected shouldn't load dashboard
  const effectiveEnabled = !!caseEmail && (!isAdmin || !!adminViewClient);

  const { data, isLoading: loading } = useQuery({
    queryKey: ['dashboard', caseEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCaseDashboard', { case_email: caseEmail });
      return res.data;
    },
    enabled: effectiveEnabled,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  const selectedPackage = data?.packageData?.[0] || null;
  const mortgage = data?.mortgageData?.[0] || null;
  const processStage = data?.stageData?.[0] || null;
  const updates = (data?.updateData || []).slice(0, 3);
  const stats = {
    refinance: data?.mortgageData?.length || 0,
    collateral: (data?.collaterals || []).filter(c => c.status !== 'completed').length,
    document: (data?.fileRequests || []).filter(f => f.status === 'pending').length,
    approval: data?.approvals?.length || 0,
  };

  if (isAdmin && !adminViewClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="text-5xl">👁️</div>
        <h2 className="text-xl font-bold">בחר לקוח לצפייה</h2>
        <p className="text-muted-foreground">השתמש בדרופדאון "תצוגת לקוח" בסיידבר כדי לבחור תיק</p>
      </div>
    );
  }

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

      {/* Mortgage Pulse Alert */}
      {mortgage && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900/50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm text-blue-900 dark:text-blue-200 flex-1">
                <span className="font-semibold block mb-1">מד דופק משכנתא:</span>
                <span className="block">המשכנתא שלך מנוטרת מול ריביות השוק. נעדכן כשתיווצר הזדמנות למחזור.</span>
              </p>
              <Activity className="w-5 h-5 text-blue-600 shrink-0 flex-shrink-0" />
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2 text-right">בדיקה אחרונה: {new Date().toLocaleDateString('he-IL')}</p>
          </CardContent>
        </Card>
      )}

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
                    <p style={{whiteSpace: 'pre-line'}} className="text-foreground">{update.message}</p>
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
            <Package className="w-5 h-5 text-orange-500 mx-auto mb-3" />
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.refinance}</p>
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">תמהילים</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/50">
          <CardContent className="pt-6 text-center">
            <Shield className="w-5 h-5 text-emerald-500 mx-auto mb-3" />
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.collateral}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">בטחונות</p>
          </CardContent>
        </Card>

        <Card className="border-violet-200 bg-violet-50 dark:bg-violet-950/20 dark:border-violet-900/50">
          <CardContent className="pt-6 text-center">
            <FileText className="w-5 h-5 text-violet-500 mx-auto mb-3" />
            <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">{stats.document}</p>
            <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">מסמכים</p>
          </CardContent>
        </Card>

        <Card className="border-cyan-200 bg-cyan-50 dark:bg-cyan-950/20 dark:border-cyan-900/50">
          <CardContent className="pt-6 text-center">
            <Building2 className="w-5 h-5 text-cyan-500 mx-auto mb-3" />
            <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">{stats.approval}</p>
            <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">אישורים עקרוניים</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}