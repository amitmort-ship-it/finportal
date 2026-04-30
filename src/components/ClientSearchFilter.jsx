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

  useEffect(() => {
    const loadClients = async () => {
      try {
        const profiles = await base44.entities.ClientProfile.filter({}, '-created_date');
        const sortedProfiles = [...profiles].sort((a, b) =>
          String(a.full_name || a.email || '').localeCompare(
            String(b.full_name || b.email || ''),
            'he',
          )
        );
        setClients(sortedProfiles);
      } catch (error) {
        console.error('Error loading clients:', error);
      }
    };
    loadClients();
  }, []);

  useEffect(() => {
    if (search.trim()) {
      const results = clients.filter(c =>
        c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
      );
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
          onChange={e => setSearch(e.target.value)}
        />
        {open && filtered.length > 0 && (
          <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg z-50">
            <div className="max-h-64 overflow-y-auto">
              {filtered.map(client => (
                <button
                  key={client.id}
                  onClick={() => handleSelect(client)}
                  className="w-full text-right px-4 py-2 hover:bg-muted transition-colors text-sm"
                >
                  <div className="font-medium">{client.full_name}</div>
                  <div className="text-xs text-muted-foreground">{client.email}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Select
        value={selectedValue || undefined}
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
            <SelectItem key={client.id} value={client.email}>
              {client.full_name || client.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
