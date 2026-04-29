import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink } from 'lucide-react';
import { Suspense, lazy } from 'react';

const AdminClients = lazy(() =>
  import('../components/admin/AdminClients').catch(() => ({
    default: () => <div className="text-red-500 p-4">שגיאה בטעינת מנהל הלקוחות</div>,
  }))
);
const AdminCollaterals = lazy(() =>
  import('../components/admin/AdminCollaterals').catch(() => ({
    default: () => <div className="text-red-500 p-4">שגיאה בטעינת בטחונות</div>,
  }))
);
const AdminPackages = lazy(() =>
  import('../components/admin/AdminPackages').catch(() => ({
    default: () => <div className="text-red-500 p-4">שגיאה בטעינת תמהיל</div>,
  }))
);
const AdminBankApprovals = lazy(() =>
  import('../components/admin/AdminBankApprovals').catch(() => ({
    default: () => <div className="text-red-500 p-4">שגיאה בטעינת אישורים</div>,
  }))
);
const AdminProcessStage = lazy(() =>
  import('../components/admin/AdminProcessStage').catch(() => ({
    default: () => <div className="text-red-500 p-4">שגיאה בטעינת שלב</div>,
  }))
);
const AdminUpdates = lazy(() =>
  import('../components/admin/AdminUpdates').catch(() => ({
    default: () => <div className="text-red-500 p-4">שגיאה בטעינת עדכונים</div>,
  }))
);
const AdminViewDocuments = lazy(() =>
  import('../components/admin/AdminViewDocuments').catch(() => ({
    default: () => <div className="text-red-500 p-4">שגיאה בטעינת מסמכים</div>,
  }))
);
const AdminNotifications = lazy(() =>
  import('../components/admin/AdminNotifications').catch(() => ({
    default: () => <div className="text-red-500 p-4">שגיאה בטעינת התראות</div>,
  }))
);
const AdminBusiness = lazy(() =>
  import('../components/admin/AdminBusiness').catch(() => ({
    default: () => <div className="text-red-500 p-4">שגיאה בטעינת ניהול עסק</div>,
  }))
);
import AdminColorPicker, { useAdminPalette } from '../components/admin/AdminColorPicker';
import DailyQuote from '../components/admin/DailyQuote';
import ClientsByStageTable from '../components/admin/ClientsByStageTable';
import AdminMarketRates from '../components/admin/AdminMarketRates';
import RefinanceMonitor from '../components/admin/RefinanceMonitor';

const EVENT_TYPE_REGEX = /\[\[admin_event:([a-z_]+)\]\]/i;
const CLIENT_REGEX = /\[\[client:([^\]]+)\]\]/i;

