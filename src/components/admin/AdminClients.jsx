import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  UserPlus,
  Users,
  Trash2,
  Edit2,
  Send,
  CheckCircle2,
  Clock,
  Link2,
  MailPlus,
  FlagOff,
  Timer,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);
  const [invitingId, setInvitingId] = useState(null);
  const [memberInviteOpen, setMemberInviteOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const selectedClientRef = useRef(null);
  const [memberInviteName, setMemberInviteName] = useState('');
  const [memberInviteEmail, setMemberInviteEmail] = useState('');
  const [sendingMemberInvite, setSendingMemberInvite] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);

    try {
      const profiles = await base44.entities.ClientProfile.filter({}, '-created_date');

      let memberships = [];
      let invites = [];

      const clientsWithMeta = profiles.map((profile) => ({
        ...profile,
        members: [],
        pending_invites: [],
        member_count: 1,
        pending_invite_count: 0,
      }));

      setClients(clientsWithMeta);
    } catch (error) {
      toast.error('שגיאה בטעינת הלקוחות');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    const email = newEmail.trim().toLowerCase();
    const fullName = newName.trim();

    if (!email || !fullName) {
      return;
    }

    setCreating(true);

    try {
      const existing = await base44.entities.ClientProfile.filter({ email });
      if (existing.length > 0) {
        toast.error('כבר קיים תיק לקוח עם האימייל הזה');
        return;
      }

      await base44.entities.ClientProfile.create({
        email,
        full_name: fullName,
        invited: false,
      });

      toast.success('תיק לקוח נוצר עבור הלווה הראשי');
      setNewEmail('');
      setNewName('');
      setOpen(false);
      await loadClients();
    } catch (error) {
      toast.error(error.message || 'שגיאה ביצירת הפרופיל');
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (client) => {
    setInvitingId(client.id);

    try {
      await base44.users.inviteUser(client.email, 'user');
      await base44.entities.ClientProfile.update(client.id, { invited: true });
      toast.success(`הזמנה נשלחה ל-${client.email}`);
      await loadClients();
    } catch (error) {
      toast.error(error.message || 'שגיאה בשליחת הזמנה');
    } finally {
      setInvitingId(null);
    }
  };

  const handleSaveName = async (clientId) => {
    if (!editingName.trim()) {
      toast.error('שם לא יכול להיות ריק');
      return;
    }

    setSaving(true);

    try {
      await base44.entities.ClientProfile.update(clientId, { full_name: editingName.trim() });
      toast.success('השם עודכן');
      setEditingId(null);
      await loadClients();
    } catch (error) {
      toast.error(error.message || 'שגיאה בעדכון השם');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.ClientProfile.delete(id);
    toast.success('תיק הלקוח נמחק');
    await loadClients();
  };

  const handleEndTreatment = async (client) => {
    if (client.treatment_ended_at) {
      // undo
      await base44.entities.ClientProfile.update(client.id, { treatment_ended_at: null });
      toast.success('הטיפול חודש');
    } else {
      await base44.entities.ClientProfile.update(client.id, { treatment_ended_at: new Date().toISOString() });
      toast.success('הטיפול סומן כמסויים');
    }
    await loadClients();
  };

  const daysSince = (dateStr) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const openMemberInviteDialog = (client) => {
    selectedClientRef.current = client;
    setSelectedClient(client);
    setMemberInviteName('');
    setMemberInviteEmail('');
    setMemberInviteOpen(true);
  };

  const handleInviteAdditionalUser = async () => {
    const email = memberInviteEmail.trim().toLowerCase();
    const fullName = memberInviteName.trim();
    const client = selectedClientRef.current;

    if (!client?.id) {
      toast.error('שגיאה: לא נמצא תיק לקוח');
      return;
    }
    if (!email) {
      toast.error('יש להזין כתובת אימייל');
      return;
    }

    setSendingMemberInvite(true);

    try {
      const res = await base44.functions.invoke('inviteCseUser', {
        email,
        full_name: fullName,
        case_profile_id: client.id,
      });

      if (res?.data?.error) {
        toast.error(res.data.error);
        return;
      }
      
      console.log('inviteCseUser response:', res?.data);

      toast.success('הזמנה נשלחה בהצלחה למייל עם קישור הצטרפות לתיק');
      setMemberInviteOpen(false);
      setSelectedClient(null);
      setMemberInviteName('');
      setMemberInviteEmail('');
      await loadClients();
    } catch (error) {
      console.error('inviteCseUser error:', error);
      toast.error(error.message || 'שגיאה בשליחת ההזמנה');
    } finally {
      setSendingMemberInvite(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">ניהול לקוחות</h2>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              לקוח חדש
            </Button>
          </DialogTrigger>

          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>יצירת פרופיל לקוח</DialogTitle>
            </DialogHeader>

            <p className="text-sm text-muted-foreground">
              כאן יוצרים את תיק המשכנתא של הלווה הראשי. משתמשים נוספים כמו בן/בת זוג או לווה 2
              יצורפו אחר כך על ידך דרך הזמנה לתיק.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <Label>שם מלא של הלווה הראשי</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ישראל ישראלי"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>כתובת אימייל של הלווה הראשי</Label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@example.com"
                  dir="ltr"
                  className="mt-1"
                />
              </div>

              <Button
                onClick={handleCreateProfile}
                disabled={creating || !newEmail.trim() || !newName.trim()}
                className="w-full"
              >
                {creating ? 'יוצר...' : 'צור תיק לקוח (ללא הזמנה)'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={memberInviteOpen} onOpenChange={setMemberInviteOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>הזמנת משתמש נוסף לתיק</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            ההזמנה תצורף לתיק של {selectedClient?.full_name || selectedClient?.email}. המשתמש החדש
            יפתח התחברות משלו, אבל יראה את אותו תיק.
          </p>

          <div className="space-y-4 pt-2">
            <div>
              <Label>שם מלא</Label>
              <Input
                value={memberInviteName}
                onChange={(e) => setMemberInviteName(e.target.value)}
                placeholder="למשל: בן/בת זוג"
                className="mt-1"
              />
            </div>

            <div>
              <Label>כתובת אימייל</Label>
              <Input
                type="email"
                value={memberInviteEmail}
                onChange={(e) => setMemberInviteEmail(e.target.value)}
                placeholder="borrower2@example.com"
                dir="ltr"
                className="mt-1"
              />
            </div>

            <Button
              onClick={() => handleInviteAdditionalUser()}
              disabled={sendingMemberInvite || !memberInviteEmail.trim()}
              className="w-full"
            >
              {sendingMemberInvite ? 'שולח הזמנה...' : 'שלח הזמנה למשתמש נוסף'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
          אין לקוחות עדיין
        </div>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-3">
          {clients.map((client) => (
            <div
              key={client.id}
              className="bg-card rounded-xl border border-border shadow-sm p-5 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                {editingId === client.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      placeholder="שם מלא"
                      autoFocus
                    />

                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveName(client.id)} disabled={saving}>
                        {saving ? 'שומר...' : 'שמור'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        ביטול
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div>
                        <div className="font-semibold">{client.full_name || 'ללא שם'}</div>
                        <div className="text-sm text-muted-foreground">{client.email}</div>
                      </div>

                      {client.invited ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          הוזמן
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3" />
                          טרם הוזמן
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {client.member_count || 1} משתמשים בתיק
                      </span>

                      {client.pending_invite_count > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Link2 className="w-3.5 h-3.5" />
                          {client.pending_invite_count} הזמנות פתוחות
                        </span>
                      ) : null}
                    </div>

                    {client.members?.length > 0 ? (
                      <div className="space-y-1">
                        {client.members.map((member) => (
                          <div key={member.id} className="text-xs text-muted-foreground">
                            משתמש נוסף: {member.full_name || member.user_email} ({member.user_email})
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {client.pending_invites?.length > 0 ? (
                      <div className="space-y-1">
                        {client.pending_invites.map((invite) => (
                          <div key={invite.id} className="text-xs text-amber-700">
                            הזמנה פתוחה: {invite.full_name || invite.email} ({invite.email})
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {editingId !== client.id ? (
                <div className="flex gap-1 shrink-0">
                  {!client.invited ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
                      onClick={() => handleInvite(client)}
                      disabled={invitingId === client.id}
                    >
                      <Send className="w-3.5 h-3.5" />
                      {invitingId === client.id ? 'שולח...' : 'שלח הזמנה'}
                    </Button>
                  ) : null}

                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => openMemberInviteDialog(client)}
                  >
                    <MailPlus className="w-3.5 h-3.5" />
                    הזמן משתמש נוסף
                  </Button>

                  <Button
                    size="sm"
                    variant={client.treatment_ended_at ? 'secondary' : 'outline'}
                    className={`gap-1.5 ${client.treatment_ended_at ? 'text-muted-foreground' : 'text-orange-600 border-orange-300 hover:bg-orange-50'}`}
                    onClick={() => handleEndTreatment(client)}
                    title={client.treatment_ended_at ? `סיום טיפול לפני ${daysSince(client.treatment_ended_at)} ימים - לחץ לביטול` : 'סמן סיום טיפול'}
                  >
                    {client.treatment_ended_at ? (
                      <>
                        <Timer className="w-3.5 h-3.5" />
                        {daysSince(client.treatment_ended_at)} ימים מסיום
                      </>
                    ) : (
                      <>
                        <FlagOff className="w-3.5 h-3.5" />
                        סיום טיפול
                      </>
                    )}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(client.id);
                      setEditingName(client.full_name || '');
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(client.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}