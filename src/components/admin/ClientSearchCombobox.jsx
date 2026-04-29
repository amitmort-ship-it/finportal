import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ClientSearchCombobox({ users, value, onValueChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
    );
  }, [search, users]);

  const selectedUser = users.find((u) => u.email === value);

  return (
    <div className="relative w-full md:w-80">
      <Label className="text-sm block mb-2">בחר לקוח (אופציונלי)</Label>

      <div className="relative">
        <Input
          placeholder="חפש לקוח בשם או אימייל..."
          value={open ? search : selectedUser ? selectedUser.full_name || selectedUser.email : ''}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          className="w-full"
          dir="rtl"
        />

        {selectedUser && !open && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => {
              onValueChange(null);
              setSearch('');
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onValueChange(null);
              setSearch('');
              setOpen(false);
            }}
            className="w-full text-right px-3 py-2 hover:bg-accent transition-colors text-sm flex items-center justify-between"
          >
            <span>כל הלקוחות</span>
            {!value && <Check className="w-4 h-4 text-primary" />}
          </button>

          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground text-center">אין תוצאות</div>
          ) : (
            filtered.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  onValueChange(user.email);
                  setSearch('');
                  setOpen(false);
                }}
                className="w-full text-right px-3 py-2 hover:bg-accent transition-colors text-sm flex items-center justify-between"
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">{user.full_name || 'ללא שם'}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
                {value === user.email && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}