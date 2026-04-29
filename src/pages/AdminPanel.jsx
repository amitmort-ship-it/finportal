import { useState, Suspense } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminClients from '@/components/admin/AdminClients';
import AdminColorPicker, { useAdminPalette } from '@/components/admin/AdminColorPicker';
import {
  Users,
  Bell,
  Building2,
  FileText,
  Package,
  Lock,
  ListChecks,
} from 'lucide-react';

const PageLoader = () => <div className="text-center py-6">טוען...</div>;

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
          <Suspense fallback={<PageLoader />}>
            <AdminClients />
          </Suspense>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <PageLoader />
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <PageLoader />
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <PageLoader />
        </TabsContent>

        <TabsContent value="packages" className="space-y-6">
          <PageLoader />
        </TabsContent>

        <TabsContent value="collaterals" className="space-y-6">
          <PageLoader />
        </TabsContent>

        <TabsContent value="process" className="space-y-6">
          <PageLoader />
        </TabsContent>
      </Tabs>
    </div>
  );
}