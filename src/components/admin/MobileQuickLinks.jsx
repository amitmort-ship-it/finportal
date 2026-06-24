import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const LINKS = [
  { label: 'ביטוח ישיר', url: 'https://www.555.co.il/pearl/apps/cooperation-landing-page/homeStep?attentionCode=406&cooperationCode=3618', bg: 'bg-red-600' },
  { label: 'Notion', url: 'https://www.notion.so/304051ce360080539d38c4a852b964cb?v=304051ce360081b2a665000cdc320bfc', bg: 'bg-gray-900' },
  { label: 'SmartNPV', url: 'https://www.snpv.co.il/clients', bg: 'bg-green-600' },
  { label: 'Paperless', url: 'https://www.paperless.tax/admin/dashboard;sUserID=nhgp95igmi', bg: 'bg-blue-600' },
  { label: 'הסכם ליווי', url: 'https://www.snpv.co.il/documents/edit/RVlveUtWUk9CaldHTXJBL3lYV0lpZz09', bg: 'bg-amber-600' },
  { label: 'יומן', url: 'https://calendar.google.com/calendar/u/3/r/week', bg: 'bg-sky-500' },
];

export default function MobileQuickLinks() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden mt-3">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted text-sm font-medium text-muted-foreground"
      >
        <span>קישורים מהירים</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          {LINKS.map(({ label, url, bg }) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center text-center px-2 py-2.5 rounded-xl text-xs font-semibold text-white active:scale-95 transition-all ${bg}`}
            >
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}