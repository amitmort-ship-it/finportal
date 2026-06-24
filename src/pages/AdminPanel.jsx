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
import AdminTimelineEditor from '@/components/admin/AdminTimelineEditor';
import AdminColorPicker, { useAdminPalette } from '@/components/admin/AdminColorPicker';
import RefinanceMonitor from '@/components/admin/RefinanceMonitor';
import AdminBusiness from '@/components/admin/AdminBusiness';
import AdminLeads from '@/components/admin/AdminLeads';
import MobileQuickLinks from '@/components/admin/MobileQuickLinks';
import AdminNotifications from '@/components/admin/AdminNotifications';
import DailyQuoteCard from '@/components/admin/DailyQuoteCard';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
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
  X,
  GitBranch,
  UserPlus,
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
  { id: 'timeline', label: 'טיימליין', icon: GitBranch },
  { id: 'leads', label: 'לידומט', icon: UserPlus },
];

export default function AdminPanel() {
  const { user } = useAuth();
  const [globalClient, setGlobalClient] = useState('');
  const [globalClientName, setGlobalClientName] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  useAdminPalette();

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const handleSelectClient = (email, name) => {
    setGlobalClient(email);
    setGlobalClientName(name || email);
  };

  const handleClearClient = () => {
    setGlobalClient('');
    setGlobalClientName('');
  };

  const selectedClient = globalClient || null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">לוח הניהול</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-0.5">ניהול לקוחות ומעקב תהליכים</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AdminColorPicker />
        </div>
      </div>

      <DailyQuoteCard />

      {/* Global client filter */}
      <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3" dir="rtl">
        <div className="flex-1">
          <label className="text-sm font-medium text-muted-foreground block mb-1.5">סינון לפי לקוח (גלובלי)</label>
          <ClientSearchFilter
            onSelect={(email, name) => handleSelectClient(email, name)}
            placeholder="חפש לקוח לסינון כל הטאבים..."
            selectedValue={globalClient}
          />
        </div>
        {globalClient && (
          <div className="flex items-center gap-2 mt-5">
            <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 whitespace-nowrap">
              {globalClientName}
            </span>
            <Button size="icon" variant="ghost" onClick={handleClearClient} className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Mobile: horizontal scroll tabs */}
        <div className="lg:hidden overflow-x-auto pb-1 -mx-1 px-1">
          <div className="flex gap-1 w-max">
            {TAB_CONFIG.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop: grid tabs */}
        <TabsList className="hidden lg:grid w-full grid-cols-11">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="text-xs lg:text-sm">
                {Icon && <Icon className="w-4 h-4 lg:mr-2" />}
                <span className="hidden lg:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Mobile quick links — collapsed by default */}
        <MobileQuickLinks />

        <TabsContent value="dashboard" className="space-y-6">
          <AdminNotifications />
          <RefinanceMonitor />
          <ClientsByStageTable onSelectClient={(email) => { handleSelectClient(email); }} />
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <AdminBusiness />
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <AdminClients />
        </TabsContent>

        <TabsContent value="updates" className="space-y-6">
          <AdminUpdates selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <AdminBankApprovals selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <AdminViewDocuments selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="packages" className="space-y-6">
          <AdminPackages selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="collaterals" className="space-y-6">
          <AdminCollaterals selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <AdminTimelineEditor selectedClient={selectedClient} />
        </TabsContent>

        <TabsContent value="leads" className="space-y-6">
          <AdminLeads />
        </TabsContent>
      </Tabs>
    </div>
  );
}