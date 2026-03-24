import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Building2, Trash2, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function AdminBankApprovals({ selectedClient }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    client_email: '', bank_name: '', approval_title: '', notes: '', amount: '', interest_rate: '', file_url: '', file_name: ''
  });

  const load = async () => {
    const [data, userList] = await Promise.all([
      base44.entities.BankApproval.list('-created_date'),
      base44.entities.User.list(),
    ]);
    const filtered = selectedClient ? data.filter(a => a.client_email === selectedClient) : data;
    setApprovals(filtered);
    setUsers(userList.filter(u => u.role !== 'admin'));
    setLoading(false);
  };

  useEffect(() => { load(); }, [selectedClient]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm({ ...form, file_url, file_name: file.name });
    setUploading(false);
  };

  const handleCreate = async () => {
    if (!form.client_email || !form.bank_name) return;
    const data = { ...form };
    if (data.amount) data.amount = Number(data.amount);
    else delete data.amount;
    await base44.entities.BankApproval.create(data);
    toast.success('אישור בנק נוסף');
    setForm({ client_email: '', bank_name: '', approval_title: '', notes: '', amount: '', interest_rate: '', file_url: '', file_name: '' });
    setOpen(false);
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.BankApproval.delete(id);
    toast.success('האישור נמחק');
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">אישורי בנקים</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />אישור חדש</Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>הוספת אישור בנק</DialogTitle></DialogHeader>
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
                <Label>שם הבנק</Label>
                <Input value={form.bank_name} onChange={(e) => setForm({...form, bank_name: e.target.value})} placeholder="למשל: בנק הפועלים" className="mt-1" />
              </div>
              <div>
                <Label>כותרת האישור</Label>
                <Input value={form.approval_title} onChange={(e) => setForm({...form, approval_title: e.target.value})} placeholder="למשל: אישור עקרוני למשכנתא" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>סכום (₪)</Label>
                  <Input type="number" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} placeholder="0" className="mt-1" dir="ltr" />
                </div>
                <div>
                  <Label>ריבית</Label>
                  <Input value={form.interest_rate} onChange={(e) => setForm({...form, interest_rate: e.target.value})} placeholder="3.5%" className="mt-1" dir="ltr" />
                </div>
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
              <Button onClick={handleCreate} disabled={!form.client_email || !form.bank_name} className="w-full">הוסף אישור</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {approvals.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">אין אישורי בנקים</div>
      ) : (
        <div className="space-y-3">
          {approvals.map(a => (
            <div key={a.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{a.bank_name}</span>
                  {a.approval_title && <span className="text-sm text-muted-foreground">- {a.approval_title}</span>}
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{a.client_email}</span>
                </div>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {a.amount && <span className="text-xs text-emerald-600">₪{a.amount.toLocaleString()}</span>}
                  {a.interest_rate && <span className="text-xs text-blue-600">ריבית: {a.interest_rate}</span>}
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(a.id)} className="text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}