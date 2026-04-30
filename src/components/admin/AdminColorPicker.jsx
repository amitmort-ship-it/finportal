import { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';

// Each palette overrides the full set of CSS design tokens
const PALETTES = [
  {
    id: 'default',
    label: 'כחול (ברירת מחדל)',
    preview: ['#dbeafe', '#93c5fd', '#3b82f6'],
    vars: null, // means: remove all overrides → use original index.css values
  },
  {
    id: 'lavender',
    label: 'לבנדר רגוע',
    preview: ['#ede9fe', '#c4b5fd', '#7c3aed'],
    vars: {
      '--background':           '250 30% 97%',
      '--foreground':           '250 40% 15%',
      '--card':                 '0 0% 100%',
      '--card-foreground':      '250 40% 15%',
      '--popover':              '0 0% 100%',
      '--popover-foreground':   '250 40% 15%',
      '--primary':              '262 60% 58%',
      '--primary-foreground':   '0 0% 100%',
      '--secondary':            '250 25% 93%',
      '--secondary-foreground': '250 40% 15%',
      '--muted':                '250 25% 93%',
      '--muted-foreground':     '250 20% 50%',
      '--accent':               '250 25% 93%',
      '--accent-foreground':    '250 40% 15%',
      '--border':               '250 20% 87%',
      '--input':                '250 20% 87%',
      '--ring':                 '262 60% 58%',
      '--sidebar-background':   '0 0% 100%',
      '--sidebar-primary':      '262 60% 58%',
      '--sidebar-border':       '250 20% 87%',
    },
  },
  {
    id: 'mint',
    label: 'מנטה מרגיע',
    preview: ['#d1fae5', '#6ee7b7', '#059669'],
    vars: {
      '--background':           '155 30% 97%',
      '--foreground':           '160 40% 12%',
      '--card':                 '0 0% 100%',
      '--card-foreground':      '160 40% 12%',
      '--popover':              '0 0% 100%',
      '--popover-foreground':   '160 40% 12%',
      '--primary':              '158 55% 40%',
      '--primary-foreground':   '0 0% 100%',
      '--secondary':            '155 25% 92%',
      '--secondary-foreground': '160 40% 12%',
      '--muted':                '155 25% 92%',
      '--muted-foreground':     '158 20% 45%',
      '--accent':               '155 25% 92%',
      '--accent-foreground':    '160 40% 12%',
      '--border':               '155 20% 85%',
      '--input':                '155 20% 85%',
      '--ring':                 '158 55% 40%',
      '--sidebar-background':   '0 0% 100%',
      '--sidebar-primary':      '158 55% 40%',
      '--sidebar-border':       '155 20% 85%',
    },
  },
  {
    id: 'peach',
    label: 'אפרסק חמים',
    preview: ['#fff7ed', '#fed7aa', '#ea580c'],
    vars: {
      '--background':           '28 40% 97%',
      '--foreground':           '20 40% 12%',
      '--card':                 '0 0% 100%',
      '--card-foreground':      '20 40% 12%',
      '--popover':              '0 0% 100%',
      '--popover-foreground':   '20 40% 12%',
      '--primary':              '24 80% 50%',
      '--primary-foreground':   '0 0% 100%',
      '--secondary':            '28 30% 92%',
      '--secondary-foreground': '20 40% 12%',
      '--muted':                '28 30% 92%',
      '--muted-foreground':     '24 20% 48%',
      '--accent':               '28 30% 92%',
      '--accent-foreground':    '20 40% 12%',
      '--border':               '28 25% 86%',
      '--input':                '28 25% 86%',
      '--ring':                 '24 80% 50%',
      '--sidebar-background':   '0 0% 100%',
      '--sidebar-primary':      '24 80% 50%',
      '--sidebar-border':       '28 25% 86%',
    },
  },
  {
    id: 'sky',
    label: 'שמיים כחול',
    preview: ['#e0f2fe', '#7dd3fc', '#0284c7'],
    vars: {
      '--background':           '204 40% 97%',
      '--foreground':           '210 40% 12%',
      '--card':                 '0 0% 100%',
      '--card-foreground':      '210 40% 12%',
      '--popover':              '0 0% 100%',
      '--popover-foreground':   '210 40% 12%',
      '--primary':              '200 90% 40%',
      '--primary-foreground':   '0 0% 100%',
      '--secondary':            '204 30% 92%',
      '--secondary-foreground': '210 40% 12%',
      '--muted':                '204 30% 92%',
      '--muted-foreground':     '204 20% 48%',
      '--accent':               '204 30% 92%',
      '--accent-foreground':    '210 40% 12%',
      '--border':               '204 25% 86%',
      '--input':                '204 25% 86%',
      '--ring':                 '200 90% 40%',
      '--sidebar-background':   '0 0% 100%',
      '--sidebar-primary':      '200 90% 40%',
      '--sidebar-border':       '204 25% 86%',
    },
  },
  {
    id: 'rose',
    label: 'ורוד עדין',
    preview: ['#fff1f2', '#fecdd3', '#e11d48'],
    vars: {
      '--background':           '350 40% 97%',
      '--foreground':           '345 40% 12%',
      '--card':                 '0 0% 100%',
      '--card-foreground':      '345 40% 12%',
      '--popover':              '0 0% 100%',
      '--popover-foreground':   '345 40% 12%',
      '--primary':              '347 70% 50%',
      '--primary-foreground':   '0 0% 100%',
      '--secondary':            '350 30% 93%',
      '--secondary-foreground': '345 40% 12%',
      '--muted':                '350 30% 93%',
      '--muted-foreground':     '347 20% 48%',
      '--accent':               '350 30% 93%',
      '--accent-foreground':    '345 40% 12%',
      '--border':               '350 25% 87%',
      '--input':                '350 25% 87%',
      '--ring':                 '347 70% 50%',
      '--sidebar-background':   '0 0% 100%',
      '--sidebar-primary':      '347 70% 50%',
      '--sidebar-border':       '350 25% 87%',
    },
  },
  {
    id: 'charcoal',
    label: 'כהה נקי',
    preview: ['#1e293b', '#334155', '#94a3b8'],
    vars: {
      '--background':           '222 30% 10%',
      '--foreground':           '210 20% 92%',
      '--card':                 '222 28% 14%',
      '--card-foreground':      '210 20% 92%',
      '--popover':              '222 28% 14%',
      '--popover-foreground':   '210 20% 92%',
      '--primary':              '214 70% 60%',
      '--primary-foreground':   '0 0% 100%',
      '--secondary':            '222 25% 20%',
      '--secondary-foreground': '210 20% 92%',
      '--muted':                '222 25% 20%',
      '--muted-foreground':     '215 15% 55%',
      '--accent':               '222 25% 20%',
      '--accent-foreground':    '210 20% 92%',
      '--border':               '222 22% 22%',
      '--input':                '222 22% 22%',
      '--ring':                 '214 70% 60%',
      '--sidebar-background':   '222 28% 12%',
      '--sidebar-primary':      '214 70% 60%',
      '--sidebar-border':       '222 22% 22%',
    },
  },
];

const STORAGE_KEY = 'admin-palette';
const CSS_VAR_KEYS = [
  '--background','--foreground','--card','--card-foreground',
  '--popover','--popover-foreground','--primary','--primary-foreground',
  '--secondary','--secondary-foreground','--muted','--muted-foreground',
  '--accent','--accent-foreground','--border','--input','--ring',
  '--sidebar-background','--sidebar-primary','--sidebar-border',
];

// Light-mode default values (from index.css :root) — used when palette is 'default'
const DEFAULT_LIGHT_VARS = {
  '--background':           '220 20% 97%',
  '--foreground':           '222 47% 11%',
  '--card':                 '0 0% 100%',
  '--card-foreground':      '222 47% 11%',
  '--popover':              '0 0% 100%',
  '--popover-foreground':   '222 47% 11%',
  '--primary':              '221 83% 53%',
  '--primary-foreground':   '0 0% 100%',
  '--secondary':            '220 14% 96%',
  '--secondary-foreground': '222 47% 11%',
  '--muted':                '220 14% 96%',
  '--muted-foreground':     '220 9% 46%',
  '--accent':               '220 14% 96%',
  '--accent-foreground':    '222 47% 11%',
  '--border':               '220 13% 91%',
  '--input':                '220 13% 91%',
  '--ring':                 '221 83% 53%',
  '--sidebar-background':   '0 0% 100%',
  '--sidebar-primary':      '221 83% 53%',
  '--sidebar-border':       '220 13% 91%',
};

function applyPalette(id) {
  const palette = PALETTES.find((p) => p.id === id);
  if (!palette) return;

  const vars = palette.vars || DEFAULT_LIGHT_VARS;
  Object.entries(vars).forEach(([key, val]) => {
    document.documentElement.style.setProperty(key, val);
  });
}

function resetPalette() {
  Object.entries(DEFAULT_LIGHT_VARS).forEach(([key, val]) => {
    document.documentElement.style.setProperty(key, val);
  });
}

export function useAdminPalette() {
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    applyPalette(saved || 'default');
    return () => resetPalette();
  }, []);
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
    <div className="flex items-center gap-2 shrink-0">
      <Palette className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex gap-1.5">
        {PALETTES.map((palette) => (
          <button
            key={palette.id}
            title={palette.label}
            onClick={() => handleSelect(palette.id)}
            className={`relative flex gap-0.5 rounded-full overflow-hidden transition-all border-2 w-9 h-7 ${
              selected === palette.id
                ? 'border-foreground scale-110 shadow-md'
                : 'border-border hover:scale-105'
            }`}
          >
            {palette.preview.map((color, i) => (
              <span
                key={i}
                className="flex-1 h-full"
                style={{ backgroundColor: color }}
              />
            ))}
          </button>
        ))}
      </div>
    </div>
  );
}