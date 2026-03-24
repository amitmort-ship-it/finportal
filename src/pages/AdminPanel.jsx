import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminFileRequests from '../components/admin/AdminFileRequests';
import AdminBankApprovals from '../components/admin/AdminBankApprovals';
import AdminCollaterals from '../components/admin/AdminCollaterals';
import AdminClients from '../components/admin/AdminClients';
import AdminUpdates from '../components/admin/AdminUpdates';

export default function AdminPanel() {
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const load = async () => {
      const list = await base44.entities.User.list();
      setUsers(list.filter(u => u.role !== 'admin'));
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

      <div className="mb-6">
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger className="w-full md:w-64">
            <SelectValue placeholder="בחר לקוח" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>כל הלקוחות</SelectItem>
            {users.map(u => (
              <SelectItem key={u.id} value={u.email}>{u.full_name || u.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="updates" dir="rtl">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="updates">עדכונים</TabsTrigger>
          <TabsTrigger value="clients">לקוחות</TabsTrigger>
          <TabsTrigger value="files">בקשות מסמכים</TabsTrigger>
          <TabsTrigger value="approvals">אישורי בנקים</TabsTrigger>
          <TabsTrigger value="collaterals">בטחונות</TabsTrigger>
        </TabsList>

        <TabsContent value="updates"><AdminUpdates selectedClient={selectedClient} /></TabsContent>
        <TabsContent value="clients"><AdminClients /></TabsContent>
        <TabsContent value="files"><AdminFileRequests selectedClient={selectedClient} /></TabsContent>
        <TabsContent value="approvals"><AdminBankApprovals selectedClient={selectedClient} /></TabsContent>
        <TabsContent value="collaterals"><AdminCollaterals selectedClient={selectedClient} /></TabsContent>
      </Tabs>
    </div>
  );
}