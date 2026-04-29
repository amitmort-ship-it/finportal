import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import ClientSearchFilter from '@/components/ClientSearchFilter';
import AdminClients from '@/components/admin/AdminClients';
import AdminUpdates from '@/components/admin/AdminUpdates';
import AdminBankApprovals from '@/components/admin/AdminBankApprovals';
import AdminViewDocuments from '@/components/admin/AdminViewDocuments';
import AdminPackages from '@/components/admin/AdminPackages';
import AdminCollaterals from '@/components/admin/AdminCollaterals';
import AdminProcessStage from '@/components/admin/AdminProcessStage';
import AdminColorPicker, { useAdminPalette } from '@/components/admin/AdminColorPicker';
import ClientsByStageTable from '@/components/admin/ClientsByStageTable';
import RefinanceMonitor from '@/components/admin/RefinanceMonitor';
import AdminBusiness from '@/components/admin/AdminBusiness';
import Dashboard from '@/pages/Dashboard';
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

export default function AdminPanel() {
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [activeTab, setActiveTab] = useState('clients');

  useAdminPalette();

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">לוח הניהול</h1>
          <p className="text-muted-foreground mt-1">ניהול לקוחות ומעקב תהליכים</p>
        </div>
        <AdminColorPicker />
      </div>

      <RefinanceMonitor />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9">
          {tabs.map(tab => {
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
          <AdminUpdates selectedClientFilter={clientSearch} />
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