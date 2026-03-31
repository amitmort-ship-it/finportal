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

function getNotificationIcon(type) {
  if (type === 'login') return LogIn;
  if (type === 'file_upload') return FileUp;
  return Bell;
}

export default function AdminNotifications({ selectedClient }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [updates, fileRequests] = await Promise.all([
        base44.entities.ClientUpdate.filter({}, '-created_date'),
        base44.entities.FileRequest.filter({}, '-created_date'),
      ]);

      const loginNotifications = (updates || [])
        .filter((item) => item.client_email === ADMIN_NOTIFICATIONS_EMAIL)
        .map(parseNotification);

      const fileUploadNotifications = buildFileUploadNotifications(fileRequests);

      const merged = [...fileUploadNotifications, ...loginNotifications]
        .filter((item) => !selectedClient || item.clientEmail === selectedClient)
        .sort((a, b) => {
          const aDate = new Date(a.createdAt || 0).getTime();
          const bDate = new Date(b.createdAt || 0).getTime();
          return bDate - aDate;
        });

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

    return () => {
      if (typeof unsubscribeUpdates === 'function') unsubscribeUpdates();
      if (typeof unsubscribeFiles === 'function') unsubscribeFiles();
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
        <div className="space-y-3">
          {notifications.slice(0, 10).map((notification) => {
            const Icon = getNotificationIcon(notification.type);

            return (
              <div key={notification.id} className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground break-words">{notification.message}</p>
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
                    className="text-destructive hover:bg-destructive/10 shrink-0"
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
