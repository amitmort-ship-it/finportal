import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Users, Trash2, Edit2, Send, CheckCircle2, Clock } from 'lucide-react';
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

  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => {
    try {
      const users = await base44.entities.User.filter({});
      const nonAdminUsers = users.filter(u => u.role !== 'admin');
      const profiles = await base44.entities.ClientProfile.filter({});
      const profileEmails = new Set(profiles.map(p => p.email));

      // Auto-create profiles for existing users that don't have one
      const missingProfiles = nonAdminUsers.filter(u => !profileEmails.has(u.email));
      if (missingProfiles.length > 0) {
        await Promise.all(
          missingProfiles.map(u =>
            base44.entities.ClientProfile.create({
              email: u.email,
              full_name: u.full_name || u.email,
              invited: true,
            })
          )
        );
      }

      const allProfiles = await base44.entities.ClientProfile.filter({}, '-created_date');
      setClients(allProfiles);
    } catch (error) {
      toast.error('שגיאה בטעינת הלקוחות');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!newEmail || !newName) return;
    setCreating(true);
    try {
      await base44.entities.ClientProfile.create({
        email: newEmail.trim().toLowerCase(),
        full_name: newName.trim(),
        invited: false,
      });
      toast.success('פרופיל לקוח נוצר — תוכל לשלוח הזמנה מאוחר יותר');
      setNewEmail('');
      setNewName('');
      setOpen(false);
      loadClients();
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
      loadClients();
    } catch (error) {
      toast.error(error.message || 'שגיאה בשליחת הזמנה');
    } finally {
      setInvitingId(null);
    }
  };

  const handleSaveName = async (clientId) => {
    if (!editingName.trim()) { toast.error('שם לא יכול להיות ריק'); return; }
    setSaving(true);
    try {
      await base44.entities.ClientProfile.update(clientId, { full_name: editingName.trim() });
      toast.success('השם עודכן');
      setEditingId(null);
      loadClients();
    } catch (error) {
      toast.error(error.message || 'שגיאה בעדכון השם');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.ClientProfile.delete(id);
    toast.success('הלקוח נמחק');
    loadClients();
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
              צור פרופיל עכשיו, הוסף מסמכים ותוכן — ורק כשתהיה מוכן שלח הזמנה ללקוח.
            </p>
            <div className="space-y-4 pt-2">
              <div>
                <Label>שם מלא</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ישראל ישראלי"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>כתובת אימייל</Label>
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
                disabled={creating || !newEmail || !newName}
                className="w-full"
              >
                {creating ? 'יוצר...' : 'צור פרופיל (ללא הזמנה)'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
          אין לקוחות עדיין
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map(client => (
            <div key={client.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between gap-4">
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
                  <div className="flex items-center gap-3">
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
                )}
              </div>
              {editingId !== client.id && (
                <div className="flex gap-1 shrink-0">
                  {!client.invited && (
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
                  )}
                  <Button size="icon" variant="ghost" onClick={() => { setEditingId(client.id); setEditingName(client.full_name || ''); }}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(client.id)} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}