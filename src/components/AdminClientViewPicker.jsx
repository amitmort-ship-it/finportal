import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Eye, ChevronDown, X, Search } from 'lucide-react';

export default function AdminClientViewPicker() {
  const { adminViewClient, setAdminViewClient } = useAuth();
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await base44.functions.invoke('getAllClients', {});
        setClients(res.data?.clients || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = clients.filter(c =>
    !search ||
    (c.full_name || '').includes(search) ||
    (c.email || '').includes(search)
  );

  const select = (client) => {
    setAdminViewClient({ email: client.email, full_name: client.full_name || client.email });
    setOpen(false);
    setSearch('');
  };

  const clear = (e) => {
    e.stopPropagation();
    setAdminViewClient(null);
  };

  return (
    <div ref={ref} className="relative mt-3">
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
          adminViewClient
            ? 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-300'
            : 'bg-muted/50 border-border text-foreground hover:bg-muted'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {adminViewClient ? `${adminViewClient.full_name}` : 'תצוגת לקוח'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {adminViewClient && (
            <span onClick={clear} className="p-0.5 rounded hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors">
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {adminViewClient && (
        <div className="mt-1 text-xs text-amber-600 dark:text-amber-400 px-1 font-medium">
          ⚠ צופה כלקוח — הנתונים משקפים את התיק שנבחר
        </div>
      )}

      {open && (
        <div className="absolute top-full mt-1 right-0 left-0 z-50 rounded-lg border border-border bg-card shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="חפש לקוח..."
                className="bg-transparent text-xs outline-none w-full text-foreground placeholder:text-muted-foreground"
                dir="rtl"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-center text-xs text-muted-foreground">טוען...</div>
            ) : filtered.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">לא נמצאו לקוחות</div>
            ) : filtered.map(c => (
              <button
                key={c.id}
                onClick={() => select(c)}
                className={`w-full flex flex-col px-3 py-2.5 text-right text-xs hover:bg-muted transition-colors ${
                  adminViewClient?.email === c.email ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                }`}
              >
                <span className="font-medium">{c.full_name || c.email}</span>
                <span className="text-muted-foreground" dir="ltr">{c.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}