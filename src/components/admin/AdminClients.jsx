import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Users, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const users = await base44.entities.User.list();
    setClients(users.filter(u => u.role !== 'admin'));
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!email) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(email, 'user');
      toast.success('הזמנה נשלחה למייל');
      setEmail('');
      setOpen(false);
      loadClients();
    } catch (error) {
      toast.error(error.message || 'שגיאה בשליחת הזמנה');
    } finally {
      setInviting(false);
    }
  };

  const handleEditName = (client) => {
    setEditingId(client.id);
    setEditingName(client.full_name || '');
  };

  const handleSaveName = async (clientId) => {
    if (!editingName.trim()) {
      toast.error('שם לא יכול להיות ריק');
      return;
    }
    setSaving(true);
    try {
      await base44.functions.invoke('updateUserName', {
        userId: clientId,
        full_name: editingName,
      });
      toast.success('השם עודכן בהצלחה');
      setEditingId(null);
      loadClients();
    } catch (error) {
      toast.error(error.message || 'שגיאה בעדכון השם');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.User.delete(id);
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
              הזמן לקוח חדש
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>הזמן לקוח חדש</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>כתובת אימייל</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  dir="ltr"
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleInvite}
                disabled={inviting || !email}
                className="w-full"
              >
                {inviting ? 'שולח...' : 'שלח הזמנה'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {clients.length === 0 ? (
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
                      <Button
                        size="sm"
                        onClick={() => handleSaveName(client.id)}
                        disabled={saving}
                      >
                        {saving ? 'שומר...' : 'שמור'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        ביטול
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="font-semibold">{client.full_name || 'ללא שם'}</div>
                    <div className="text-sm text-muted-foreground">{client.email}</div>
                  </>
                )}
              </div>
              {editingId !== client.id && (
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEditName(client)}
                    title="ערוך שם"
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}