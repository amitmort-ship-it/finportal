import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, FileUp, LogIn, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';

const ADMIN_NOTIFICATIONS_EMAIL = '__admin__';
const EVENT_TYPE_REGEX = /\[\[admin_event:([a-z_]+)\]\]/i;
const CLIENT_REGEX = /\[\[client:([^\]]+)\]\]/i;

function parseNotification(update) {
  const message = String(update?.message || '');
  const eventTypeMatch = message.match(EVENT_TYPE_REGEX);
  const clientMatch = message.match(CLIENT_REGEX);
  const cleanMessage = message
    .replace(EVENT_TYPE_REGEX, '')
    .replace(CLIENT_REGEX, '')
    .trim();

  return {
    id: update.id,
    type: eventTypeMatch?.[1] || 'general',
    clientEmail: clientMatch?.[1] || null,
    message: cleanMessage,
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
        type: 'file_upload',
        clientEmail: request.client_email,
        message: `${latestFile?.uploaded_by_name || latestFile?.uploaded_by_email || 'לקוח'} העלה/תה מסמך: ${latestFile?.file_name || request.title}`,
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
      type: 'login',
      clientEmail: profile.email,
      message: `${profile.last_login_user_name || profile.last_login_user_email || profile.full_name || profile.email} נכנס/ה למערכת עבור תיק ${profile.full_name || profile.email}`,
      createdAt: profile.last_login_at,
      source: 'profile_login',
    }));
}

function getNotificationIcon(type) {
  if (type === 'login') return LogIn;
  if (type === 'file_upload') return FileUp;
  return Bell;
}

function getNotificationStyles(type) {
  if (type === 'login') {
    return {
      card: 'border-sky-200 bg-sky-50/80 dark:border-sky-900/40 dark:bg-sky-950/25',
      iconWrap: 'bg-sky-100 dark:bg-sky-950/40',
      icon: 'text-sky-700 dark:text-sky-300',
      badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
      label: 'כניסה למערכת',
    };
  }

  if (type === 'file_upload') {
    return {
      card: 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/25',
      iconWrap: 'bg-emerald-100 dark:bg-emerald-950/40',
      icon: 'text-emerald-700 dark:text-emerald-300',
      badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
      label: 'העלאת מסמך',
    };
  }

  return {
    card: 'border-border bg-muted/20',
    iconWrap: 'bg-primary/10',
    icon: 'text-primary',
    badge: 'bg-muted text-muted-foreground',
    label: 'התראה',
  };
}

export default function AdminNotifications({ selectedClient }) {
  const [notifications, setNotifications] = useState([]);
  const [clientNames, setClientNames] = useState({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [updates, fileRequests, profiles] = await Promise.all([
        base44.entities.ClientUpdate.filter({}, '-created_date'),
        base44.entities.FileRequest.filter({}, '-created_date'),
        base44.entities.ClientProfile.filter({}),
      ]);

      const profileMap = Object.fromEntries(
        (profiles || []).map((profile) => [String(profile.email || '').toLowerCase(), profile.full_name || profile.email]),
      );

      const loginNotifications = buildLoginNotificationsFromProfiles(profiles);

      const fileUploadNotifications = buildFileUploadNotifications(fileRequests);

      const merged = [...fileUploadNotifications, ...loginNotifications]
        .filter((item) => !selectedClient || item.clientEmail === selectedClient)
        .sort((a, b) => {
          const aDate = new Date(a.createdAt || 0).getTime();
          const bDate = new Date(b.createdAt || 0).getTime();
          return bDate - aDate;
        });

      setClientNames(profileMap);
      setNotifications(merged);
    } catch (error) {
      console.error('Failed to load admin notifications:', error);
      toast.error('שגיאה בטעינת ההתראות');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedClient]);

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
  }, [selectedClient]);

  const handleDelete = async (notification) => {
    if (notification.source !== 'client_update') {
      toast.error('התראת העלאת מסמך נמחקת מתוך בקשת המסמך עצמה, לא מכאן');
      return;
    }

    try {
      await base44.entities.ClientUpdate.delete(notification.id);
      setNotifications((prev) => prev.filter((item) => item.id !== notification.id));
      toast.success('ההתראה הוסרה');
    } catch (error) {
      console.error(error);
      toast.error('מחיקה נכשלה');
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex justify-center py-6">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">התראות לקוח</h2>
      </div>

      {notifications.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6">
          אין התראות חדשות כרגע
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto pr-1 space-y-3">
          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const styles = getNotificationStyles(notification.type);
            const clientKey = String(notification.clientEmail || '').toLowerCase();
            const clientLabel = clientNames[clientKey] || notification.clientEmail || 'לא ידוע';

            return (
              <div key={notification.id} className={`rounded-xl border p-4 ${styles.card}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`rounded-full p-2 shrink-0 ${styles.iconWrap}`}>
                      <Icon className={`w-4 h-4 ${styles.icon}`} />
                    </div>
                    <div className="min-w-0">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium mb-2 ${styles.badge}`}>
                        {styles.label}
                      </span>
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        תיק לקוח: {clientLabel}
                      </div>
                      <p className="text-sm text-foreground dark:text-slate-100 break-words">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.createdAt
                          ? format(new Date(notification.createdAt), 'dd.MM.yyyy HH:mm', { locale: he })
                          : ''}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(notification)}
                    className="text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 shrink-0"
                    disabled={notification.source !== 'client_update'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
