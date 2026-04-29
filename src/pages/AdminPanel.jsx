import { Component, Suspense, lazy, useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Bell,
  Building2,
  FileText,
  Package,
  Lock,
  ListChecks,
  LayoutDashboard,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

const ClientSearchFilter = lazy(() => import('@/components/ClientSearchFilter'));
const AdminBusiness = lazy(() => import('@/components/admin/AdminBusiness'));
const AdminClients = lazy(() => import('@/components/admin/AdminClients'));
const AdminUpdates = lazy(() => import('@/components/admin/AdminUpdates'));
const AdminNotifications = lazy(() => import('@/components/admin/AdminNotifications'));
const AdminBankApprovals = lazy(() => import('@/components/admin/AdminBankApprovals'));
const AdminViewDocuments = lazy(() => import('@/components/admin/AdminViewDocuments'));
const AdminPackages = lazy(() => import('@/components/admin/AdminPackages'));
const AdminCollaterals = lazy(() => import('@/components/admin/AdminCollaterals'));
const AdminProcessStage = lazy(() => import('@/components/admin/AdminProcessStage'));
const AdminColorPicker = lazy(() => import('@/components/admin/AdminColorPicker'));
const ClientsByStageTable = lazy(() => import('@/components/admin/ClientsByStageTable'));
const RefinanceMonitor = lazy(() => import('@/components/admin/RefinanceMonitor'));

class SectionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error(`Admin section failed: ${this.props.sectionName}`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">החלק הזה לא נטען כרגע</div>
              <p className="mt-1 text-red-700/90">
                יש תקלה נקודתית באזור "{this.props.sectionName}". שאר מסך האדמין ממשיך לעבוד.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function SectionLoader() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
      טוען...
    </div>
  );
}

function LazySection({ sectionName, children }) {
  return (
    <SectionErrorBoundary sectionName={sectionName}>
      <Suspense fallback={<SectionLoader />}>{children}</Suspense>
    </SectionErrorBoundary>
  );
}

function ClientSearchBox({ onSelect }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <label className="text-sm font-medium">חיפוש לקוח</label>
      <div className="mt-2">
        <LazySection sectionName="חיפוש לקוח">
          <ClientSearchFilter onSelect={onSelect} />
        </LazySection>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    import('@/components/admin/AdminColorPicker').then((module) => {
      module.useAdminPalette();
    });
  }, []);

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const tabs = [
    { id: 'dashboard', label: 'דף ראשי', icon: LayoutDashboard },
    { id: 'business', label: 'ניהול עסק', icon: TrendingUp },
    { id: 'clients', label: 'לקוחות', icon: Users },
    { id: 'updates', label: 'עדכונים', icon: Bell },
    { id: 'approvals', label: 'אישורים', icon: Building2 },
    { id: 'documents', label: 'מסמכים', icon: FileText },
    { id: 'packages', label: 'תמהיל', icon: Package },
    { id: 'collaterals', label: 'בטחונות', icon: Lock },
    { id: 'process', label: 'שלבים', icon: ListChecks },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">לוח הניהול</h1>
          <p className="text-muted-foreground mt-1">ניהול לקוחות ומעקב תהליכים</p>
        </div>
        <LazySection sectionName="בורר צבעים">
          <AdminColorPicker />
        </LazySection>
      </div>

      <LazySection sectionName="מעקב מחזור">
        <RefinanceMonitor />
      </LazySection>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="text-xs lg:text-sm">
                <Icon className="w-4 h-4 lg:mr-2" />
                <span className="hidden lg:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <LazySection sectionName="התראות">
            <AdminNotifications selectedClient={selectedClient} />
          </LazySection>
          <LazySection sectionName="לקוחות לפי שלב">
            <ClientsByStageTable onSelectClient={setSelectedClient} />
          </LazySection>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <LazySection sectionName="ניהול עסק">
            <AdminBusiness />
          </LazySection>
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <LazySection sectionName="לקוחות">
            <AdminClients />
          </LazySection>
        </TabsContent>

        <TabsContent value="updates" className="space-y-6">
          <ClientSearchBox onSelect={setClientSearch} />
          <LazySection sectionName="עדכונים">
            <AdminUpdates selectedClient={clientSearch || null} />
          </LazySection>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <ClientSearchBox onSelect={setClientSearch} />
          <LazySection sectionName="אישורים">
            <AdminBankApprovals selectedClient={clientSearch || null} />
          </LazySection>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <ClientSearchBox onSelect={setClientSearch} />
          <LazySection sectionName="מסמכים">
            <AdminViewDocuments selectedClient={clientSearch || null} />
          </LazySection>
        </TabsContent>

        <TabsContent value="packages" className="space-y-6">
          <ClientSearchBox onSelect={setClientSearch} />
          <LazySection sectionName="תמהיל">
            <AdminPackages selectedClient={clientSearch || null} />
          </LazySection>
        </TabsContent>

        <TabsContent value="collaterals" className="space-y-6">
          <ClientSearchBox onSelect={setClientSearch} />
          <LazySection sectionName="בטחונות">
            <AdminCollaterals selectedClient={clientSearch || null} />
          </LazySection>
        </TabsContent>

        <TabsContent value="process" className="space-y-6">
          <ClientSearchBox onSelect={setClientSearch} />
          <LazySection sectionName="שלבים">
            <AdminProcessStage selectedClient={clientSearch || null} />
          </LazySection>
        </TabsContent>
      </Tabs>
    </div>
  );
}