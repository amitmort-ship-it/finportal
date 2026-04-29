import { useState, Suspense, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import AdminClients from '@/components/admin/AdminClients';
import AdminNotifications from '@/components/admin/AdminNotifications';
import AdminBankApprovals from '@/components/admin/AdminBankApprovals';
import AdminViewDocuments from '@/components/admin/AdminViewDocuments';
import AdminPackages from '@/components/admin/AdminPackages';
import AdminCollaterals from '@/components/admin/AdminCollaterals';
import AdminProcessStage from '@/components/admin/AdminProcessStage';
import AdminBusiness from '@/components/admin/AdminBusiness';
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
  Search,
  ExternalLink,
  TrendingUp,
  Home,
} from 'lucide-react';

export default function AdminPanel() {
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState(null);
  const [activeTab, setActiveTab] = useState('clients');
  const [clients, setClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useAdminPalette();

  useEffect(() => {
    const load = async () => {
      try {
        const profiles = await base44.entities.ClientProfile.filter({}, '-created_date');
        setClients(profiles);
      } catch (error) {
        console.error('Failed to load clients:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const filteredClients = clients.filter(c =>
    (c.full_name || c.email).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { id: 'main', label: 'ראשי', icon: Home },
    { id: 'clients', label: 'לקוחות', icon: Users },
    { id: 'business', label: 'ניהול עסק', icon: TrendingUp },
    { id: 'notifications', label: 'הודעות', icon: Bell },
    { id: 'approvals', label: 'אישורים', icon: Building2 },
    { id: 'documents', label: 'מסמכים', icon: FileText },
    { id: 'packages', label: 'תבניות', icon: Package },
    { id: 'collaterals', label: 'בטחונות', icon: Lock },
    { id: 'process', label: 'שלבים', icon: ListChecks },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">לוח ניהול</h1>
          <AdminColorPicker />
        </div>

        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground shrink-0">בחר לקוח:</span>
          <select
            value={selectedClient || ''}
            onChange={e => setSelectedClient(e.target.value || null)}
            className="flex-1 h-9 rounded-md border border-input px-3 py-2 text-sm bg-transparent"
            dir="rtl"
          >
            <option value="">כל הלקוחות</option>
            {!loading && clients.map(client => (
              <option key={client.id} value={client.email}>
                {client.full_name || client.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-max gap-0">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="text-xs lg:text-sm whitespace-nowrap">
                  <Icon className="w-4 h-4 lg:mr-2" />
                  <span className="hidden lg:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="main" className="space-y-6">
          <Suspense fallback={<div className="text-center py-6">טוען...</div>}>
            <RefinanceMonitor />
            <ClientsByStageTable onSelectClient={setSelectedClient} />
            <AdminNotifications selectedClient={selectedClient} />
          </Suspense>
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <Suspense fallback={<div className="text-center py-6">טוען...</div>}>
            <AdminClients />
          </Suspense>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <Suspense fallback={<div className="text-center py-6">טוען...</div>}>
            <AdminBusiness />
          </Suspense>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Suspense fallback={<div className="text-center py-6">טוען...</div>}>
            <AdminNotifications selectedClient={selectedClient} />
            <ClientsByStageTable onSelectClient={setSelectedClient} />
          </Suspense>
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
            </select>
          </div>
          <Suspense fallback={<div className="text-center py-6">טוען...</div>}>
            <AdminBankApprovals selectedClient={selectedClient} />
          </Suspense>
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
          <Suspense fallback={<div className="text-center py-6">טוען...</div>}>
            <AdminViewDocuments selectedClient={selectedClient} />
          </Suspense>
        </TabsContent>

        <TabsContent value="packages" className="space-y-6">
          <Suspense fallback={<div className="text-center py-6">טוען...</div>}>
            <AdminPackages selectedClient={selectedClient} />
          </Suspense>
        </TabsContent>

        <TabsContent value="collaterals" className="space-y-6">
          <Suspense fallback={<div className="text-center py-6">טוען...</div>}>
            <AdminCollaterals selectedClient={selectedClient} />
          </Suspense>
        </TabsContent>

        <TabsContent value="process" className="space-y-6">
          <Suspense fallback={<div className="text-center py-6">טוען...</div>}>
            <AdminProcessStage selectedClient={selectedClient} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}