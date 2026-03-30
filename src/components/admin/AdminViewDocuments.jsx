import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Download, Upload, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function AdminViewDocuments({ selectedClient }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    client_email: '',
    title: '',
    description: '',
    category: '',
    file: null,
  });

  const load = async () => {
    const [data, clientRes] = await Promise.all([
      base44.entities.FileRequest.filter({}, '-created_date'),
      base44.functions.invoke('getAllClients', {}),
    ]);
    const filtered = selectedClient ? data.filter((r) => r.client_email === selectedClient) : data;
    const withFiles = filtered.filter((r) => r.uploaded_files && r.uploaded_files.length > 0);
    setRequests(withFiles);
    setUsers(clientRes.data?.profiles || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [selectedClient]);

  useEffect(() => {
    if (selectedClient) {
      setForm((prev) => ({ ...prev, client_email: selectedClient }));
    }
  }, [selectedClient]);

  const handleManualUpload = async () => {
    if (!form.client_email || !form.title || !form.file) {
      toast.error('בחר לקוח, הזן שם מסמך ובחר קובץ');
      return;
    }

    setUploading(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: form.file });

      await base44.entities.FileRequest.create({
        client_email: form.client_email,
        title: form.title,
        description: form.description,
        category: form.category || null,
        status: 'uploaded',
        uploaded_files: [
          {
            file_url,
            file_name: form.file.name,
            uploaded_by_email: 'admin',
            uploaded_by_name: 'הועלה על ידי המשרד',
            uploaded_at: new Date().toISOString(),
          },
        ],
      });

      base44.functions.invoke('uploadToDrive', {
        file_url,
        file_name: form.file.name,
        client_email: form.client_email,
        category: form.category || form.title,
      }).catch((err) => console.error('Drive upload failed:', err));

      toast.success('המסמך הועלה למערכת בשם הלקוח');
      setForm({
        client_email: selectedClient || '',
        title: '',
        description: '',
        category: '',
        file: null,
      });
      setOpen(false);
      await load();
    } catch (error) {
      console.error(error);
      toast.error('שגיאה בהעלאת המסמך');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">המסמכים שהועלו</h2>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              העלה בשם הלקוח
            </Button>
          </DialogTrigger>

          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>העלאת מסמך אישי בשם הלקוח</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div>
                <Label>לקוח</Label>
                <Select value={form.client_email} onValueChange={(value) => setForm((prev) => ({ ...prev, client_email: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="בחר לקוח" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.email}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>שם המסמך</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="למשל: תלושי שכר"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>קטגוריה</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="אופציונלי"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>הערות</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="הערות פנימיות או תיאור למסמך"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>קובץ</Label>
                <label className="flex items-center gap-2 mt-1 border border-dashed border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-all">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                    disabled={uploading}
                  />
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-sm text-muted-foreground">{form.file?.name || 'בחר קובץ'}</span>
                </label>
              </div>

              <Button type="button" onClick={handleManualUpload} disabled={uploading || !form.client_email || !form.title || !form.file} className="w-full gap-2">
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />מעלה...</> : 'העלה מסמך'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {requests.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
          אין בקשות מסמכים
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="font-semibold">{req.title}</div>
                  <div className="text-sm text-muted-foreground">{req.client_email}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                  req.status === 'uploaded' ? 'bg-blue-50 text-blue-600' :
                  req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                  req.status === 'rejected' ? 'bg-red-50 text-red-600' :
                  'bg-amber-50 text-amber-600'
                }`}>
                  {req.status === 'pending' ? 'ממתין' : req.status === 'uploaded' ? 'הועלה' : req.status === 'approved' ? 'אושר' : 'נדחה'}
                </span>
              </div>

              {req.uploaded_files && req.uploaded_files.length > 0 ? (
                <div className="space-y-2">
                  {req.uploaded_files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50">
                      <Download className="w-4 h-4 text-primary shrink-0" />
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline flex-1"
                      >
                        {file.file_name}
                      </a>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
