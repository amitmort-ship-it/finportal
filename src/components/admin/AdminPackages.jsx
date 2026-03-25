import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Plus, Trash2, Upload, Image, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function AdminPackages({ selectedClient }) {
  const [packages, setPackages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ client_email: '', title: '', description: '', notes: '' });
  const [docFile, setDocFile] = useState(null);
  const [screenshots, setScreenshots] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [pkgs, clientRes] = await Promise.all([
        base44.entities.SelectedPackage.filter({}, '-created_date'),
        base44.functions.invoke('getAllClients', {}),
      ]);
      const userList = clientRes.data?.profiles || [];
      setPackages(selectedClient ? pkgs.filter(p => p.client_email === selectedClient) : pkgs);
      setUsers(userList);
      setLoading(false);
    };
    load();
  }, [selectedClient]);

  useEffect(() => {
    if (selectedClient) setForm(f => ({ ...f, client_email: selectedClient }));
  }, [selectedClient]);

  const handleSubmit = async () => {
    if (!form.client_email || !form.title) {
      toast.error('בחר לקוח והכנס כותרת');
      return;
    }
    setUploading(true);

    let file_url = null, file_name = null;
    if (docFile) {
      const res = await base44.integrations.Core.UploadFile({ file: docFile });
      file_url = res.file_url;
      file_name = docFile.name;
    }

    const uploadedScreenshots = [];
    for (const sc of screenshots) {
      const res = await base44.integrations.Core.UploadFile({ file: sc });
      uploadedScreenshots.push({ url: res.file_url, name: sc.name });
    }

    await base44.entities.SelectedPackage.create({
      ...form,
      file_url,
      file_name,
      screenshots: uploadedScreenshots,
    });

    toast.success('התמהיל הועלה בהצלחה');
    setOpen(false);
    setForm({ client_email: selectedClient || '', title: '', description: '', notes: '' });
    setDocFile(null);
    setScreenshots([]);
    setUploading(false);

    const pkgs = await base44.entities.SelectedPackage.filter({}, '-created_date');
    setPackages(selectedClient ? pkgs.filter(p => p.client_email === selectedClient) : pkgs);
  };

  const handleDelete = async (id) => {
    await base44.entities.SelectedPackage.delete(id);
    toast.success('התמהיל נמחק');
    setPackages(prev => prev.filter(p => p.id !== id));
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">ניהול תמהיל</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />העלה תמהיל</Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader>
              <DialogTitle>העלאת תמהיל ללקוח</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>לקוח</Label>
                <Select value={form.client_email} onValueChange={v => setForm(f => ({ ...f, client_email: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="בחר לקוח" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => <SelectItem key={u.id} value={u.email}>{u.full_name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>כותרת</Label>
                <Input className="mt-1" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="למשל: תמהיל מסלולים מומלץ" />
              </div>

              <div>
                <Label>תיאור (אופציונלי)</Label>
                <Input className="mt-1" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="פירוט קצר" />
              </div>

              <div>
                <Label>הערות (אופציונלי)</Label>
                <Input className="mt-1" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="הערות נוספות" />
              </div>

              {/* Document upload */}
              <div>
                <Label className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4" />קובץ תמהיל (PDF / Word)</Label>
                <label className="flex items-center gap-3 border border-dashed border-border rounded-lg p-3 cursor-pointer hover:bg-muted/30 transition-all">
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx"
                    onChange={e => setDocFile(e.target.files?.[0] || null)} />
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{docFile ? docFile.name : 'לחץ לבחירת קובץ'}</span>
                </label>
              </div>

              {/* Screenshots upload */}
              <div>
                <Label className="flex items-center gap-2 mb-1"><Image className="w-4 h-4" />צילומי מסך של המסלולים / ריביות</Label>
                <label className="flex items-center gap-3 border border-dashed border-border rounded-lg p-3 cursor-pointer hover:bg-muted/30 transition-all">
                  <input type="file" className="hidden" accept="image/*" multiple
                    onChange={e => setScreenshots(Array.from(e.target.files))} />
                  <Image className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {screenshots.length > 0 ? `${screenshots.length} תמונות נבחרו` : 'לחץ לבחירת תמונות'}
                  </span>
                </label>
                {screenshots.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {screenshots.map((sc, i) => (
                      <span key={i} className="text-xs bg-muted px-2 py-1 rounded">{sc.name}</span>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={handleSubmit} disabled={uploading} className="w-full gap-2">
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />מעלה...</> : 'העלה תמהיל'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {packages.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">אין תמהילים עדיין</div>
      ) : (
        <div className="space-y-3">
          {packages.map(pkg => (
            <div key={pkg.id} className="bg-card rounded-xl border border-border p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{pkg.title}</div>
                <div className="text-sm text-muted-foreground">{pkg.client_email}</div>
                {pkg.description && <div className="text-sm text-muted-foreground mt-1">{pkg.description}</div>}
                <div className="flex flex-wrap gap-3 mt-2">
                  {pkg.file_url && (
                    <a href={pkg.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                      <FileText className="w-3 h-3" />{pkg.file_name || 'קובץ תמהיל'}
                    </a>
                  )}
                  {pkg.screenshots?.map((sc, i) => (
                    <a key={i} href={sc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Image className="w-3 h-3" />{sc.name || `צילום ${i + 1}`}
                    </a>
                  ))}
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(pkg.id)} className="text-destructive hover:bg-destructive/10 shrink-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}