import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Trash2, CheckCircle2, XCircle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function AdminFileRequests({ selectedClient }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ client_email: '', title: '', description: '' });
  const [users, setUsers] = useState([]);
  const [reviewNotes, setReviewNotes] = useState({});

  const load = async () => {
    const [data, clientRes] = await Promise.all([
      base44.entities.FileRequest.filter({}, '-created_date'),
      base44.functions.invoke('getAllClients', {}),
    ]);
    const filtered = selectedClient ? data.filter((r) => r.client_email === selectedClient) : data;
    setRequests(filtered);
    setReviewNotes(Object.fromEntries(filtered.map((request) => [request.id, request.admin_review_notes || ''])));
    const userList = clientRes.data?.profiles || [];
    setUsers(userList);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [selectedClient]);

  const handleCreate = async () => {
    if (!form.client_email || !form.title) return;
    await base44.entities.FileRequest.create(form);
    toast.success('בקשת מסמך נוצרה');
    setForm({ client_email: '', title: '', description: '' });
    setOpen(false);
    load();
  };

  const handleStatusUpdate = async (id, status) => {
    await base44.entities.FileRequest.update(id, {
      status,
      admin_review_notes: reviewNotes[id] || '',
    });
    toast.success('הסטטוס עודכן');
    load();
  };

  const handleNotesSave = async (id) => {
    await base44.entities.FileRequest.update(id, {
      admin_review_notes: reviewNotes[id] || '',
    });
    toast.success('ההערה נשמרה');
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.FileRequest.delete(id);
    toast.success('הבקשה נמחקה');
    load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">בקשות מסמכים</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              בקשה חדשה
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>בקשת מסמך חדשה</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>לקוח</Label>
                <Select value={form.client_email} onValueChange={(v) => setForm({ ...form, client_email: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="בחר לקוח" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.email}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>שם המסמך</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="למשל: תלוש משכורת"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>תיאור / הערות</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="הוסף פרטים..."
                  className="mt-1"
                />
              </div>
              <Button onClick={handleCreate} disabled={!form.client_email || !form.title} className="w-full">
                צור בקשה
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {requests.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">אין בקשות מסמכים</div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="bg-card rounded-xl border border-border p-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{req.title}</span>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{req.client_email}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      req.status === 'uploaded'
                        ? 'bg-blue-50 text-blue-600'
                        : req.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-600'
                          : req.status === 'rejected'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {req.status === 'pending'
                      ? 'ממתין'
                      : req.status === 'uploaded'
                        ? 'התקבל וממתין לבדיקה'
                        : req.status === 'approved'
                          ? 'אושר כתקין'
                          : 'נדרש תיקון / מסמך חדש'}
                  </span>
                </div>

                {req.description && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{req.description}</p>
                )}

                {req.uploaded_files && req.uploaded_files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {req.uploaded_files.map((file, idx) => (
                      <a key={idx} href={file.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline block">
                        📎 {file.file_name}
                      </a>
                    ))}
                  </div>
                )}

                {req.uploaded_files && req.uploaded_files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <Label htmlFor={`review-note-${req.id}`} className="text-xs text-muted-foreground">
                      הערת בדיקה פנימית / הערה ללקוח
                    </Label>
                    <Textarea
                      id={`review-note-${req.id}`}
                      value={reviewNotes[req.id] || ''}
                      onChange={(e) => setReviewNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                      placeholder="למשל: חסר ספח, הצילום לא קריא, צריך מסמך עדכני יותר..."
                      className="min-h-24"
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleNotesSave(req.id)} className="gap-2">
                        <Save className="w-4 h-4" />
                        שמור הערה
                      </Button>
                      {req.status === 'uploaded' || req.status === 'rejected' ? (
                        <Button size="sm" onClick={() => handleStatusUpdate(req.id, 'approved')} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                          <CheckCircle2 className="w-4 h-4" />
                          אשר כתקין
                        </Button>
                      ) : null}
                      {req.status === 'uploaded' || req.status === 'approved' ? (
                        <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(req.id, 'rejected')} className="gap-2">
                          <XCircle className="w-4 h-4" />
                          סמן כלא תקין
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )}

                {req.admin_review_notes ? (
                  <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground whitespace-pre-line">
                    <span className="font-medium text-foreground">הערת בדיקה:</span> {req.admin_review_notes}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => handleDelete(req.id)} className="text-destructive hover:bg-destructive/10">
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
