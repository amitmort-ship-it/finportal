import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ClientSearchFilter from '@/components/ClientSearchFilter';
import AdminClients from '@/components/admin/AdminClients';
import AdminUpdates from '@/components/admin/AdminUpdates';
import ClientsByStageTable from '@/components/admin/ClientsByStageTable';
import AdminBankApprovals from '@/components/admin/AdminBankApprovals';
import AdminViewDocuments from '@/components/admin/AdminViewDocuments';
import AdminPackages from '@/components/admin/AdminPackages';
import AdminCollaterals from '@/components/admin/AdminCollaterals';
import AdminProcessStage from '@/components/admin/AdminProcessStage';
import AdminColorPicker, { useAdminPalette } from '@/components/admin/AdminColorPicker';
import RefinanceMonitor from '@/components/admin/RefinanceMonitor';
import AdminBusiness from '@/components/admin/AdminBusiness';
import AdminNotifications from '@/components/admin/AdminNotifications';
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
} from 'lucide-react';

const TAB_CONFIG = [
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

export default function AdminPanel() {
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  useAdminPalette();

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">לוח הניהול</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-0.5">ניהול לקוחות ומעקב תהליכים</p>
        </div>
        <AdminColorPicker />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="text-xs lg:text-sm">
                <Icon className="w-4 h-4 lg:mr-2" />
                <span className="hidden lg:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="grid grid-cols-2 gap-3 md:hidden mt-4 px-1">
          {[
            { label: 'ביטוח ישיר', url: 'https://www.555.co.il/pearl/apps/cooperation-landing-page/homeStep?attentionCode=406&cooperationCode=3618', bg: 'bg-red-600', text: 'text-white' },
            { label: 'Notion', url: 'https://www.notion.so/304051ce360080539d38c4a852b964cb?v=304051ce360081b2a665000cdc320bfc', bg: 'bg-gray-900', text: 'text-white' },
            { label: 'SmartNPV', url: 'https://www.snpv.co.il/clients', bg: 'bg-green-600', text: 'text-white' },
            { label: 'Paperless', url: 'https://www.paperless.tax/admin/dashboard;sUserID=nhgp95igmi', bg: 'bg-blue-600', text: 'text-white' },
          ].map(({ label, url, bg, text }) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center text-center px-4 py-3.5 rounded-2xl text-sm font-semibold shadow-md active:scale-95 transition-all min-h-[52px] ${bg} ${text}`}
            >
              {label}
            </a>
          ))}
        </div>

        <TabsContent value="dashboard" className="space-y-6">
          <AdminNotifications />
          <RefinanceMonitor />
          <ClientsByStageTable onSelectClient={setSelectedClient} />
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <AdminBusiness />
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <AdminClients />
        </TabsContent>

        <TabsContent value="updates" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <label className="text-sm font-medium">חיפוש לקוח</label>
            <div className="mt-2">
              <ClientSearchFilter onSelect={setClientSearch} />
            </div>
          </div>
          <AdminUpdates selectedClient={clientSearch || null} />
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <label className="text-sm font-medium">חיפוש לקוח</label>
            <div className="mt-2">
              <ClientSearchFilter onSelect={setClientSearch} />
            </div>
          </div>
          <AdminBankApprovals selectedClient={clientSearch || null} />
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <label className="text-sm font-medium">חיפוש לקוח</label>
            <div className="mt-2">
              <ClientSearchFilter onSelect={setClientSearch} />
            </div>
          </div>
          <AdminViewDocuments selectedClient={clientSearch || null} />
        </TabsContent>

        <TabsContent value="packages" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <label className="text-sm font-medium">חיפוש לקוח</label>
            <div className="mt-2">
              <ClientSearchFilter onSelect={setClientSearch} />
            </div>
          </div>
          <AdminPackages selectedClient={clientSearch || null} />
        </TabsContent>

        <TabsContent value="collaterals" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <label className="text-sm font-medium">חיפוש לקוח</label>
            <div className="mt-2">
              <ClientSearchFilter onSelect={setClientSearch} />
            </div>
          </div>
          <AdminCollaterals selectedClient={clientSearch || null} />
        </TabsContent>

        <TabsContent value="process" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <label className="text-sm font-medium">חיפוש לקוח</label>
            <div className="mt-2">
              <ClientSearchFilter onSelect={setClientSearch} />
            </div>
          </div>
          <AdminProcessStage selectedClient={clientSearch || null} />
        </TabsContent>
      </Tabs>
    </div>
  );
}