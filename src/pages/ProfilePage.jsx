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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">פרופיל</h1>
        <p className="text-muted-foreground mt-1">פרטי החשבון והרשאות הגישה לתיק</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-8 max-w-md">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-6">
          <User className="w-6 h-6 text-primary" />
        </div>

        <div className="space-y-4">
          <div>
            <Label>כתובת אימייל</Label>
            <Input
              type="email"
              value={user?.email || ''}
              disabled
              className="mt-1"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground mt-1">לא ניתן לשנות את כתובת המייל</p>
          </div>

          <div>
            <Label>שם מלא</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="הכנס שם"
              className="mt-1"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={loading || fullName.trim() === (user?.full_name || '').trim()}
            className="w-full"
          >
            {loading ? 'שומר...' : 'שמור שינויים'}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-8 max-w-2xl mt-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold text-foreground">משתמשי התיק</h3>
            <p className="text-sm text-muted-foreground">
              {activeCase?.full_name || activeCase?.email || 'אין תיק משויך כרגע'}
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {caseMembers.length === 0 ? (
            <div className="text-sm text-muted-foreground">כרגע רק הלווה הראשי מחובר לתיק.</div>
          ) : (
            caseMembers.map((member) => (
              <div
                key={member.id}
                className="rounded-lg border border-border p-3 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-medium text-foreground">{member.full_name}</div>
                  <div className="text-sm text-muted-foreground">{member.email}</div>
                </div>

                <div className="text-xs text-muted-foreground">
                  {member.role === 'primary_borrower' ? 'לווה ראשי' : 'משתמש נוסף'}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-blue-900">ניהול הרשאות מתבצע על ידי האדמין בלבד</div>
              <p className="text-sm text-blue-800 mt-1">
                כדי להוסיף בן/בת זוג או משתמש נוסף לתיק, צריך לפנות לאדמין. רק האדמין יכול
                לשלוח הזמנות ולהרחיב את הגישה לתוכנה.
              </p>
            </div>
          </div>
        </div>
      </div>

      {pendingCaseInvites.length > 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 max-w-2xl mt-6">
          <div className="flex items-center gap-3 mb-6">
            <Link2 className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">הזמנות פתוחות</h3>
              <p className="text-sm text-muted-foreground">משתמשים שהאדמין הזמין ועדיין לא הצטרפו</p>
            </div>
          </div>

          <div className="space-y-3">
            {pendingCaseInvites.map((invite) => (
              <div
                key={invite.id}
                className="rounded-lg border border-border p-3 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-medium text-foreground">{invite.full_name}</div>
                  <div className="text-sm text-muted-foreground">{invite.email}</div>
                </div>

                <div className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                  <Clock3 className="w-3 h-3" />
                  ממתין להצטרפות
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="bg-card rounded-xl border border-destructive/30 p-6 max-w-md mt-6">
        <div className="flex items-center gap-3 mb-3">
          <Trash2 className="w-5 h-5 text-destructive" />
          <h3 className="font-semibold text-destructive">מחיקת חשבון</h3>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          פעולה זו אינה הפיכה. פנייה אל עמית לבקשה זו.
        </p>

        <Button
          variant="destructive"
          className="w-full"
          onClick={() => {
            toast.error('למחיקת חשבון פנה ישירות לעמית בוואצאפ או בטלפון: 0502155910');
          }}
        >
          בקש מחיקת חשבון
        </Button>
      </div>
    </div>
  );
}
