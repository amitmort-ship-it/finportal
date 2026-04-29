import { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ExternalLink } from 'lucide-react';

const AdminClients = lazy(() => import('../components/admin/AdminClients'));
const AdminDocumentRequest = lazy(() => import('../components/admin/AdminDocumentRequest'));
const AdminCollaterals = lazy(() => import('../components/admin/AdminCollaterals'));
const AdminPackages = lazy(() => import('../components/admin/AdminPackages'));
const AdminBankApprovals = lazy(() => import('../components/admin/AdminBankApprovals'));
const AdminProcessStage = lazy(() => import('../components/admin/AdminProcessStage'));
const AdminUpdates = lazy(() => import('../components/admin/AdminUpdates'));
const AdminViewDocuments = lazy(() => import('../components/admin/AdminViewDocuments'));
const AdminNotifications = lazy(() => import('../components/admin/AdminNotifications'));

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

  const tabLoader = <div className="text-center py-8 text-muted-foreground">טוען...</div>;
  const tabButtonClass = (tabValue) => (
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      activeTab === tabValue
        ? 'bg-primary text-primary-foreground'
        : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
    }`
  );

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">לוח ניהול</h1>
          <p className="text-muted-foreground mt-1">ניהול לקוחות, מסמכים, אישורים ובטחונות</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
            onClick={() => window.open('https://555.co.il/pearl/apps/cooperation-landing-page/homeStep?attentionCode=406&cooperationCode=3618', '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="w-4 h-4" />
            ביטוח ישיר
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
            onClick={() => window.open('https://zero-budget-copy-9e612e99.base44.app/dashboard', '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="w-4 h-4" />
            ZeroBalance
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            onClick={() => window.open('https://www.paperless.tax/admin/dashboard;sUserID=nhgp95igmi', '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="w-4 h-4" />
            Paperless
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            onClick={() => window.open('https://www.snpv.co.il/clients', '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="w-4 h-4" />
            SmartNPV
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <label className="text-sm block mb-2">בחר לקוח (אופציונלי)</label>
        <select
          value={selectedClient || '_all'}
          onChange={(event) => setSelectedClient(event.target.value === '_all' ? null : event.target.value)}
          className="w-full md:w-80 h-10 rounded-md border border-input bg-background px-3 text-sm"
          dir="rtl"
        >
          <option value="_all">כל הלקוחות</option>
          {users.map((item) => (
            <option key={item.id} value={item.email}>
              {item.full_name || item.email}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => setActiveTab('clients')} className={tabButtonClass('clients')}>לקוחות</button>
        <button type="button" onClick={() => setActiveTab('document-request')} className={tabButtonClass('document-request')}>בקש מסמכים</button>
        <button type="button" onClick={() => setActiveTab('documents')} className={tabButtonClass('documents')}>מסמכים</button>
        <button type="button" onClick={() => setActiveTab('collaterals')} className={tabButtonClass('collaterals')}>בטחונות</button>
        <button type="button" onClick={() => setActiveTab('packages')} className={tabButtonClass('packages')}>תמהיל</button>
        <button type="button" onClick={() => setActiveTab('approvals')} className={tabButtonClass('approvals')}>אישורים</button>
        <button type="button" onClick={() => setActiveTab('process')} className={tabButtonClass('process')}>שלב</button>
        <button type="button" onClick={() => setActiveTab('updates')} className={tabButtonClass('updates')}>
          עדכונים
          {updatesBadgeCount > 0 ? (
            <span className="mr-2 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] px-1.5">
              {updatesBadgeCount > 99 ? '99+' : updatesBadgeCount}
            </span>
          ) : null}
        </button>
      </div>

      {activeTab === 'clients' ? (
        <Suspense fallback={tabLoader}>
          <AdminNotifications selectedClient={selectedClient} />
          <AdminClients />
        </Suspense>
      ) : null}

      {activeTab === 'document-request' ? (
        <Suspense fallback={tabLoader}>
          <AdminDocumentRequest selectedClient={selectedClient} onClientChange={setSelectedClient} />
        </Suspense>
      ) : null}

      {activeTab === 'documents' ? (
        <Suspense fallback={tabLoader}>
          <AdminViewDocuments selectedClient={selectedClient} />
        </Suspense>
      ) : null}

      {activeTab === 'collaterals' ? (
        <Suspense fallback={tabLoader}>
          <AdminCollaterals selectedClient={selectedClient} />
        </Suspense>
      ) : null}

      {activeTab === 'packages' ? (
        <Suspense fallback={tabLoader}>
          <AdminPackages selectedClient={selectedClient} />
        </Suspense>
      ) : null}

      {activeTab === 'approvals' ? (
        <Suspense fallback={tabLoader}>
          <AdminBankApprovals selectedClient={selectedClient} />
        </Suspense>
      ) : null}

      {activeTab === 'process' ? (
        <Suspense fallback={tabLoader}>
          <AdminProcessStage selectedClient={selectedClient} />
        </Suspense>
      ) : null}

      {activeTab === 'updates' ? (
        <Suspense fallback={tabLoader}>
          <AdminUpdates selectedClient={selectedClient} />
        </Suspense>
      ) : null}
    </div>
  );
}
