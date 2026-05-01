import { useEffect, useMemo, useState } from 'react';
import { ChevronsUpDown, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

function getClientLabel(client) {
  const name = client?.full_name || client?.email || 'ללא שם';
  const email = client?.email || '';
  return email && name !== email ? `${name} — ${email}` : name;
}

export default function ClientSearchFilter({ onSelect, placeholder, selectedValue = '' }) {
  const [open, setOpen] = useState(false);
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
        setClients(sortedProfiles.filter((client) => client?.email));
      } catch (error) {
        console.error('Error loading clients:', error);
      }
    };

    loadClients();
  }, []);

  const selectedClient = useMemo(
    () => clients.find((client) => client.email === selectedValue) || null,
    [clients, selectedValue]
  );

  const handleSelect = (email) => {
    const client = clients.find((item) => item.email === email);
    if (!client) return;

    onSelect(client.email, client.full_name || client.email);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-background text-right font-normal"
        >
          <span className="truncate">
            {selectedClient ? getClientLabel(selectedClient) : (placeholder || 'חפש או בחר לקוח')}
          </span>
          <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter>
          <CommandInput placeholder="חפש לקוח..." className="text-right" />
          <CommandList>
            <CommandEmpty>לא נמצאו לקוחות</CommandEmpty>
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id || client.email}
                  value={`${client.full_name || ''} ${client.email || ''}`.trim()}
                  onSelect={() => handleSelect(client.email)}
                  className="flex items-center justify-between gap-2 text-right"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{client.full_name || client.email}</div>
                    <div className="truncate text-xs text-muted-foreground">{client.email}</div>
                  </div>
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0',
                      selectedValue === client.email ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
