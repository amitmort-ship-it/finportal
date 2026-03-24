import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', full_name: '' });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const users = await base44.entities.User.list();
    setClients(users.filter(u => u.role !== 'admin'));
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.full_name) return;
    setCreating(true);
    try {
      await base44.functions.invoke('createUser', {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
      });
      toast.success(`לקוח ${form.full_name} נוצר בהצלחה`);
      setForm({ email: '', password: '', full_name: '' });
      setOpen(false);
      loadClients();
    } catch (error) {
      toast.error(error.message || 'שגיאה ביצירת לקוח');
    } finally {
      setCreating(false);
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
              לקוח חדש
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>הוספת לקוח חדש</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>שם מלא</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({...form, full_name: e.target.value})}
                  placeholder="שם הלקוח"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>כתובת אימייל</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  placeholder="email@example.com"
                  dir="ltr"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>סיסמא</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({...form, password: e.target.value})}
                  placeholder="סיסמא חזקה"
                  dir="ltr"
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={creating || !form.email || !form.password || !form.full_name}
                className="w-full"
              >
                {creating ? 'יוצר...' : 'צור לקוח'}
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
            <div key={client.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{client.full_name || client.email}</div>
                <div className="text-sm text-muted-foreground">{client.email}</div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleDelete(client.id)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}