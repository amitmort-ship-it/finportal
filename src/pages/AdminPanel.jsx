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
    { id: 'clients', label: 'לקוחות', icon: Users },
    { id: 'business', label: 'עסק', icon: TrendingUp },
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
          <div>
            <h1 className="text-3xl font-bold">לוח ניהול</h1>
            <p className="text-muted-foreground mt-1">ניהול לקוחות, מסמכים, אישורים וביטחונות</p>
          </div>
          <AdminColorPicker />
        </div>

        <div className="flex gap-3 flex-wrap mb-6">
          <a
            href="https://www.smartnpv.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
          >
            SmartNPV
            <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href="https://www.paperless.co.il"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Paperless
            <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href="https://www.notion.so"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-white bg-black hover:bg-gray-800 transition-colors"
          >
            Notion
            <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href="https://www.bituach.gov.il"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            ביטוח יישור
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לקוח לפי שם או אימייל..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1"
            dir="rtl"
          />
        </div>

        {selectedClient && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              נבחר: <span className="font-medium text-foreground">
                {clients.find(c => c.email === selectedClient)?.full_name || selectedClient}
              </span>
            </span>
            <button
              onClick={() => setSelectedClient(null)}
              className="text-xs text-primary hover:underline"
            >
              נקה בחירה
            </button>
          </div>
        )}

        {!loading && filteredClients.length > 0 && (
          <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
            {filteredClients.map(client => (
              <button
                key={client.id}
                onClick={() => setSelectedClient(client.email)}
                className={`w-full text-right px-3 py-2 text-sm transition-colors ${
                  selectedClient === client.email
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="font-medium">{client.full_name || client.email}</div>
                <div className="text-xs opacity-70">{client.email}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Suspense fallback={<div className="text-center py-6">טוען...</div>}>
        <RefinanceMonitor />
      </Suspense>

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