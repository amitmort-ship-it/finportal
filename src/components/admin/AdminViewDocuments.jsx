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
import { useAuth } from '@/lib/AuthContext';

function getInvokeError(result) {
  return (
    result?.error ||
    result?.data?.error ||
    result?.response?.data?.error ||
    null
  );
}

export default function AdminViewDocuments({ selectedClient }) {
  const { user } = useAuth();
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
    files: [],
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

  const getDefaultTitle = () => {
    if (!form.files.length) return '';
    if (form.files.length === 1) return form.files[0].name;
    return `מסמכים שהועלו ידנית (${form.files.length})`;
  };

  const handleManualUpload = async () => {
    if (!form.client_email || !form.files.length) {
      toast.error('בחר לקוח ובחר לפחות קובץ אחד');
      return;
    }

    setUploading(true);

    try {
      const resolvedTitle = form.title.trim() || getDefaultTitle();
      const driveResults = [];

      const uploadedFiles = await Promise.all(
        form.files.map(async (file) => {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });

          const driveRes = await base44.functions.invoke('uploadToDrive', {
            file_url,
            file_name: file.name,
            client_email: form.client_email,
            category: form.category || resolvedTitle,
            viewer_email: user?.email || null,
          });

          const invokeError = getInvokeError(driveRes);
          if (invokeError) {
            throw new Error(invokeError);
          }

          const drivePayload = driveRes?.data || driveRes;
          driveResults.push(drivePayload);
          console.log('uploadToDrive result', drivePayload);

          return {
            file_url,
            file_name: file.name,
            uploaded_by_email: 'admin',
            uploaded_by_name: 'הועלה על ידי המשרד',
            uploaded_at: new Date().toISOString(),
          };
        }),
      );

      await base44.entities.FileRequest.create({
        client_email: form.client_email,
        title: resolvedTitle,
        description: form.description,
        category: form.category || null,
        source: 'admin_upload',
        status: 'uploaded',
        uploaded_files: uploadedFiles,
      });

      console.log('uploadToDrive summary', driveResults);

      toast.success('המסמכים הועלו למערכת בשם הלקוח');

      setForm({
        client_email: selectedClient || '',
        title: '',
        description: '',
        category: '',
        files: [],
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
              <DialogTitle>העלאת מסמך בשם הלקוח</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div>
                <Label>לקוח</Label>
                <Select value={form.client_email} onValueChange={(value) => setForm((prev) => ({ ...prev, client_email: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="בחר לקוח" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((userItem) => (
                      <SelectItem key={userItem.id} value={userItem.email}>
                        {userItem.full_name || userItem.email}
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
                <Label>קבצים</Label>
                <label className="flex items-center gap-2 mt-1 border border-dashed border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-all">
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => setForm((prev) => ({ ...prev, files: Array.from(e.target.files || []) }))}
                    disabled={uploading}
                  />
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-sm text-muted-foreground">
                    {form.files.length === 0
                      ? 'בחר קובץ אחד או יותר'
                      : form.files.length === 1
                        ? form.files[0].name
                        : `נבחרו ${form.files.length} קבצים`}
                  </span>
                </label>

                {form.files.length > 1 ? (
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {form.files.map((file) => (
                      <div key={`${file.name}-${file.size}`}>{file.name}</div>
                    ))}
                  </div>
                ) : null}
              </div>

              <Button type="button" onClick={handleManualUpload} disabled={uploading || !form.client_email || !form.files.length} className="w-full gap-2">
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />מעלה...</> : 'העלה מסמכים'}
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
