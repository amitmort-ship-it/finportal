import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ClientSearchFilter({ onSelect, placeholder, selectedValue = '' }) {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [open, setOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadClients = async () => {
    if (isLoaded) return;

    try {
      const response = await base44.functions.invoke('getAllClients', {});
      const profiles = response?.data?.profiles || response?.profiles || [];
      const sortedProfiles = [...profiles].sort((a, b) =>
        String(a.full_name || a.email || '').localeCompare(
          String(b.full_name || b.email || ''),
          'he',
        )
      );
      setClients(sortedProfiles);
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  useEffect(() => {
    if (search.trim()) {
      const normalizedSearch = search.toLowerCase();
      const results = clients.filter((client) => {
        const fullName = String(client?.full_name || '').toLowerCase();
        const email = String(client?.email || '').toLowerCase();

        return fullName.includes(normalizedSearch) || email.includes(normalizedSearch);
      });
      setFiltered(results);
      setOpen(true);
    } else {
      setFiltered([]);
      setOpen(false);
    }
  }, [search, clients]);

  const handleSelect = (client) => {
    onSelect(client.email, client.full_name || client.email);
    setSearch('');
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          placeholder={placeholder || 'הקלד שם או אימייל...'}
          value={search}
          onFocus={loadClients}
          onChange={(e) => {
            if (!isLoaded) loadClients();
            setSearch(e.target.value);
          }}
        />
        <div
          className={`absolute top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg z-50 ${
            open && filtered.length > 0 ? 'block' : 'hidden'
          }`}
        >
          <div className="max-h-64 overflow-y-auto">
            {filtered.map(client => (
              <button
                key={client.id || client.email}
                onClick={() => handleSelect(client)}
                className="w-full text-right px-4 py-2 hover:bg-muted transition-colors text-sm"
              >
                <div className="font-medium">{client.full_name || client.email || 'ללא שם'}</div>
                <div className="text-xs text-muted-foreground">{client.email || 'ללא אימייל'}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Select
        value={selectedValue || undefined}
        onOpenChange={(nextOpen) => {
          if (nextOpen) loadClients();
        }}
        onValueChange={(email) => {
          const client = clients.find((item) => item.email === email);
          if (client) handleSelect(client);
        }}
      >
        <SelectTrigger className="bg-background">
          <SelectValue placeholder="או בחר לקוח מרשימה" />
        </SelectTrigger>
        <SelectContent>
          {clients.map((client) => (
            <SelectItem key={client.id || client.email} value={client.email}>
              {client.full_name || client.email || 'ללא שם'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
