import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function AdminUpdates({ selectedClient }) {
  const [updates, setUpdates] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [client, setClient] = useState(selectedClient || '');
  const [sending, setSending] = useState(false);

  const load = async () => {
    const [data, userList] = await Promise.all([
      base44.entities.ClientUpdate.list('-created_date'),
      base44.entities.User.list(),
    ]);
    const filtered = client ? data.filter(u => u.client_email === client) : data;
    setUpdates(filtered);
    setUsers(userList.filter(u => u.role !== 'admin'));
    setLoading(false);
  };

  useEffect(() => {
    setClient(selectedClient);
  }, [selectedClient]);

  useEffect(() => {
    load();
  }, [client]);

  const handleSend = async () => {
    if (!client || !message.trim()) return;
    setSending(true);
    await base44.entities.ClientUpdate.create({
      client_email: client,
      message: message.trim(),
    });
    toast.success('עדכון נשלח ללקוח');
    setMessage('');
    setSending(false);
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.ClientUpdate.delete(id);
    toast.success('העדכון נמחק');
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="mb-6">
        <label className="text-sm font-medium">בחר לקוח</label>
        <Select value={client} onValueChange={setClient}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="בחר לקוח" />
          </SelectTrigger>
          <SelectContent>
            {users.map(u => (
              <SelectItem key={u.id} value={u.email}>{u.full_name || u.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {client && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">שלח עדכון</h3>
          </div>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="כתוב עדכון עבור הלקוח..."
            className="mb-3 min-h-24"
          />
          <Button onClick={handleSend} disabled={!message.trim() || sending} className="gap-2">
            <Send className="w-4 h-4" />
            {sending ? 'שולח...' : 'שלח עדכון'}
          </Button>
        </div>
      )}

      {!client ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
          בחר לקוח כדי לשלוח עדכונים
        </div>
      ) : updates.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
          אין עדכונים לקוח זה
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map(u => (
            <div key={u.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-foreground break-words">{u.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(u.created_date), 'dd.MM.yyyy HH:mm', { locale: he })}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(u.id)} className="text-destructive hover:bg-destructive/10 shrink-0">
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