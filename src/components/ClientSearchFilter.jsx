import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function getClientLabel(client) {
  const name = client?.full_name || client?.email || 'ללא שם';
  const email = client?.email || '';
  return email && name !== email ? `${name} — ${email}` : name;
}

export default function ClientSearchFilter({ onSelect, placeholder, selectedValue = '' }) {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const loadClients = async () => {
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
      } catch (error) {
        console.error('Error loading clients:', error);
      }
    };

    loadClients();
  }, []);

  const searchOptions = useMemo(() => {
    if (!search.trim()) return clients;

    const normalizedSearch = search.toLowerCase();
    return clients.filter((client) => {
      const fullName = String(client?.full_name || '').toLowerCase();
      const email = String(client?.email || '').toLowerCase();
      const label = getClientLabel(client).toLowerCase();

      return (
        fullName.includes(normalizedSearch) ||
        email.includes(normalizedSearch) ||
        label.includes(normalizedSearch)
      );
    });
  }, [search, clients]);

  const handleSelect = (client) => {
    if (!client?.email) return;
    onSelect(client.email, client.full_name || client.email);
    setSearch('');
  };

  const handleSearchChange = (value) => {
    setSearch(value);

    const normalizedValue = String(value || '').trim().toLowerCase();
    if (!normalizedValue) return;

    const matchedClient = clients.find((client) => {
      const fullName = String(client?.full_name || '').toLowerCase();
      const email = String(client?.email || '').toLowerCase();
      const label = getClientLabel(client).toLowerCase();

      return (
        fullName === normalizedValue ||
        email === normalizedValue ||
        label === normalizedValue
      );
    });

    if (matchedClient) {
      handleSelect(matchedClient);
    }
  };

  return (
    <div className="space-y-2">
      <Input
        list="client-search-options"
        placeholder={placeholder || 'הקלד שם או אימייל...'}
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
      />

      <datalist id="client-search-options">
        {searchOptions.map((client) => (
          <option
            key={client.id || client.email}
            value={getClientLabel(client)}
          />
        ))}
      </datalist>

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
            <SelectItem key={client.id || client.email} value={client.email}>
              {client.full_name || client.email || 'ללא שם'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
