import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import {
  User, Trash2, ShieldCheck, FileText, Shield,
  Building2, Package, MessageCircle, FileUp, ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const {
    user,
    activeCase,
    caseMembers,
    pendingCaseInvites,
    isPrimaryCaseUser,
    refreshCaseAccess,
    caseEmail,
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (user?.full_name) setFullName(user.full_name);
  }, [user]);

  const { data: dashData } = useQuery({
    queryKey: ['dashboard', caseEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('getCaseDashboard', { case_email: caseEmail });
      return res.data;
    },
    enabled: !!caseEmail,
  });

  const stats = [
    {
      label: 'מסמכים',
      value: (dashData?.fileRequests || []).filter(f => f.status === 'pending').length,
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      label: 'בטחונות',
      value: (dashData?.collaterals || []).filter(c => c.status !== 'completed').length,
      icon: Shield,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      label: 'אישורים',
      value: (dashData?.approvals || []).length,
      icon: Building2,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950/30',
    },
    {
      label: 'תמהיל',
      value: (dashData?.packageData || []).length,
      icon: Package,
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-950/30',
    },
  ];

  const initials = (user?.full_name || user?.email || 'U')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('');

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error('שם לא יכול להיות ריק');
      return;
    }
    setLoading(true);
    try {
      await base44.auth.updateMe({ full_name: fullName.trim() });
      if (isPrimaryCaseUser && activeCase?.id) {
        await base44.entities.ClientProfile.update(activeCase.id, { full_name: fullName.trim() });
      }
      toast.success('השם עודכן בהצלחה');
      await refreshCaseAccess();
    } catch (error) {
      toast.error(error.message || 'שגיאה בעדכון השם');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="space-y-6 max-w-2xl">

      {/* Personal Header Card */}
      <div className="rounded-2xl bg-gradient-to-l from-primary/90 to-indigo-600 text-white p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold shrink-0 border-2 border-white/40">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold leading-tight">{user?.full_name || 'משתמש'}</h1>
            <p className="text-white/75 text-sm mt-0.5 truncate" dir="ltr">{user?.email}</p>
            <span className="inline-block mt-2 text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full font-medium">
              {isPrimaryCaseUser ? 'לווה ראשי' : 'משתמש נוסף'}
            </span>
          </div>
        </div>

        {/* Case name */}
        {activeCase && (
          <div className="mt-4 pt-4 border-t border-white/20 text-sm text-white/80">
            תיק: <span className="font-semibold text-white">{activeCase.full_name || activeCase.email}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl ${bg} p-3 text-center`}>
            <Icon className={`w-5 h-5 ${color} mx-auto mb-1.5`} />
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <p className="text-sm font-semibold text-muted-foreground mb-3">קיצורי דרך</p>
        <div className="grid grid-cols-3 gap-2">
          <Link to="/files" className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
            <FileUp className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">העלה מסמך</span>
          </Link>
          <Link to="/package" className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
            <Package className="w-5 h-5 text-orange-600" />
            <span className="text-xs font-medium text-orange-700 dark:text-orange-300">התמהיל שלי</span>
          </Link>
          <a
            href="https://wa.me/972502155910?text=שלום%20עמית%20-%20יש%20לי%20שאלה"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">צור קשר</span>
          </a>
        </div>
      </div>

      {/* Account Settings */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">הגדרות חשבון</h2>

        <div>
          <Label className="text-sm font-medium">כתובת אימייל</Label>
          <div className="mt-1.5 p-3 rounded-lg bg-muted/30">
            <p className="text-sm text-foreground font-mono" dir="ltr">{user?.email || ''}</p>
            <p className="text-xs text-muted-foreground mt-0.5">לא ניתן לשנות את כתובת המייל</p>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">שם מלא</Label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="הכנס שם"
            className="mt-1.5 h-10"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={loading || fullName.trim() === (user?.full_name || '').trim()}
          className="w-full h-10"
        >
          {loading ? 'שומר...' : 'שמור שינויים'}
        </Button>
      </div>

      {/* Case Members */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">משתמשי התיק</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeCase?.full_name || activeCase?.email || 'אין תיק משויך כרגע'}
          </p>
        </div>

        <div className="space-y-2">
          {caseMembers.length === 0 ? (
            <div className="p-4 rounded-lg bg-muted/20 border border-border/50">
              <p className="text-sm text-muted-foreground">כרגע רק הלווה הראשי מחובר לתיק.</p>
            </div>
          ) : (
            caseMembers.map((member) => (
              <div key={member.id} className="rounded-lg bg-muted/30 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {(member.full_name || member.email || '?')[0]}
                  </div>
                  <div>
                    <div className="font-medium text-foreground text-sm">{member.full_name}</div>
                    <div className="text-xs text-muted-foreground" dir="ltr">{member.email}</div>
                  </div>
                </div>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {member.role === 'primary_borrower' ? 'לווה ראשי' : 'משתמש נוסף'}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground block mb-1">ניהול הרשאות מתבצע על ידי האדמין בלבד</span>
              כדי להוסיף בן/בת זוג או משתמש נוסף לתיק, פנה לעמית.
            </p>
          </div>
        </div>
      </div>

      {/* Pending Invites */}
      {pendingCaseInvites.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <h2 className="text-base font-semibold text-foreground">הזמנות פתוחות</h2>
          {pendingCaseInvites.map((invite) => (
            <div key={invite.id} className="rounded-lg bg-amber-50/40 border border-amber-200/50 p-3.5 flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground text-sm">{invite.full_name}</div>
                <div className="text-xs text-muted-foreground" dir="ltr">{invite.email}</div>
              </div>
              <span className="text-xs font-medium text-amber-700 bg-amber-100/60 px-2.5 py-1 rounded-full">
                ממתין להצטרפות
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Delete Account */}
      <div className="bg-card rounded-2xl border border-destructive/20 p-5 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-destructive">מחיקת חשבון</h2>
          <p className="text-sm text-muted-foreground mt-1">פעולה זו אינה הפיכה. פנה לעמית לבקשה זו.</p>
        </div>
        <Button
          variant="destructive"
          className="w-full h-10"
          onClick={() => toast.error('למחיקת חשבון פנה ישירות לעמית בוואצאפ: 0502155910')}
        >
          <Trash2 className="w-4 h-4 ml-2" />
          בקש מחיקת חשבון
        </Button>
      </div>
    </div>
  );
}