import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Shield, Trash2, Upload, Loader2, Download, Users, Scale, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const COLLATERAL_CATEGORIES = [
  { key: 'חתימות לווים', label: 'חתימות לווים בלבד', icon: Users, color: 'border-blue-200 bg-blue-50/50', headerColor: 'text-blue-700 bg-blue-100/80', iconColor: 'text-blue-500' },
  { key: 'חתימות מול עורך דין', label: 'חתימות מול עורך דין', icon: Scale, color: 'border-purple-200 bg-purple-50/50', headerColor: 'text-purple-700 bg-purple-100/80', iconColor: 'text-purple-500' },
  { key: 'חתימות מוכרים/קבלן', label: 'חתימות מוכרים / קבלן', icon: Building2, color: 'border-orange-200 bg-orange-50/50', headerColor: 'text-orange-700 bg-orange-100/80', iconColor: 'text-orange-500' },
  { key: 'נוספים', label: 'נוספים', icon: Plus, color: 'border-slate-200 bg-slate-50/50', headerColor: 'text-slate-700 bg-slate-100/80', iconColor: 'text-slate-500' },
];
const CATEGORY_KEYS = COLLATERAL_CATEGORIES.map(c => c.key);

const emptyForm = { client_email: '', title: '', description: '', handler: '', notes: '', admin_file_url: '', admin_file_name: '', category: 'נוספים' };

const statusConfig = {
  pending: { label: 'לא בוצע', color: 'bg-amber-50 text-amber-600' },
  signed: { label: 'בוצע', color: 'bg-emerald-50 text-emerald-600' },
  completed: { label: 'בוצע', color: 'bg-emerald-50 text-emerald-600' },
};

const nativeSelectClass = "w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring mt-1";
const nativeSelectSmClass = "h-7 text-xs rounded-md border border-input bg-transparent px-2 py-0.5 w-36 focus:outline-none focus:ring-1 focus:ring-ring";

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
                <select
                  value={form.client_email}
                  onChange={e => setForm({ ...form, client_email: e.target.value })}
                  className={nativeSelectClass}
                >
                  <option value="">בחר לקוח</option>
                  {users.map(u => <option key={u.id} value={u.email}>{u.full_name || u.email}</option>)}
                </select>
              </div>
              <div>
                <Label>קטגוריה</Label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className={nativeSelectClass}
                >
                  {COLLATERAL_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {COLLATERAL_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const items = collaterals.filter(c => (c.category || 'נוספים') === cat.key);
            return (
              <div key={cat.key} className={`rounded-xl border ${cat.color} flex flex-col`}>
                <div className={`flex items-center gap-2 px-4 py-3 rounded-t-xl ${cat.headerColor}`} dir="rtl">
                  <Icon className={`w-4 h-4 ${cat.iconColor}`} />
                  <span className="font-semibold text-sm">{cat.label}</span>
                  <span className="mr-auto text-xs font-bold opacity-70">{items.length}</span>
                </div>
                <div className="flex-1 p-3 space-y-3">
                  {items.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">אין מסמכים בקטגוריה זו</div>
                  ) : items.map(c => {
                    const sc = statusConfig[c.status] || statusConfig.pending;
                    return (
                      <div key={c.id} className="bg-white rounded-lg border border-border p-4 space-y-2.5 shadow-md" dir="rtl">
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-semibold text-sm leading-snug">{c.title}</span>
                          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${sc.color}`}>{sc.label}</span>
                        </div>
                        {!selectedClient && <span className="text-xs text-muted-foreground block">{c.client_email}</span>}
                        {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                        {c.handler && <p className="text-xs text-muted-foreground">מטפל: <span className="font-medium text-foreground">{c.handler}</span></p>}
                        {c.admin_file_url ? (
                          <a href={c.admin_file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <Download className="w-3 h-3" />{c.admin_file_name || 'מסמך לחתימה'}
                          </a>
                        ) : <span className="text-xs text-muted-foreground">לא הועלה מסמך</span>}
                        {/* Client uploaded files (new multi-file array) */}
                        {(c.client_files?.length > 0) ? (
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-emerald-700">קבצים שהועלו על ידי הלקוח:</span>
                            {c.client_files.map((f, idx) => (
                              <a key={idx} href={f.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-emerald-600 hover:underline">
                                <Download className="w-3 h-3 shrink-0" />{f.file_name || `קובץ ${idx + 1}`}
                              </a>
                            ))}
                          </div>
                        ) : c.client_file_url ? (
                          <a href={c.client_file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline">
                            <Download className="w-3 h-3" />{c.client_file_name || 'מסמך חתום'}
                          </a>
                        ) : <span className="text-xs text-muted-foreground block">הלקוח טרם העלה</span>}
                        <div className="flex items-center gap-2 pt-1">
                          <select
                            value={c.status}
                            onChange={e => handleStatusChange(c.id, e.target.value)}
                            className={nativeSelectSmClass}
                          >
                            <option value="pending">ממתין לחתימה</option>
                            <option value="signed">הוחזר חתום</option>
                            <option value="completed">הושלם</option>
                          </select>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)} className="text-destructive hover:bg-destructive/10 h-7 w-7 mr-auto">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}