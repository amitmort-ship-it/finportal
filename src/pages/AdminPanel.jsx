import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
import TelegramSummary from '@/components/admin/TelegramSummary';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import {
  Users,
  Bell,
  Building2,
  FileText,
  Package,
  Lock,
  LayoutDashboard,
  TrendingUp,
  X,
  GitBranch,
  UserPlus,
  ChevronDown,
} from 'lucide-react';

// 10 flat tabs, reorganized into 3 focused groups — same tab ids/components as before,
// just a clearer information architecture (desktop: collapsible rail, mobile: section sheet).
const GROUPS = [
  {
    id: 'overview',
    label: 'סקירה',
    items: [
      { id: 'dashboard', label: 'דף ראשי', icon: LayoutDashboard },
      { id: 'business', label: 'ניהול עסק', icon: TrendingUp },
    ],
  },
  {
    id: 'clients',
    label: 'לקוחות',
    items: [
      { id: 'clients', label: 'לקוחות', icon: Users },
      { id: 'updates', label: 'עדכונים', icon: Bell },
      { id: 'leads', label: 'לידומט', icon: UserPlus },
    ],
  },
  {
    id: 'process',
    label: 'תהליך משכנתא',
    items: [
      { id: 'approvals', label: 'אישורים', icon: Building2 },
      { id: 'documents', label: 'מסמכים', icon: FileText },
      { id: 'packages', label: 'תמהיל', icon: Package },
      { id: 'collaterals', label: 'בטחונות', icon: Lock },
      { id: 'timeline', label: 'טיימליין', icon: GitBranch },
    ],
  },
];
const ALL_ITEMS = GROUPS.flatMap((g) => g.items);

export default function AdminPanel() {
  const { user } = useAuth();
  const [globalClient, setGlobalClient] = useState('');
  const [globalClientName, setGlobalClientName] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [openGroups, setOpenGroups] = useState({ overview: true, clients: true, process: true });
  const [sectionSheetOpen, setSectionSheetOpen] = useState(false);

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
  const activeItem = ALL_ITEMS.find((item) => item.id === activeTab) || ALL_ITEMS[0];
  const ActiveIcon = activeItem.icon;

  const toggleGroup = (groupId) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const selectSection = (id) => {
    setActiveTab(id);
    setSectionSheetOpen(false);
  };

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
        {/* Mobile: single "current section" bar that opens a grouped picker sheet */}
        <div className="lg:hidden space-y-2 mb-4">
          <button
            type="button"
            onClick={() => setSectionSheetOpen(true)}
            className="w-full flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ActiveIcon className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold truncate">{activeItem.label}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90 shrink-0" />
          </button>
          <MobileQuickLinks />
        </div>

        <Sheet open={sectionSheetOpen} onOpenChange={setSectionSheetOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[75vh] overflow-y-auto pb-8" dir="rtl">
            <SheetHeader className="mb-3 text-right">
              <SheetTitle>בחר מקטע ניהול</SheetTitle>
            </SheetHeader>
            <div className="space-y-4">
              {GROUPS.map((group) => (
                <div key={group.id}>
                  <p className="text-[11px] font-bold tracking-wide text-muted-foreground px-1 mb-1.5">{group.label}</p>
                  <div className="flex flex-col gap-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => selectSection(item.id)}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}
                        >
                          <Icon className="w-[18px] h-[18px] shrink-0" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop: collapsible grouped rail beside the content */}
        <div className="lg:flex lg:gap-6 lg:items-start">
          <TabsList className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:h-fit lg:items-stretch lg:justify-start lg:bg-transparent lg:p-0 lg:gap-0 lg:sticky lg:top-4">
            {GROUPS.map((group) => (
              <div key={group.id} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[11px] font-bold tracking-wide text-muted-foreground hover:bg-muted/60 transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openGroups[group.id] ? 'rotate-180' : ''}`} />
                </button>
                {openGroups[group.id] && (
                  <div className="flex flex-col gap-0.5 mt-0.5 mb-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <TabsTrigger
                          key={item.id}
                          value={item.id}
                          className="w-full justify-start gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          {item.label}
                        </TabsTrigger>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </TabsList>

          <div className="flex-1 min-w-0">
            <TabsContent value="dashboard" className="space-y-6 mt-0">
              <AdminNotifications />
              <TelegramSummary />
              <RefinanceMonitor />
              <ClientsByStageTable onSelectClient={(email) => { handleSelectClient(email); }} />
            </TabsContent>

            <TabsContent value="business" className="space-y-6 mt-0">
              <AdminBusiness />
            </TabsContent>

            <TabsContent value="clients" className="space-y-6 mt-0">
              <AdminClients />
            </TabsContent>

            <TabsContent value="updates" className="space-y-6 mt-0">
              <AdminUpdates selectedClient={selectedClient} />
            </TabsContent>

            <TabsContent value="approvals" className="space-y-6 mt-0">
              <AdminBankApprovals selectedClient={selectedClient} />
            </TabsContent>

            <TabsContent value="documents" className="space-y-6 mt-0">
              <AdminViewDocuments selectedClient={selectedClient} />
            </TabsContent>

            <TabsContent value="packages" className="space-y-6 mt-0">
              <AdminPackages selectedClient={selectedClient} />
            </TabsContent>

            <TabsContent value="collaterals" className="space-y-6 mt-0">
              <AdminCollaterals selectedClient={selectedClient} />
            </TabsContent>

            <TabsContent value="timeline" className="space-y-6 mt-0">
              <AdminTimelineEditor selectedClient={selectedClient} />
            </TabsContent>

            <TabsContent value="leads" className="space-y-6 mt-0">
              <AdminLeads />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
