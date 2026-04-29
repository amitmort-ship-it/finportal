import { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';

const PALETTES = [
  {
    id: 'default',
    label: 'ברירת מחדל',
    primary: '221 83% 53%',
    bg: 'hsl(221, 83%, 53%)',
  },
  {
    id: 'emerald',
    label: 'ירוק',
    primary: '160 60% 38%',
    bg: 'hsl(160, 60%, 38%)',
  },
  {
    id: 'rose',
    label: 'ורוד',
    primary: '346 77% 49%',
    bg: 'hsl(346, 77%, 49%)',
  },
  {
    id: 'amber',
    label: 'כתום',
    primary: '32 95% 44%',
    bg: 'hsl(32, 95%, 44%)',
  },
  {
    id: 'violet',
    label: 'סגול',
    primary: '262 80% 55%',
    bg: 'hsl(262, 80%, 55%)',
  },
  {
    id: 'slate',
    label: 'אפור',
    primary: '215 25% 35%',
    bg: 'hsl(215, 25%, 35%)',
  },
];

const STORAGE_KEY = 'admin-palette';

export function useAdminPalette() {
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) applyPalette(saved);
    return () => resetPalette();
  }, []);
}

function applyPalette(id) {
  const palette = PALETTES.find((p) => p.id === id);
  if (!palette) return;
  document.documentElement.style.setProperty('--primary', palette.primary);
  document.documentElement.style.setProperty('--ring', palette.primary);
  document.documentElement.style.setProperty('--sidebar-primary', palette.primary);
}

function resetPalette() {
  document.documentElement.style.removeProperty('--primary');
  document.documentElement.style.removeProperty('--ring');
  document.documentElement.style.removeProperty('--sidebar-primary');
}

export default function AdminColorPicker() {
  const [selected, setSelected] = useState(
    () => localStorage.getItem(STORAGE_KEY) || 'default'
  );

  const handleSelect = (id) => {
    setSelected(id);
    localStorage.setItem(STORAGE_KEY, id);
    applyPalette(id);
  };

  return (
    <div className="flex items-center gap-3">
      <Palette className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex gap-2 flex-wrap">
        {PALETTES.map((palette) => (
          <button
            key={palette.id}
            title={palette.label}
            onClick={() => handleSelect(palette.id)}
            className={`w-7 h-7 rounded-full transition-all border-2 ${
              selected === palette.id
                ? 'border-foreground scale-110 shadow-md'
                : 'border-transparent hover:scale-105'
            }`}
            style={{ backgroundColor: palette.bg }}
          />
        ))}
      </div>
    </div>
  );
}