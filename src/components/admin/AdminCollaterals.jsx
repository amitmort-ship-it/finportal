import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Shield, Trash2, Upload, Loader2, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function AdminCollaterals() {
  const [collaterals, setCollaterals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    client_email: '', title: '', type: '', notes: '', file_url: '', file_name: ''
  });

  const load = async () => {
    const [data, userList] = await Promise.all([
      base44.entities.Collateral.list('-created_date'),
      base44.entities.User.list(),
    ]);
    setCollaterals(data);
    setUsers(userList.filter(u => u.role !== 'admin'));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm({ ...form, file_url, file_name: file.name });
    setUploading(false);
  };

  const handleCreate = async () => {
    if (!form.client_email || !form.title) return;
    await base44.entities.Collateral.create(form);
    toast.success('בטחון נוסף');
    setForm({ client_email: '', title: '', type: '', notes: '', file_url: '', file_name: '' });
    setOpen(false);
    load();
  };

  const handleToggleStatus = async (collateral) => {
    const newStatus = collateral.status === 'active' ? 'released' : 'active';
    await base44.entities.Collateral.update(collateral.id, { status: newStatus });
    toast.success(newStatus === 'active' ? 'הבטחון הופעל' : 'הבטחון שוחרר');
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.Collateral.delete(id);
    toast.success('הבטחון נמחק');
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">בטחונות</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />בטחון חדש</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>הוספת בטחון</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>לקוח</Label>
                <Select value={form.client_email} onValueChange={(v) => setForm({...form, client_email: v})}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.email}>{u.full_name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>שם הבטחון</Label>
                <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="למשל: ערבות בנקאית" className="mt-1" />
              </div>
              <div>
                <Label>סוג</Label>
                <Input value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} placeholder="למשל: ערבות, שיעבוד" className="mt-1" />
              </div>
              <div>
                <Label>הערות</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} placeholder="הוסף פרטים..." className="mt-1" />
              </div>
              <div>
                <Label>מסמך</Label>
                <label className="flex items-center gap-2 mt-1 border border-dashed border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-all">
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-sm text-muted-foreground">{form.file_name || 'העלה מסמך'}</span>
                </label>
              </div>
              <Button onClick={handleCreate} disabled={!form.client_email || !form.title} className="w-full">הוסף בטחון</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {collaterals.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">אין בטחונות</div>
      ) : (
        <div className="space-y-3">
          {collaterals.map(c => (
            <div key={c.id} className={`bg-card rounded-xl border border-border p-4 flex items-center gap-4 ${c.status !== 'active' ? 'opacity-60' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{c.title}</span>
                  {c.type && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{c.type}</span>}
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{c.client_email}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                    {c.status === 'active' ? 'פעיל' : 'שוחרר'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => handleToggleStatus(c)} title={c.status === 'active' ? 'שחרר בטחון' : 'הפעל בטחון'}>
                  <ToggleRight className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)} className="text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}