import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink } from 'lucide-react';
import AdminClients from '../components/admin/AdminClients';
import AdminDocumentRequest from '../components/admin/AdminDocumentRequest';
import AdminCollaterals from '../components/admin/AdminCollaterals';
import AdminPackages from '../components/admin/AdminPackages';
import AdminBankApprovals from '../components/admin/AdminBankApprovals';
import AdminProcessStage from '../components/admin/AdminProcessStage';
import AdminUpdates from '../components/admin/AdminUpdates';
import AdminViewDocuments from '../components/admin/AdminViewDocuments';
import AdminNotifications from '../components/admin/AdminNotifications';

const ADMIN_NOTIFICATIONS_EMAIL = '__admin__';
const EVENT_TYPE_REGEX = /\[\[admin_event:([a-z_]+)\]\]/i;
const CLIENT_REGEX = /\[\[client:([^\]]+)\]\]/i;

function parseAdminNotification(update) {
  const message = String(update?.message || '');
  const eventTypeMatch = message.match(EVENT_TYPE_REGEX);
  const clientMatch = message.match(CLIENT_REGEX);

  return {
    id: update.id,
    type: eventTypeMatch?.[1] || 'general',
    clientEmail: clientMatch?.[1] || null,
    createdAt: update.created_date || null,
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
        createdAt: latestFile?.uploaded_at || request.updated_date || request.created_date || null,
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
      createdAt: profile.last_login_at,
    }));
}

export default function AdminPanel() {
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState(null);
  const [users, setUsers] = useState([]);
  const [updatesBadgeCount, setUpdatesBadgeCount] = useState(0);
  const [activeTab, setActiveTab] = useState('clients');

  useEffect(() => {
    const load = async () => {
      const profiles = await base44.entities.ClientProfile.filter({}, '-created_date');
      setUsers(profiles);
    };
    load();
  }, []);

  useEffect(() => {
    const loadNotificationCount = async () => {
      try {
        const [updates, fileRequests, profiles] = await Promise.all([
          base44.entities.ClientUpdate.filter({}, '-created_date'),
          base44.entities.FileRequest.filter({}, '-created_date'),
          base44.entities.ClientProfile.filter({}),
        ]);

        const loginNotifications = buildLoginNotificationsFromProfiles(profiles);
        const fileUploadNotifications = buildFileUploadNotifications(fileRequests);

        const merged = [...loginNotifications, ...fileUploadNotifications]
          .filter((item) => !selectedClient || item.clientEmail === selectedClient)
          .sort((a, b) => {
            const aDate = new Date(a.createdAt || 0).getTime();
            const bDate = new Date(b.createdAt || 0).getTime();
            return bDate - aDate;
          });

        const lastSeenAt = Number(localStorage.getItem('admin-updates-last-seen-at') || 0);
        const unreadCount = merged.filter((item) => {
          const createdAt = new Date(item.createdAt || 0).getTime();
          return createdAt > lastSeenAt;
        }).length;

        setUpdatesBadgeCount(unreadCount);
      } catch (error) {
        console.error('Failed to load admin badge count:', error);
      }
    };

    loadNotificationCount();

    const unsubscribeUpdates = base44.entities.ClientUpdate.subscribe(() => {
      loadNotificationCount();
    });

    const unsubscribeFiles = base44.entities.FileRequest.subscribe(() => {
      loadNotificationCount();
    });

    const unsubscribeProfiles = base44.entities.ClientProfile.subscribe(() => {
      loadNotificationCount();
    });

    return () => {
      if (typeof unsubscribeUpdates === 'function') unsubscribeUpdates();
      if (typeof unsubscribeFiles === 'function') unsubscribeFiles();
      if (typeof unsubscribeProfiles === 'function') unsubscribeProfiles();
    };
  }, [selectedClient]);

  useEffect(() => {
    if (activeTab === 'updates') {
      const now = Date.now();
      localStorage.setItem('admin-updates-last-seen-at', String(now));
      setUpdatesBadgeCount(0);
    }
  }, [activeTab]);

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">לוח ניהול</h1>
          <p className="text-muted-foreground mt-1">ניהול לקוחות, מסמכים, אישורים ובטחונות</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            className="gap-2 bg-red-600 hover:bg-red-700 text-white"
            onClick={() => window.open('https://555.co.il/pearl/apps/cooperation-landing-page/homeStep?attentionCode=406&cooperationCode=3618', '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="w-4 h-4" />
            ביטוח ישיר
          </Button>

          <Button
            type="button"
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => window.open('https://www.paperless.tax/admin/dashboard;sUserID=nhgp95igmi', '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="w-4 h-4" />
            Paperless
          </Button>

          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => window.open('https://www.snpv.co.il/clients', '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="w-4 h-4" />
            SmartNPV
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <Label className="text-sm block mb-2">בחר לקוח (אופציונלי)</Label>
        <Select value={selectedClient || '_all'} onValueChange={(v) => setSelectedClient(v === '_all' ? null : v)}>
          <SelectTrigger className="w-full md:w-80">
            <SelectValue placeholder="כל הלקוחות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">כל הלקוחות</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.email}>
                {u.full_name || u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:grid-cols-8 mb-6 h-auto">
          <TabsTrigger value="clients" className="text-xs md:text-sm">לקוחות</TabsTrigger>
          <TabsTrigger value="document-request" className="text-xs md:text-sm">בקש מסמכים</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs md:text-sm">מסמכים</TabsTrigger>
          <TabsTrigger value="collaterals" className="text-xs md:text-sm">בטחונות</TabsTrigger>
          <TabsTrigger value="packages" className="text-xs md:text-sm">תמהיל</TabsTrigger>
          <TabsTrigger value="approvals" className="text-xs md:text-sm">אישורים</TabsTrigger>
          <TabsTrigger value="process" className="text-xs md:text-sm">שלב</TabsTrigger>
          <TabsTrigger value="updates" className="text-xs md:text-sm gap-1.5">
            <span>עדכונים</span>
            {updatesBadgeCount > 0 ? (
              <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] px-1.5">
                {updatesBadgeCount > 99 ? '99+' : updatesBadgeCount}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <AdminNotifications selectedClient={selectedClient} />
          <AdminClients />
        </TabsContent>

        <TabsContent value="document-request">
          <AdminDocumentRequest selectedClient={selectedClient} onClientChange={setSelectedClient} />
        </TabsContent>

        <TabsContent value="documents">
          <AdminViewDocuments selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="collaterals">
          <AdminCollaterals selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="packages">
          <AdminPackages selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="approvals">
          <AdminBankApprovals selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="process">
          <AdminProcessStage selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="updates">
          <AdminUpdates selectedClient={selectedClient} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
