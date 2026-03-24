import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function AdminFileRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ client_email: '', title: '', description: '' });
  const [users, setUsers] = useState([]);

  const load = async () => {
    const [data, userList] = await Promise.all([
      base44.entities.FileRequest.list('-created_date'),
      base44.entities.User.list(),
    ]);
    setRequests(data);
    setUsers(userList.filter(u => u.role !== 'admin'));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.client_email || !form.title) return;
    await base44.entities.FileRequest.create(form);
    toast.success('בקשת מסמך נוצרה');
    setForm({ client_email: '', title: '', description: '' });
    setOpen(false);
    load();
  };

  const handleStatusUpdate = async (id, status) => {
    await base44.entities.FileRequest.update(id, { status });
    toast.success('הסטטוס עודכן');
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.FileRequest.delete(id);
    toast.success('הבקשה נמחקה');
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">בקשות מסמכים</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />בקשה חדשה</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>בקשת מסמך חדשה</DialogTitle></DialogHeader>
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
                <Label>שם המסמך</Label>
                <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder='למשל: תלוש משכורת' className="mt-1" />
              </div>
              <div>
                <Label>תיאור / הערות</Label>
                <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="הוסף פרטים..." className="mt-1" />
              </div>
              <Button onClick={handleCreate} disabled={!form.client_email || !form.title} className="w-full">צור בקשה</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {requests.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
          אין בקשות מסמכים
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{req.title}</span>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{req.client_email}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    req.status === 'uploaded' ? 'bg-blue-50 text-blue-600' :
                    req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                    req.status === 'rejected' ? 'bg-red-50 text-red-600' :
                    'bg-amber-50 text-amber-600'
                  }`}>{req.status === 'pending' ? 'ממתין' : req.status === 'uploaded' ? 'הועלה' : req.status === 'approved' ? 'אושר' : 'נדחה'}</span>
                </div>
                {req.uploaded_file_url && (
                  <a href={req.uploaded_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 block">
                    {req.uploaded_file_name || 'צפה בקובץ'}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-1">
                {req.status === 'uploaded' && (
                  <>
                    <Button size="icon" variant="ghost" onClick={() => handleStatusUpdate(req.id, 'approved')} className="text-emerald-600 hover:bg-emerald-50">
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleStatusUpdate(req.id, 'rejected')} className="text-red-500 hover:bg-red-50">
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </>
                )}
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