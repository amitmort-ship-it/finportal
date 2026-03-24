import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AdminFileRequests from '../components/admin/AdminFileRequests';
import AdminBankApprovals from '../components/admin/AdminBankApprovals';
import AdminCollaterals from '../components/admin/AdminCollaterals';
import AdminClients from '../components/admin/AdminClients';

export default function AdminPanel() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">לוח ניהול</h1>
        <p className="text-muted-foreground mt-1">ניהול לקוחות, מסמכים, אישורים ובטחונות</p>
      </div>

      <Tabs defaultValue="clients" dir="rtl">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="clients">לקוחות</TabsTrigger>
          <TabsTrigger value="files">בקשות מסמכים</TabsTrigger>
          <TabsTrigger value="approvals">אישורי בנקים</TabsTrigger>
          <TabsTrigger value="collaterals">בטחונות</TabsTrigger>
        </TabsList>

        <TabsContent value="clients"><AdminClients /></TabsContent>
        <TabsContent value="files"><AdminFileRequests /></TabsContent>
        <TabsContent value="approvals"><AdminBankApprovals /></TabsContent>
        <TabsContent value="collaterals"><AdminCollaterals /></TabsContent>
      </Tabs>
    </div>
  );
}