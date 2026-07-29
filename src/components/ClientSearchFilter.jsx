import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';

function getClientLabel(client) {
  const name = String(client?.full_name || client?.email || 'ללא שם');
  const email = String(client?.email || '');
  return email && name !== email ? `${name} — ${email}` : name;
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

export default function ClientSearchFilter({ onSelect, placeholder, selectedValue = '' }) {
  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);

  useEffect(() => {
    let active = true;

    const loadClients = async () => {
      try {
        const response = await base44.functions.invoke('getAllClients', {});
        const profiles = response?.data?.profiles || response?.profiles || [];
        const sortedProfiles = [...profiles]
          .filter((client) => client?.email)
          .sort((a, b) =>
            String(a.full_name || a.email || '').localeCompare(
              String(b.full_name || b.email || ''),
              'he',
            ),
          );

        if (active) {
          setClients(sortedProfiles);
        }
      } catch (error) {
        console.error('Error loading clients:', error);
      }
    };

    loadClients();

    return () => {
      active = false;
    };
  }, []);

  const isClientActive = (client) =>
    !client?.access_blocked && !client?.treatment_ended_at;

  const visibleClients = useMemo(
    () => (activeOnly ? clients.filter(isClientActive) : clients),
    [clients, activeOnly],
  );

  const selectedClient = useMemo(
    () => clients.find((client) => client.email === selectedValue) || null,
    [clients, selectedValue],
  );

  useEffect(() => {
    if (!selectedValue) {
      setQuery('');
      return;
    }

    if (selectedClient) {
      setQuery(getClientLabel(selectedClient));
    }
  }, [selectedClient, selectedValue]);

  const clientOptions = useMemo(
    () =>
      visibleClients.map((client) => ({
        key: client.id || client.email,
        email: client.email,
        label: getClientLabel(client),
      })),
    [visibleClients],
  );

  const handleChange = (value) => {
    setQuery(value);

    const normalizedValue = normalize(value);
    if (!normalizedValue) {
      return;
    }

    const client = clients.find((item) => {
      const label = normalize(getClientLabel(item));
      const email = normalize(item.email);
      return label === normalizedValue || email === normalizedValue;
    });

    if (client) {
      onSelect(client.email, client.full_name || client.email);
      setQuery(getClientLabel(client));
    }
  };

  const inputId = 'admin-client-search-filter';
  const dataListId = `${inputId}-options`;

  return (
    <div className="relative">
      <Input
        id={inputId}
        type="text"
        list={dataListId}
        value={query}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder || 'חפש או בחר לקוח'}
        className="pr-10 text-right"
        autoComplete="off"
      />
      <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <label className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none w-fit">
        <input
          type="checkbox"
          checked={activeOnly}
          onChange={(e) => setActiveOnly(e.target.checked)}
          className="h-3.5 w-3.5 accent-primary"
        />
        פעילים בלבד
      </label>
      <datalist id={dataListId}>
        {clientOptions.map((client) => (
          <option key={client.key} value={client.label} />
        ))}
      </datalist>
    </div>
  );
}