import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Building2, Trash2, Upload, Loader2, Edit2, Check, X, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const BANKS = ['בנק הפועלים', 'בנק לאומי', 'בנק דיסקונט', 'בנק טפחות', 'חוץ בנקאי'];

const emptyForm = { client_email: '', bank_name: '', approval_title: '', notes: '', amount: '', monthly_payment: '', mortgage_years: '', file_url: '', file_name: '' };

export default function AdminBankApprovals({ selectedClient }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editUploading, setEditUploading] = useState(false);

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
  useEffect(() => { if (selectedClient) setForm(f => ({ ...f, client_email: selectedClient })); }, [selectedClient]);

  const handleFileUpload = async (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isEdit) {
      setEditUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEditForm(f => ({ ...f, file_url, file_name: file.name }));
      setEditUploading(false);
    } else {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, file_url, file_name: file.name }));
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.client_email || !form.bank_name) return;
    const data = { ...form };
    if (data.amount) data.amount = Number(data.amount); else delete data.amount;
    if (data.monthly_payment) data.monthly_payment = Number(data.monthly_payment); else delete data.monthly_payment;
    if (data.mortgage_years) data.mortgage_years = Number(data.mortgage_years); else delete data.mortgage_years;
    await base44.entities.BankApproval.create(data);
    toast.success('אישור בנק נוסף');
    setForm({ ...emptyForm, client_email: selectedClient || '' });
    setOpen(false);
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.BankApproval.delete(id);
    toast.success('האישור נמחק');
    load();
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setEditForm({
      bank_name: a.bank_name || '',
      approval_title: a.approval_title || '',
      notes: a.notes || '',
      amount: a.amount || '',
      monthly_payment: a.monthly_payment || '',
      mortgage_years: a.mortgage_years || '',
      file_url: a.file_url || '',
      file_name: a.file_name || '',
    });
  };

  const handleSaveEdit = async () => {
    const data = { ...editForm };
    if (data.amount) data.amount = Number(data.amount); else delete data.amount;
    if (data.monthly_payment) data.monthly_payment = Number(data.monthly_payment); else delete data.monthly_payment;
    if (data.mortgage_years) data.mortgage_years = Number(data.mortgage_years); else delete data.mortgage_years;
    await base44.entities.BankApproval.update(editingId, data);
    toast.success('האישור עודכן');
    setEditingId(null);
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
                <Select value={form.client_email} onValueChange={(v) => setForm({ ...form, client_email: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
                  <SelectContent>
                    {users.map(u => <SelectItem key={u.id} value={u.email}>{u.full_name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>שם הבנק</Label>
                <Select value={form.bank_name} onValueChange={v => setForm({ ...form, bank_name: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="בחר בנק" /></SelectTrigger>
                  <SelectContent>
                    {BANKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>כותרת האישור</Label>
                <Input value={form.approval_title} onChange={e => setForm({ ...form, approval_title: e.target.value })} placeholder="למשל: אישור עקרוני למשכנתא" className="mt-1" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>סכום (₪)</Label>
                  <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" className="mt-1" dir="ltr" />
                </div>
                <div>
                  <Label>החזר חודשי (₪)</Label>
                  <Input type="number" value={form.monthly_payment} onChange={e => setForm({ ...form, monthly_payment: e.target.value })} placeholder="0" className="mt-1" dir="ltr" />
                </div>
                <div>
                  <Label>שנות משכנתא</Label>
                  <Input type="number" value={form.mortgage_years} onChange={e => setForm({ ...form, mortgage_years: e.target.value })} placeholder="30" className="mt-1" dir="ltr" />
                </div>
              </div>
              <div>
                <Label>הערות</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="הוסף פרטים..." className="mt-1" />
              </div>
              <div>
                <Label>מסמך</Label>
                <label className="flex items-center gap-2 mt-1 border border-dashed border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-all">
                  <input type="file" className="hidden" onChange={e => handleFileUpload(e, false)} disabled={uploading} />
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
            <div key={a.id} className="bg-card rounded-xl border border-border p-4">
              {editingId === a.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">שם הבנק</Label>
                      <Input value={editForm.bank_name} onChange={e => setEditForm(f => ({ ...f, bank_name: e.target.value }))} className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">כותרת</Label>
                      <Input value={editForm.approval_title} onChange={e => setEditForm(f => ({ ...f, approval_title: e.target.value }))} className="mt-1 h-8 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">סכום (₪)</Label>
                      <Input type="number" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} className="mt-1 h-8 text-sm" dir="ltr" />
                    </div>
                    <div>
                      <Label className="text-xs">החזר חודשי (₪)</Label>
                      <Input type="number" value={editForm.monthly_payment} onChange={e => setEditForm(f => ({ ...f, monthly_payment: e.target.value }))} className="mt-1 h-8 text-sm" dir="ltr" />
                    </div>
                    <div>
                      <Label className="text-xs">שנות משכנתא</Label>
                      <Input type="number" value={editForm.mortgage_years} onChange={e => setEditForm(f => ({ ...f, mortgage_years: e.target.value }))} className="mt-1 h-8 text-sm" dir="ltr" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">הערות</Label>
                    <Textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 text-sm" rows={2} />
                  </div>
                  <div>
                    <Label className="text-xs">מסמך</Label>
                    <label className="flex items-center gap-2 mt-1 border border-dashed border-border rounded-lg p-2 cursor-pointer hover:border-primary/50 transition-all">
                      <input type="file" className="hidden" onChange={e => handleFileUpload(e, true)} disabled={editUploading} />
                      {editUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className="text-xs text-muted-foreground">{editForm.file_name || 'החלף מסמך'}</span>
                    </label>
                    {editForm.file_url && (
                      <a href={editForm.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-xs text-primary hover:underline">
                        <Download className="w-3 h-3" />{editForm.file_name || 'הורד מסמך'}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit} className="gap-1"><Check className="w-3 h-3" />שמור</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="gap-1"><X className="w-3 h-3" />ביטול</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{a.bank_name}</span>
                      {a.approval_title && <span className="text-sm text-muted-foreground">- {a.approval_title}</span>}
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{a.client_email}</span>
                    </div>
                    <div className="flex gap-3 mt-1 flex-wrap">
                      {a.amount && <span className="text-xs text-emerald-600">₪{a.amount.toLocaleString()}</span>}
                      {a.monthly_payment && <span className="text-xs text-blue-600">החזר חודשי: ₪{a.monthly_payment.toLocaleString()}</span>}
                      {a.mortgage_years && <span className="text-xs text-purple-600">{a.mortgage_years} שנים</span>}
                    </div>
                    {a.file_url && (
                      <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-xs text-primary hover:underline">
                        <Download className="w-3 h-3" />{a.file_name || 'הורד מסמך'}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(a)}><Edit2 className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(a.id)} className="text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}