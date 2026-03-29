import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Trash2, MailPlus, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, activeCase, caseMembers, isPrimaryCaseUser, refreshCaseAccess } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);

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
      await base44.auth.updateMe({ full_name: fullName });
      toast.success('השם עודכן בהצלחה');
    } catch (error) {
      toast.error(error.message || 'שגיאה בעדכון השם');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    setInviting(true);
    try {
      await base44.functions.invoke('inviteCaseUser', {
        email: inviteEmail.trim().toLowerCase(),
        full_name: inviteName.trim() || null,
      });
      toast.success('Invitation sent');
      setInviteEmail('');
      setInviteName('');
      await refreshCaseAccess();
    } catch (error) {
      toast.error(error.message || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">פרופיל</h1>
        <p className="text-muted-foreground mt-1">ערוך את פרטי החשבון שלך</p>
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
            disabled={loading || fullName === user?.full_name}
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
            <h3 className="font-semibold text-foreground">Case access</h3>
            <p className="text-sm text-muted-foreground">
              {activeCase?.full_name || activeCase?.email || 'No case linked yet'}
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {caseMembers.length === 0 ? (
            <div className="text-sm text-muted-foreground">Only the primary borrower is connected right now.</div>
          ) : (
            caseMembers.map((member) => (
              <div key={member.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-foreground">{member.full_name}</div>
                  <div className="text-sm text-muted-foreground">{member.email}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {member.role === 'primary_borrower' ? 'Primary borrower' : 'Additional borrower'}
                </div>
              </div>
            ))
          )}
        </div>

        {isPrimaryCaseUser ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MailPlus className="w-4 h-4 text-primary" />
              <h4 className="font-medium text-foreground">Invite another user to this case</h4>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Full name</Label>
                <Input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Spouse / borrower 2"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="borrower2@example.com"
                  dir="ltr"
                  className="mt-1"
                />
              </div>
            </div>

            <Button onClick={handleInviteUser} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? 'Sending...' : 'Invite user'}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Only the primary borrower can invite additional users.
          </p>
        )}
      </div>

      <div className="bg-card rounded-xl border border-destructive/30 p-6 max-w-md mt-6">
        <div className="flex items-center gap-3 mb-3">
          <Trash2 className="w-5 h-5 text-destructive" />
          <h3 className="font-semibold text-destructive">מחיקת חשבון</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">פעולה זו אינה הפיכה. פנייה אל עמית לבקשה זו.</p>
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
