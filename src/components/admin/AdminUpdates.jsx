import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const ADMIN_NOTIFICATIONS_EMAIL = '__admin__';
const EVENT_TYPE_REGEX = /\[\[admin_event:([a-z_]+)\]\]/i;
const CLIENT_REGEX = /\[\[client:([^\]]+)\]\]/i;

function parseAdminNotification(update) {
  const message = String(update?.message || '');
  const eventTypeMatch = message.match(EVENT_TYPE_REGEX);
  const clientMatch = message.match(CLIENT_REGEX);

  return {
    ...update,
    eventType: eventTypeMatch?.[1] || 'general',
    relatedClientEmail: clientMatch?.[1] || null,
    cleanMessage: message
      .replace(EVENT_TYPE_REGEX, '')
      .replace(CLIENT_REGEX, '')
      .trim(),
  };
}

export default function AdminUpdates({ selectedClient }) {
  const [updates, setUpdates] = useState([]);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [client, setClient] = useState(selectedClient === '_all' ? 'all' : selectedClient || '');
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      const [data, userList] = await Promise.all([
        base44.entities.ClientUpdate.filter({}, '-created_date'),
        base44.entities.User.filter({}),
      ]);

      const adminEvents = data.filter((item) => item.client_email === ADMIN_NOTIFICATIONS_EMAIL);
      const clientFacingUpdates = data.filter((item) => item.client_email !== ADMIN_NOTIFICATIONS_EMAIL);

      const filtered = (client === 'all' || !client)
        ? clientFacingUpdates
        : clientFacingUpdates.filter((u) => u.client_email === client);

      const parsedAdminEvents = adminEvents.map(parseAdminNotification);
      const filteredAdminEvents = (client === 'all' || !client)
        ? parsedAdminEvents
        : parsedAdminEvents.filter((event) => event.relatedClientEmail === client);

      setUpdates(filtered);
      setAdminNotifications(filteredAdminEvents);
      setUsers(userList.filter((u) => u.role !== 'admin'));
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const val = selectedClient && selectedClient !== '_all' ? selectedClient : 'all';
    setClient(val);
  }, [selectedClient]);

  useEffect(() => {
    load();
  }, [client]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);

    try {
      if (client === 'all') {
        await Promise.all(
          users.map(async (u) => {
            const update = await base44.entities.ClientUpdate.create({
              client_email: u.email,
              message: message.trim()
            });

            return base44.functions.invoke('sendUpdateEmail', {
              data: { ...update, app_url: window.location.origin }
            });
          })
        );
        toast.success('עדכון נשלח לכל הלקוחות');
      } else {
        if (!client) {
          setSending(false);
          return;
        }

        const update = await base44.entities.ClientUpdate.create({
          client_email: client,
          message: message.trim()
        });

        await base44.functions.invoke('sendUpdateEmail', {
          data: { ...update, app_url: window.location.origin }
        });

        toast.success('עדכון נשלח ללקוח ומייל נשלח בהצלחה');
      }

      setMessage('');
      load();
    } catch (err) {
      console.error(err);
      toast.error('העדכון נשמר אך שליחת המייל נכשלה');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.ClientUpdate.delete(id);
      toast.success('העדכון נמחק');
      load();
    } catch (err) {
      toast.error('מחיקה נכשלה');
    }
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <label className="text-sm font-medium">בחר לקוח</label>
        <Select value={client} onValueChange={setClient}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="בחר לקוח" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">📢 כל הלקוחות</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.email}>
                {u.full_name || u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {client && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">{client === 'all' ? 'שלח עדכון לכל הלקוחות' : 'שלח עדכון'}</h3>
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
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">התראות מערכת</h3>
            {adminNotifications.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
                אין התראות מערכת ללקוח זה
              </div>
            ) : (
              <div className="space-y-3">
                {adminNotifications.map((item) => (
                  <div key={item.id} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground break-words">{item.cleanMessage}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {item.created_date ? format(new Date(item.created_date), 'dd.MM.yyyy HH:mm', { locale: he }) : ''}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(item.id)}
                        className="text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-3">עדכונים ללקוח</h3>
            {updates.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
                אין עדכונים ללקוח זה
              </div>
            ) : (
              <div className="space-y-3">
                {updates.map((u) => (
                  <div key={u.id} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground break-words">{u.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {u.created_date ? format(new Date(u.created_date), 'dd.MM.yyyy HH:mm', { locale: he }) : ''}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(u.id)}
                        className="text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
