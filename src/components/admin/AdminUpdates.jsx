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
    id: update.id,
    eventType: eventTypeMatch?.[1] || 'general',
    relatedClientEmail: clientMatch?.[1] || null,
    cleanMessage: message
      .replace(EVENT_TYPE_REGEX, '')
      .replace(CLIENT_REGEX, '')
      .trim(),
    createdAt: update.created_date || null,
    source: 'client_update',
  };
}

function buildFileUploadNotifications(requests) {
  return (requests || [])
    .filter((request) => Array.isArray(request.uploaded_files) && request.uploaded_files.length > 0)
    .map((request) => {
      const nonAdminFiles = request.uploaded_files.filter((file) => (
        file?.uploaded_by_email !== 'admin' &&
        file?.uploaded_by_name !== 'הועלה על ידי המשרד'
      ));

      if (!nonAdminFiles.length) {
        return null;
      }

      const latestFile = [...nonAdminFiles].sort((a, b) => {
        const aDate = new Date(a?.uploaded_at || 0).getTime();
        const bDate = new Date(b?.uploaded_at || 0).getTime();
        return bDate - aDate;
      })[0];

      return {
        id: `file-request-${request.id}`,
        eventType: 'file_upload',
        relatedClientEmail: request.client_email,
        cleanMessage: `${latestFile?.uploaded_by_name || latestFile?.uploaded_by_email || 'לקוח'} העלה/תה מסמך: ${latestFile?.file_name || request.title}`,
        createdAt: latestFile?.uploaded_at || request.updated_date || request.created_date || null,
        source: 'file_request',
      };
    })
    .filter(Boolean);
}

function buildLoginNotificationsFromProfiles(profiles) {
  return (profiles || [])
    .filter((profile) => profile?.last_login_at)
    .map((profile) => ({
      id: `profile-login-${profile.id}`,
      eventType: 'login',
      relatedClientEmail: profile.email,
      cleanMessage: `${profile.last_login_user_name || profile.last_login_user_email || profile.full_name || profile.email} נכנס/ה למערכת עבור תיק ${profile.full_name || profile.email}`,
      createdAt: profile.last_login_at,
      source: 'profile_login',
    }));
}

function getNotificationStyles(eventType) {
  if (eventType === 'login') {
    return {
      card: 'border-sky-200 bg-sky-50/80 dark:border-sky-900/40 dark:bg-sky-950/25',
      badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
      label: 'כניסה למערכת',
    };
  }

  if (eventType === 'file_upload') {
    return {
      card: 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/25',
      badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
      label: 'העלאת מסמך',
    };
  }

  return {
    card: 'border-border bg-card',
    badge: 'bg-muted text-muted-foreground',
    label: 'התראה',
  };
}

