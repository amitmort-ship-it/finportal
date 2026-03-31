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
    ...update,
    eventType: eventTypeMatch?.[1] || 'general',
    relatedClientEmail: clientMatch?.[1] || null,
    cleanMessage,
  };
}

function getNotificationIcon(eventType) {
  if (eventType === 'login') return LogIn;
  if (eventType === 'file_upload') return FileUp;
  return Bell;
}

export default function AdminNotifications({ selectedClient }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await base44.entities.ClientUpdate.filter({}, '-created_date');

      const parsed = (data || [])
        .filter((item) => item.client_email === ADMIN_NOTIFICATIONS_EMAIL)
        .map(parseNotification);

      const filtered = selectedClient
        ? parsed.filter((item) => item.relatedClientEmail === selectedClient)
        : parsed;

      setNotifications(filtered);
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
    const unsubscribe = base44.entities.ClientUpdate.subscribe((event) => {
      if (event.type !== 'create' && event.type !== 'delete') return;
      load();
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [selectedClient]);

  const handleDelete = async (id) => {
    try {
      await base44.entities.ClientUpdate.delete(id);
      setNotifications((prev) => prev.filter((item) => item.id !== id));
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
            const Icon = getNotificationIcon(notification.eventType);

            return (
              <div key={notification.id} className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground break-words">{notification.cleanMessage}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.created_date
                          ? format(new Date(notification.created_date), 'dd.MM.yyyy HH:mm', { locale: he })
                          : ''}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(notification.id)}
                    className="text-destructive hover:bg-destructive/10 shrink-0"
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
