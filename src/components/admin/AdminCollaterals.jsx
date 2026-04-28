import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Shield, Trash2, Upload, Loader2, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const COLLATERAL_CATEGORIES = ['חתימות לווים', 'חתימות מול עורך דין', 'חתימות מוכרים/קבלן', 'נוספים'];

const emptyForm = { client_email: '', title: '', description: '', handler: '', notes: '', admin_file_url: '', admin_file_name: '', category: 'נוספים' };

const statusConfig = {
  pending: { label: 'לא בוצע', color: 'bg-amber-50 text-amber-600' },
  signed: { label: 'בוצע', color: 'bg-emerald-50 text-emerald-600' },
  completed: { label: 'בוצע', color: 'bg-emerald-50 text-emerald-600' },
};

export default function AdminCollaterals({ selectedClient }) {
  const [collaterals, setCollaterals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Collateral.filter({}, '-created_date');
      const filtered = selectedClient ? data.filter(c => c.client_email === selectedClient) : data;
      setCollaterals(filtered);
    } catch (err) {
      toast.error('שגיאה בטעינת בטחונות');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedClient]);
  useEffect(() => { if (selectedClient) setForm(f => ({ ...f, client_email: selectedClient })); }, [selectedClient]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await base44.functions.invoke('getAllClients', {});
        setUsers((res.data?.profiles || []).filter(p => p.email));
      } catch {}
    };
    loadUsers();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, admin_file_url: file_url, admin_file_name: file.name }));
    } catch (err) {
      toast.error('שגיאה בהעלאת הקובץ');
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.client_email || !form.title) return;
    try {
      await base44.entities.Collateral.create(form);
      toast.success('מסמך בטחון נוסף');
      setForm({ ...emptyForm, client_email: selectedClient || '' });
      setOpen(false);
      load();
    } catch (err) {
      toast.error('שגיאה ביצירת המסמך');
    }
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.Collateral.delete(id);
      toast.success('המסמך נמחק');
      load();
    } catch (err) {
      toast.error('שגיאה במחיקה');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await base44.entities.Collateral.update(id, { status });
      toast.success('הסטטוס עודכן');
      load();
    } catch (err) {
      toast.error('שגיאה בעדכון הסטטוס');
    }
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
            <Button className="gap-2"><Plus className="w-4 h-4" />מסמך חדש</Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>הוספת מסמך בטחון</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>לקוח</Label>
                <Select value={form.client_email} onValueChange={v => setForm({ ...form, client_email: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
                  <SelectContent>
                    {users.map(u => <SelectItem key={u.id} value={u.email}>{u.full_name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>קטגוריה</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="בחר קטגוריה" /></SelectTrigger>
                  <SelectContent>
                    {COLLATERAL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>שם המסמך</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="למשל: ערבות בנקאית" className="mt-1" />
              </div>
              <div>
                <Label>הסבר על המסמך</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="הסבר מה צריך לחתום ולמה..." className="mt-1" rows={3} />
              </div>
              <div>
                <Label>מי מטפל במסמך</Label>
                <Input value={form.handler} onChange={e => setForm({ ...form, handler: e.target.value })} placeholder="למשל: משרד עורך דין כהן" className="mt-1" />
              </div>
              <div>
                <Label>הערות</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="הערות נוספות..." className="mt-1" rows={2} />
              </div>
              <div>
                <Label>מסמך לחתימה</Label>
                <label className="flex items-center gap-2 mt-1 border border-dashed border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-all">
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-sm text-muted-foreground">{form.admin_file_name || 'העלה מסמך לחתימה'}</span>
                </label>
              </div>
              <Button onClick={handleCreate} disabled={!form.client_email || !form.title} className="w-full">הוסף מסמך</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {collaterals.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">אין מסמכי בטחון</div>
      ) : (
        <div className="space-y-4">
          {collaterals.map(c => {
            const sc = statusConfig[c.status] || statusConfig.pending;
            return (
              <div key={c.id} className="bg-card rounded-xl border border-border overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{c.title}</span>
                    <span className="text-xs text-muted-foreground">{c.client_email}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.color}`}>{sc.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={c.status} onValueChange={v => handleStatusChange(c.id, v)}>
                      <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">ממתין לחתימה</SelectItem>
                        <SelectItem value="signed">הוחזר חתום</SelectItem>
                        <SelectItem value="completed">הושלם</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)} className="text-destructive hover:bg-destructive/10 h-7 w-7">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Split body */}
                <div className="grid grid-cols-2 divide-x divide-x-reverse divide-border">
                  {/* Right: admin doc */}
                  <div className="p-4">
                    <div className="text-xs font-semibold text-primary mb-2">מסמך לחתימה (מהמשרד)</div>
                    {c.description && <p className="text-sm text-muted-foreground mb-2">{c.description}</p>}
                    {c.handler && <p className="text-xs text-muted-foreground mb-2">מטפל: <span className="font-medium text-foreground">{c.handler}</span></p>}
                    {c.notes && <p className="text-xs text-muted-foreground mb-2">{c.notes}</p>}
                    {c.admin_file_url ? (
                      <a href={c.admin_file_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-1">
                        <Download className="w-3.5 h-3.5" />{c.admin_file_name || 'הורד מסמך'}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">לא הועלה מסמך</span>
                    )}
                  </div>

                  {/* Left: client signed doc */}
                  <div className="p-4">
                    <div className="text-xs font-semibold text-emerald-600 mb-2">מסמך חתום (מהלקוח)</div>
                    {c.client_file_url ? (
                      <a href={c.client_file_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:underline">
                        <Download className="w-3.5 h-3.5" />{c.client_file_name || 'הורד מסמך חתום'}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">הלקוח טרם העלה מסמך</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}