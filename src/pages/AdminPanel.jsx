import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink } from 'lucide-react';


function ClientSearchSelector({ users, selectedClient, onSelect }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selectedUser = users.find(u => u.email === selectedClient);
  const displayValue = selectedUser ? (selectedUser.full_name || selectedUser.email) : '';

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (u.full_name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (email) => {
    onSelect(email === '_all' ? null : email);
    setSearch('');
    setOpen(false);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-6" ref={ref}>
      <Label className="text-sm block mb-2">בחר לקוח (אופציונלי)</Label>
      <div className="relative w-full md:w-80">
        <div
          className="flex items-center border border-input rounded-md bg-background px-3 h-9 cursor-pointer"
          onClick={() => setOpen(o => !o)}
        >
          {open ? (
            <Input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              placeholder="חפש לקוח..."
              className="border-0 shadow-none h-7 p-0 focus-visible:ring-0 bg-transparent flex-1"
              dir="rtl"
            />
          ) : (
            <span className={`flex-1 text-sm ${selectedClient ? 'text-foreground' : 'text-muted-foreground'}`}>
              {selectedClient ? displayValue : 'כל הלקוחות'}
            </span>
          )}
          <div className="flex items-center gap-1 mr-1">
            {selectedClient && !open && (
              <X
                className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground"
                onClick={e => { e.stopPropagation(); onSelect(null); }}
              />
            )}
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {open && (
          <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-60 overflow-y-auto">
            <div
              className="px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded-sm"
              onClick={() => handleSelect('_all')}
            >
              כל הלקוחות
            </div>
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">לא נמצאו לקוחות</div>
            ) : filtered.map(u => (
              <div
                key={u.id}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded-sm ${selectedClient === u.email ? 'bg-accent font-medium' : ''}`}
                onClick={() => handleSelect(u.email)}
              >
                <div>{u.full_name || u.email}</div>
                {u.full_name && <div className="text-xs text-muted-foreground">{u.email}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const load = async () => {
      const profiles = await base44.entities.ClientProfile.filter({}, '-created_date');
      setUsers(profiles);
    };
    load();
  }, []);

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      <div className="mb-8 space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">לוח ניהול</h1>
            <p className="text-muted-foreground mt-1">ניהול לקוחות, מסמכים, אישורים ובטחונות</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              className="gap-2 bg-red-600 hover:bg-red-700 text-white"
              onClick={() => window.open('https://555.co.il/pearl/apps/cooperation-landing-page/homeStep?attentionCode=406&cooperationCode=3618', '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="w-4 h-4" />
              ביטוח ישיר
            </Button>

            <Button
              type="button"
              className="gap-2 bg-neutral-800 hover:bg-neutral-700 text-white"
              onClick={() => window.open('https://www.notion.so/304051ce360080539d38c4a852b964cb?v=304051ce360081b2a665000cdc320bfc', '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="w-4 h-4" />
              Notion
            </Button>

            <Button
              type="button"
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => window.open('https://www.paperless.tax/admin/dashboard;sUserID=nhgp95igmi', '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="w-4 h-4" />
              Paperless
            </Button>

            <Button
              type="button"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => window.open('https://www.snpv.co.il/clients', '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="w-4 h-4" />
              SmartNPV
            </Button>
          </div>
        </div>
      </div>

      <ClientSearchSelector
        users={users}
        selectedClient={selectedClient}
        onSelect={setSelectedClient}
      />

      <div className="bg-card rounded-xl border border-border p-6">
        <p className="text-muted-foreground">Admin panel content coming soon...</p>
      </div>
    </div>
  );
}