export default function AdminUpdates({ selectedClient }) {
  const [updates, setUpdates] = useState([]);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [clientNames, setClientNames] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [client, setClient] = useState(selectedClient === '_all' ? 'all' : selectedClient || '');
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      const [data, fileRequests, userList, profiles] = await Promise.all([
        base44.entities.ClientUpdate.filter({}, '-created_date'),
        base44.entities.FileRequest.filter({}, '-created_date'),
        base44.entities.User.filter({}),
        base44.entities.ClientProfile.filter({}),
      ]);

      const profileMap = Object.fromEntries(
        (profiles || []).map((profile) => [String(profile.email || '').toLowerCase(), profile.full_name || profile.email]),
      );

      const clientFacingUpdates = data.filter((item) => item.client_email !== ADMIN_NOTIFICATIONS_EMAIL);
      const adminEvents = buildLoginNotificationsFromProfiles(profiles);
      const fileUploadEvents = buildFileUploadNotifications(fileRequests);

      const filteredUpdates = (client === 'all' || !client)
        ? clientFacingUpdates
        : clientFacingUpdates.filter((u) => u.client_email === client);

      const filteredAdminEvents = [...adminEvents, ...fileUploadEvents]
        .filter((event) => (client === 'all' || !client ? true : event.relatedClientEmail === client))
        .sort((a, b) => {
          const aDate = new Date(a.createdAt || 0).getTime();
          const bDate = new Date(b.createdAt || 0).getTime();
          return bDate - aDate;
        });

      setUpdates(filteredUpdates);
      setAdminNotifications(filteredAdminEvents);
      setClientNames(profileMap);
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

  const syncUpdateToNotion = async (update, userMap = {}) => {
    const response = await base44.functions.invoke('syncClientUpdateToNotion', {
      client_email: update.client_email,
      message: update.message,
      created_date: update.created_date,
      client_name: userMap[update.client_email] || update.client_email,
    });

    const notionError =
      response?.error ||
      response?.data?.error ||
      response?.response?.data?.error ||
      response?.data?.message ||
      response?.message ||
      null;

    if (notionError) {
      throw new Error(notionError);
    }

    return response;
  };

  useEffect(() => {
    const unsubscribeUpdates = base44.entities.ClientUpdate.subscribe(() => {
      load();
    });

    const unsubscribeFiles = base44.entities.FileRequest.subscribe(() => {
      load();
    });

    const unsubscribeProfiles = base44.entities.ClientProfile.subscribe(() => {
      load();
    });

    return () => {
      if (typeof unsubscribeUpdates === 'function') unsubscribeUpdates();
      if (typeof unsubscribeFiles === 'function') unsubscribeFiles();
      if (typeof unsubscribeProfiles === 'function') unsubscribeProfiles();
    };
  }, [client]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);

    try {
      const userMap = Object.fromEntries(
        users.map((u) => [String(u.email || '').toLowerCase(), u.full_name || u.email]),
      );

      if (client === 'all') {
        const results = await Promise.allSettled(
          users.map(async (u) => {
            const update = await base44.entities.ClientUpdate.create({
              client_email: u.email,
              message: message.trim(),
            });

            await syncUpdateToNotion(update, userMap);

            return base44.functions.invoke('sendUpdateEmail', {
              data: { ...update, app_url: window.location.origin },
            });
          }),
        );

        const failures = results.filter((item) => item.status === 'rejected');
        if (failures.length > 0) {
          throw new Error(`נכשל סנכרון עבור ${failures.length} לקוחות`);
        }

        toast.success('עדכון נשלח לכל הלקוחות וגם סונכרן לנושן');
      } else {
        if (!client) {
          setSending(false);
          return;
        }

        const update = await base44.entities.ClientUpdate.create({
          client_email: client,
          message: message.trim(),
        });

        await syncUpdateToNotion(update, userMap);

        await base44.functions.invoke('sendUpdateEmail', {
          data: { ...update, app_url: window.location.origin },
        });

        toast.success('העדכון נשלח ללקוח וסונכרן לנושן');
      }

      setMessage('');
      load();
    } catch (err) {
      console.error('Notion sync full error:', err);
      toast.error(String(err?.message || err || 'שגיאה לא ידועה'));
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (item) => {
    if (item.source !== 'client_update') {
      toast.error('התראת העלאת מסמך נמחקת מתוך בקשת המסמך עצמה, לא מכאן');
      return;
    }

    try {
      await base44.entities.ClientUpdate.delete(item.id);
      toast.success('העדכון נמחק');
      load();
    } catch (err) {
      toast.error('מחיקה נכשלה');
    }
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
              <div className="max-h-[420px] overflow-y-auto pr-1 space-y-3">
                {adminNotifications.map((item) => (
                  <div key={item.id} className={`rounded-xl border p-4 ${getNotificationStyles(item.eventType).card}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium mb-2 ${getNotificationStyles(item.eventType).badge}`}>
                          {getNotificationStyles(item.eventType).label}
                        </span>
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          תיק לקוח: {clientNames[String(item.relatedClientEmail || '').toLowerCase()] || item.relatedClientEmail || 'לא ידוע'}
                        </div>
                        <p className="text-foreground dark:text-slate-100 break-words">{item.cleanMessage}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {item.createdAt ? format(new Date(item.createdAt), 'dd.MM.yyyy HH:mm', { locale: he }) : ''}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(item)}
                        className="text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 shrink-0"
                        disabled={item.source !== 'client_update'}
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
              <div className="max-h-[420px] overflow-y-auto pr-1 space-y-3">
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
                        onClick={() => handleDelete({ ...u, source: 'client_update' })}
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
