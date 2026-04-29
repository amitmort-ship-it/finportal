import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AdminClients from '@/components/admin/AdminClients';
import AdminNotifications from '@/components/admin/AdminNotifications';
import AdminBankApprovals from '@/components/admin/AdminBankApprovals';
import AdminViewDocuments from '@/components/admin/AdminViewDocuments';
import AdminPackages from '@/components/admin/AdminPackages';
import AdminCollaterals from '@/components/admin/AdminCollaterals';
import AdminProcessStage from '@/components/admin/AdminProcessStage';
import AdminUpdates from '@/components/admin/AdminUpdates';
import AdminBusiness from '@/components/admin/AdminBusiness';
import AdminColorPicker, { useAdminPalette } from '@/components/admin/AdminColorPicker';
import ClientsByStageTable from '@/components/admin/ClientsByStageTable';
import RefinanceMonitor from '@/components/admin/RefinanceMonitor';

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
  const [activeTab, setActiveTab] = useState('home');

  useAdminPalette();

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
        const [fileRequests, profiles] = await Promise.all([
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

    const unsubscribeFiles = base44.entities.FileRequest.subscribe(() => {
      loadNotificationCount();
    });

    const unsubscribeProfiles = base44.entities.ClientProfile.subscribe(() => {
      loadNotificationCount();
    });

    return () => {
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
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">לוח ניהול</h1>
            <p className="text-muted-foreground mt-1">ניהול לקוחות, מסמכים, אישורים ובטחונות</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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
              className="gap-2 bg-neutral-800 hover:bg-neutral-700 text-white"
              onClick={() => window.open('https://www.notion.so/304051ce360080539d38c4a852b964cb?v=304051ce360081b2a665000cdc320bfc', '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="w-4 h-4" />
              Notion
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
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => window.open('https://www.snpv.co.il/clients', '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="w-4 h-4" />
              SmartNPV
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <AdminColorPicker />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <Label className="text-sm block mb-2">בחר לקוח (אופציונלי)</Label>
        <Select value={selectedClient || '_all'} onValueChange={(value) => setSelectedClient(value === '_all' ? null : value)}>
          <SelectTrigger className="w-full md:w-80">
            <SelectValue placeholder="כל הלקוחות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">כל הלקוחות</SelectItem>
            {users.map((item) => (
              <SelectItem key={item.id} value={item.email}>
                {item.full_name || item.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:grid-cols-9 mb-6 h-auto">
          <TabsTrigger value="home" className="text-xs md:text-sm">ראשי</TabsTrigger>
          <TabsTrigger value="business" className="text-xs md:text-sm">ניהול עסק</TabsTrigger>
          <TabsTrigger value="clients" className="text-xs md:text-sm">לקוחות</TabsTrigger>
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

        <TabsContent value="home" className="space-y-6">
          <RefinanceMonitor />
          <ClientsByStageTable onSelectClient={setSelectedClient} />
          <AdminNotifications selectedClient={selectedClient} />
          <AdminClients />
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <AdminBusiness />
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <AdminClients />
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <AdminViewDocuments selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="collaterals" className="space-y-6">
          <AdminCollaterals selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="packages" className="space-y-6">
          <AdminPackages selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <AdminBankApprovals selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="process" className="space-y-6">
          <AdminProcessStage selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="updates" className="space-y-6">
          <AdminNotifications selectedClient={selectedClient} />
          <div className="mt-8">
            <AdminUpdates selectedClient={selectedClient} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
