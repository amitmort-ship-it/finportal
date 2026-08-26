import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Bell, Package, Shield, FileText, Building2, Activity, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import VisualTimeline from '@/components/VisualTimeline';
import MeetingRoomCard from '@/components/MeetingRoomCard';

export default function Dashboard() {
  const { user, caseEmail, adminViewClient } = useAuth();
  const isAdmin = user?.role === 'admin';
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

  const mortgage = data?.mortgageData?.[0] || null;
  const processStage = data?.stageData?.[0] || null;
  const updates = (data?.updateData || []).slice(0, 5);
  const timelineStages = data?.timelineStages || [];
  const stats = {
    refinance: data?.packageData?.length || 0,
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
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          שלום, {user?.full_name?.split(' ')?.[0] || 'משתמש'} 👋
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">ברוכים הבאים ליישום ניהול המשכנתא שלך</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900/50">
          <CardContent className="pt-4 pb-4 text-center">
            <Package className="w-5 h-5 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.refinance}</p>
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">תמהילים</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/50">
          <CardContent className="pt-4 pb-4 text-center">
            <Shield className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.collateral}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">בטחונות</p>
          </CardContent>
        </Card>
        <Card className="border-violet-200 bg-violet-50 dark:bg-violet-950/20 dark:border-violet-900/50">
          <CardContent className="pt-4 pb-4 text-center">
            <FileText className="w-5 h-5 text-violet-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">{stats.document}</p>
            <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">מסמכים</p>
          </CardContent>
        </Card>
        <Card className="border-cyan-200 bg-cyan-50 dark:bg-cyan-950/20 dark:border-cyan-900/50">
          <CardContent className="pt-4 pb-4 text-center">
            <Building2 className="w-5 h-5 text-cyan-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">{stats.approval}</p>
            <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">אישורים עקרוניים</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      {timelineStages.length > 0 && processStage && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span>מסע התהליך שלך</span>
              {processStage.notes && (
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{processStage.notes}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VisualTimeline stages={timelineStages} currentStageName={processStage.current_stage} />
          </CardContent>
        </Card>
      )}

      {/* Meeting Room */}
      <MeetingRoomCard />

      {/* Main content: Updates + Mortgage side by side */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Updates */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4" />
              עדכונים
            </CardTitle>
          </CardHeader>
          <CardContent>
            {updates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">אין עדכונים חדשים כרגע</p>
            ) : (
              <div className="space-y-2">
                {updates.map((update) => (
                  <div key={update.id} className="p-3 rounded-lg bg-muted/40 text-sm">
                    <p style={{ whiteSpace: 'pre-line' }} className="text-foreground leading-relaxed">{update.message}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {new Date(update.created_date).toLocaleDateString('he-IL', {
                        year: '2-digit', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: Mortgage + Pulse stacked */}
        <div className="space-y-4">
          {mortgage ? (
            <>
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <Landmark className="w-4 h-4" />
                    המשכנתא שלך
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-muted-foreground">בנק מבצע</p>
                        <p className="font-semibold text-sm">{mortgage.bank_name}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-muted-foreground">סכום כולל</p>
                        <p className="font-semibold text-sm">
                          {(mortgage.tracks?.reduce((sum, t) => sum + (t.principal || 0), 0) || 0).toLocaleString('he-IL')} ₪
                        </p>
                      </div>
                    </div>
                    {mortgage.tracks?.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-amber-200 dark:border-amber-900/50">
                        {mortgage.tracks.map((track, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{track.track_type}</span>
                            <span className="font-medium">{track.interest_rate}% · {track.years} שנים</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900/50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <Activity className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-0.5">מד דופק משכנתא</p>
                      <p className="text-xs text-blue-800 dark:text-blue-300">המשכנתא שלך מנוטרת מול ריביות השוק. נעדכן כשתיווצר הזדמנות למחזור.</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">בדיקה אחרונה: {new Date().toLocaleDateString('he-IL')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-border h-full flex items-center justify-center min-h-[120px]">
              <CardContent className="text-center text-muted-foreground text-sm py-8">
                <Landmark className="w-8 h-8 mx-auto mb-2 opacity-30" />
                אין פרטי משכנתא עדיין
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