function buildFileUploadNotifications(requests) {
  return (requests || [])
    .filter((request) => Array.isArray(request.uploaded_files) && request.uploaded_files.length > 0)
    .map((request) => {
      const nonAdminFiles = request.uploaded_files.filter((file) => (
        file?.uploaded_by_email !== 'admin' &&
        file?.uploaded_by_name !== 'הועלה על ידי המשרד'
      ));

      if (!nonAdminFiles.length) return null;

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

function ClientSearchSelector({ users, selectedClient, onSelect }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selectedUser = users.find(u => u.email === selectedClient);
  const displayValue = selectedUser ? (selectedUser.full_name || selectedUser.email) : '';

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (u.full_name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (email) => {
    onSelect(email === '_all' ? null : email);
    setSearch('');
    setOpen(false);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-6" ref={ref}>
      <Label className="text-sm block mb-2">בחר לקוח (אופציונלי)</Label>
      <div className="relative w-full md:w-80">
        <div
          className="flex items-center border border-input rounded-md bg-background px-3 h-9 cursor-pointer"
          onClick={() => setOpen(o => !o)}
        >
          {open ? (
            <Input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              placeholder="חפש לקוח..."
              className="border-0 shadow-none h-7 p-0 focus-visible:ring-0 bg-transparent flex-1"
              dir="rtl"
            />
          ) : (
            <span className={`flex-1 text-sm ${selectedClient ? 'text-foreground' : 'text-muted-foreground'}`}>
              {selectedClient ? displayValue : 'כל הלקוחות'}
            </span>
          )}
          <div className="flex items-center gap-1 mr-1">
            {selectedClient && !open && (
              <X
                className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground"
                onClick={e => { e.stopPropagation(); onSelect(null); }}
              />
            )}
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {open && (
          <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-60 overflow-y-auto">
            <div
              className="px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded-sm"
              onClick={() => handleSelect('_all')}
            >
              כל הלקוחות
            </div>
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">לא נמצאו לקוחות</div>
            ) : filtered.map(u => (
              <div
                key={u.id}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded-sm ${selectedClient === u.email ? 'bg-accent font-medium' : ''}`}
                onClick={() => handleSelect(u.email)}
              >
                <div>{u.full_name || u.email}</div>
                {u.full_name && <div className="text-xs text-muted-foreground">{u.email}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPanel() {
  useAdminPalette();
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState(null);
  const [users, setUsers] = useState([]);
  const [updatesBadgeCount, setUpdatesBadgeCount] = useState(0);
  const [activeTab, setActiveTab] = useState('home');

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
    <div>
      <div className="mb-8 space-y-3">
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
          <div className="h-4 w-px bg-border shrink-0" />
          <DailyQuote />
        </div>
      </div>

      <ClientSearchSelector
        users={users}
        selectedClient={selectedClient}
        onSelect={setSelectedClient}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto mb-6 h-auto justify-start">
          <TabsTrigger value="home" className="text-xs md:text-sm">ראשי</TabsTrigger>
          <TabsTrigger value="clients" className="text-xs md:text-sm">לקוחות</TabsTrigger>
          <TabsTrigger value="process" className="text-xs md:text-sm">שלב</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs md:text-sm">מסמכים</TabsTrigger>
          <TabsTrigger value="packages" className="text-xs md:text-sm">תמהיל</TabsTrigger>
          <TabsTrigger value="approvals" className="text-xs md:text-sm">אישורים</TabsTrigger>
          <TabsTrigger value="collaterals" className="text-xs md:text-sm">בטחונות</TabsTrigger>
          <TabsTrigger value="updates" className="text-xs md:text-sm gap-1.5">
            <span>עדכונים</span>
            {updatesBadgeCount > 0 ? (
              <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] px-1.5">
                {updatesBadgeCount > 99 ? '99+' : updatesBadgeCount}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="business" className="text-xs md:text-sm">ניהול עסק</TabsTrigger>
        </TabsList>

        <TabsContent value="home">
          <RefinanceMonitor />
          <ClientsByStageTable onSelectClient={setSelectedClient} />
          <AdminNotifications selectedClient={selectedClient} />
          <Suspense fallback={<div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>}>
            <AdminClients />
          </Suspense>
        </TabsContent>

        <TabsContent value="clients">
          <Suspense fallback={<div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>}>
            <AdminClients />
          </Suspense>
        </TabsContent>

        <TabsContent value="documents">
          <Suspense fallback={<div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>}>
            <AdminViewDocuments selectedClient={selectedClient} />
          </Suspense>
        </TabsContent>

        <TabsContent value="collaterals">
          <Suspense fallback={<div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>}>
            <AdminCollaterals selectedClient={selectedClient} />
          </Suspense>
        </TabsContent>

        <TabsContent value="packages">
          <Suspense fallback={<div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>}>
            <AdminPackages selectedClient={selectedClient} />
          </Suspense>
        </TabsContent>

        <TabsContent value="approvals">
          <Suspense fallback={<div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>}>
            <AdminBankApprovals selectedClient={selectedClient} />
          </Suspense>
        </TabsContent>

        <TabsContent value="process">
          <Suspense fallback={<div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>}>
            <AdminProcessStage selectedClient={selectedClient} />
          </Suspense>
        </TabsContent>

        <TabsContent value="business">
          <Suspense fallback={<div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>}>
            <AdminBusiness />
          </Suspense>
        </TabsContent>

        <TabsContent value="updates">
          <Suspense fallback={<div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>}>
            <AdminUpdates selectedClient={selectedClient} />
          </Suspense>
          <div className="mt-8">
            <AdminMarketRates />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}