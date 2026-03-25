import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminClients from '../components/admin/AdminClients';
import AdminDocumentRequest from '../components/admin/AdminDocumentRequest';
import AdminFileRequests from '../components/admin/AdminFileRequests';
import AdminCollaterals from '../components/admin/AdminCollaterals';
import AdminPackages from '../components/admin/AdminPackages';
import AdminBankApprovals from '../components/admin/AdminBankApprovals';
import AdminProcessStage from '../components/admin/AdminProcessStage';
import AdminUpdates from '../components/admin/AdminUpdates';
import AdminViewDocuments from '../components/admin/AdminViewDocuments';

export default function AdminPanel() {
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const load = async () => {
      const userList = await base44.asServiceRole.entities.User.filter({});
      setUsers(userList.filter(u => u.role !== 'admin'));
    };
    load();
  }, []);

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">לוח ניהול</h1>
        <p className="text-muted-foreground mt-1">ניהול לקוחות, מסמכים, אישורים ובטחונות</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <Label className="text-sm block mb-2">בחר לקוח (אופציונלי)</Label>
        <Select value={selectedClient || ''} onValueChange={v => setSelectedClient(v || null)}>
          <SelectTrigger className="w-full md:w-80"><SelectValue placeholder="כל הלקוחות" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">כל הלקוחות</SelectItem>
            {users.map(u => <SelectItem key={u.id} value={u.email}>{u.full_name || u.email}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="clients" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:grid-cols-9 mb-6 h-auto">
          <TabsTrigger value="clients" className="text-xs md:text-sm">לקוחות</TabsTrigger>
          <TabsTrigger value="document-request" className="text-xs md:text-sm">בקש מסמכים</TabsTrigger>
          <TabsTrigger value="file-requests" className="text-xs md:text-sm">בקשות</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs md:text-sm">מסמכים</TabsTrigger>
          <TabsTrigger value="collaterals" className="text-xs md:text-sm">בטחונות</TabsTrigger>
          <TabsTrigger value="packages" className="text-xs md:text-sm">תמהיל</TabsTrigger>
          <TabsTrigger value="approvals" className="text-xs md:text-sm">אישורים</TabsTrigger>
          <TabsTrigger value="process" className="text-xs md:text-sm">שלב</TabsTrigger>
          <TabsTrigger value="updates" className="text-xs md:text-sm">עדכונים</TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <AdminClients />
        </TabsContent>

        <TabsContent value="document-request">
          <AdminDocumentRequest selectedClient={selectedClient} onClientChange={setSelectedClient} />
        </TabsContent>

        <TabsContent value="file-requests">
          <AdminFileRequests selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="documents">
          <AdminViewDocuments selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="collaterals">
          <AdminCollaterals selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="packages">
          <AdminPackages selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="approvals">
          <AdminBankApprovals selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="process">
          <AdminProcessStage selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="updates">
          <AdminUpdates selectedClient={selectedClient} />
        </TabsContent>
      </Tabs>
    </div>
  );
}