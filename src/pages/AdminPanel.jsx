import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminClients from '@/components/admin/AdminClients';
import AdminNotifications from '@/components/admin/AdminNotifications';
import AdminBankApprovals from '@/components/admin/AdminBankApprovals';
import AdminViewDocuments from '@/components/admin/AdminViewDocuments';
import AdminPackages from '@/components/admin/AdminPackages';
import AdminCollaterals from '@/components/admin/AdminCollaterals';
import AdminProcessStage from '@/components/admin/AdminProcessStage';
import AdminColorPicker, { useAdminPalette } from '@/components/admin/AdminColorPicker';
import ClientsByStageTable from '@/components/admin/ClientsByStageTable';
import RefinanceMonitor from '@/components/admin/RefinanceMonitor';
import {
  Users,
  Bell,
  Building2,
  FileText,
  Package,
  Lock,
  ListChecks,
} from 'lucide-react';

export default function AdminPanel() {
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState(null);
  const [activeTab, setActiveTab] = useState('clients');

  useAdminPalette();

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const tabs = [
    { id: 'clients', label: 'לקוחות', icon: Users },
    { id: 'notifications', label: 'הודעות', icon: Bell },
    { id: 'approvals', label: 'אישורים', icon: Building2 },
    { id: 'documents', label: 'מסמכים', icon: FileText },
    { id: 'packages', label: 'תבניות', icon: Package },
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
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
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

        <TabsContent value="clients" className="space-y-6">
          <AdminClients />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <AdminNotifications selectedClient={selectedClient} />
          <ClientsByStageTable />
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <label className="text-sm font-medium">בחר לקוח</label>
            <select
              value={selectedClient || ''}
              onChange={e => setSelectedClient(e.target.value || null)}
              className="mt-2 w-full rounded-md border border-input px-3 py-2 text-sm"
            >
              <option value="">כל הלקוחות</option>
              {/* Clients loaded dynamically in component */}
            </select>
          </div>
          <AdminBankApprovals selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <label className="text-sm font-medium">בחר לקוח</label>
            <select
              value={selectedClient || ''}
              onChange={e => setSelectedClient(e.target.value || null)}
              className="mt-2 w-full rounded-md border border-input px-3 py-2 text-sm"
            >
              <option value="">כל הלקוחות</option>
            </select>
          </div>
          <AdminViewDocuments selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="packages" className="space-y-6">
          <AdminPackages selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="collaterals" className="space-y-6">
          <AdminCollaterals selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="process" className="space-y-6">
          <AdminProcessStage selectedClient={selectedClient} />
        </TabsContent>
      </Tabs>
    </div>
  );
}