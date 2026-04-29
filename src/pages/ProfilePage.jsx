import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Trash2, Users, Link2, Clock3, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const {
    user,
    activeCase,
    caseMembers,
    pendingCaseInvites,
    isPrimaryCaseUser,
    refreshCaseAccess,
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (user?.full_name) {
      setFullName(user.full_name);
    }
  }, [user]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error('שם לא יכול להיות ריק');
      return;
    }

    setLoading(true);

    try {
      await base44.auth.updateMe({ full_name: fullName.trim() });

      if (isPrimaryCaseUser && activeCase?.id) {
        await base44.entities.ClientProfile.update(activeCase.id, {
          full_name: fullName.trim(),
        });
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
    <div dir="rtl" className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">פרופיל</h1>
        <p className="text-muted-foreground mt-2 text-sm">פרטי החשבון והרשאות הגישה לתיק</p>
      </div>

      {/* Account Settings */}
      <div className="bg-card rounded-2xl shadow-sm p-6 max-w-2xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-6">הגדרות חשבון</h2>
          
          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium">כתובת אימייל</Label>
              <div className="mt-2 p-3 rounded-lg bg-muted/30">
                <p className="text-sm text-foreground font-mono" dir="ltr">{user?.email || ''}</p>
                <p className="text-xs text-muted-foreground mt-1">לא ניתן לשנות את כתובת המייל</p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">שם מלא</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="הכנס שם"
                className="mt-2 h-10"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={loading || fullName.trim() === (user?.full_name || '').trim()}
              className="w-full h-10 bg-primary hover:bg-primary/90"
            >
              {loading ? 'שומר...' : 'שמור שינויים'}
            </Button>
          </div>
        </div>
      </div>

      {/* Case Members */}
      <div className="bg-card rounded-2xl shadow-sm p-6 max-w-2xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">משתמשי התיק</h2>
          <p className="text-sm text-muted-foreground">
            {activeCase?.full_name || activeCase?.email || 'אין תיק משויך כרגע'}
          </p>
        </div>

        <div className="space-y-3">
          {caseMembers.length === 0 ? (
            <div className="p-4 rounded-lg bg-muted/20 border border-border/50">
              <p className="text-sm text-muted-foreground">כרגע רק הלווה הראשי מחובר לתיק.</p>
            </div>
          ) : (
            caseMembers.map((member) => (
              <div
                key={member.id}
                className="rounded-lg bg-muted/30 p-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-foreground text-sm">{member.full_name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5" dir="ltr">{member.email}</div>
                </div>
                <div className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {member.role === 'primary_borrower' ? 'לווה ראשי' : 'משתמש נוסף'}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-lg bg-blue-50/60 border border-blue-200/50 p-4 mt-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-sm text-foreground">ניהול הרשאות מתבצע על ידי האדמין בלבד</div>
              <p className="text-xs text-muted-foreground mt-2">
                כדי להוסיף בן/בת זוג או משתמש נוסף לתיק, פנה לאדמין. רק האדמין יכול לשלוח הזמנות ולהרחיב את הגישה.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Invites */}
      {pendingCaseInvites.length > 0 ? (
        <div className="bg-card rounded-2xl shadow-sm p-6 max-w-2xl space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">הזמנות פתוחות</h2>
            <p className="text-sm text-muted-foreground">משתמשים שהאדמין הזמין ועדיין לא הצטרפו</p>
          </div>

          <div className="space-y-3">
            {pendingCaseInvites.map((invite) => (
              <div
                key={invite.id}
                className="rounded-lg bg-amber-50/40 border border-amber-200/50 p-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-foreground text-sm">{invite.full_name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5" dir="ltr">{invite.email}</div>
                </div>
                <div className="text-xs font-medium text-amber-700 bg-amber-100/60 px-2.5 py-1 rounded-full">
                  ממתין להצטרפות
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Delete Account */}
      <div className="bg-card rounded-2xl shadow-sm p-6 max-w-2xl border border-destructive/20 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-destructive">מחיקת חשבון</h2>
          <p className="text-sm text-muted-foreground mt-2">פעולה זו אינה הפיכה. פנה לעמית לבקשה זו.</p>
        </div>

        <Button
          variant="destructive"
          className="w-full h-10"
          onClick={() => {
            toast.error('למחיקת חשבון פנה ישירות לעמית בוואצאפ או בטלפון: 0502155910');
          }}
        >
          <Trash2 className="w-4 h-4 ml-2" />
          בקש מחיקת חשבון
        </Button>
      </div>
    </div>
  );
}