import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { StickyNote, Plus, Trash2, Check } from 'lucide-react';

export default function SidebarNotes() {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [recordId, setRecordId] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const saveTimer = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const records = await base44.entities.BusinessData.filter({ key: 'main' });
        if (records.length > 0) {
          const r = records[0];
          setRecordId(r.id);
          const remoteNotes = Array.isArray(r.sidebarNotes) ? r.sidebarNotes : [];
          setNotes(remoteNotes);
        }
      } catch (e) {
        // silent
      }
    };
    load();

    // Real-time sync across devices
    const unsubscribe = base44.entities.BusinessData.subscribe((event) => {
      if (event.data?.key === 'main' && Array.isArray(event.data?.sidebarNotes)) {
        setNotes(event.data.sidebarNotes);
        if (event.data.id) setRecordId(event.data.id);
      }
    });

    return () => unsubscribe();
  }, []);

  const persist = (updated) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        if (recordId) {
          await base44.entities.BusinessData.update(recordId, { sidebarNotes: updated });
        } else {
          const created = await base44.entities.BusinessData.create({ key: 'main', sidebarNotes: updated });
          setRecordId(created.id);
        }
      } catch (e) {
        // silent
      }
    }, 800);
  };

  const addNote = () => {
    const text = newNote.trim();
    if (!text) return;
    const updated = [...notes, { id: Date.now(), text, done: false }];
    setNotes(updated);
    persist(updated);
    setNewNote('');
    inputRef.current?.focus();
  };

  const toggleDone = (id) => {
    const updated = notes.map(n => n.id === id ? { ...n, done: !n.done } : n);
    setNotes(updated);
    persist(updated);
  };

  const removeNote = (id) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    persist(updated);
  };

  return (
    <div className="mx-3 mb-3 rounded-xl border border-border bg-muted/30 overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <StickyNote className="w-3.5 h-3.5" />
          פתקים
          {notes.filter(n => !n.done).length > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
              {notes.filter(n => !n.done).length}
            </span>
          )}
        </div>
        <span className="text-[10px]">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-2 pb-2 space-y-1">
          {/* Notes list */}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {notes.length === 0 && (
              <p className="text-[11px] text-muted-foreground text-center py-2">אין פתקים עדיין</p>
            )}
            {notes.map(note => (
              <div key={note.id} className={`flex items-start gap-1.5 rounded-lg px-2 py-1.5 group transition-colors ${note.done ? 'opacity-50' : 'hover:bg-muted/50'}`}>
                <button
                  onClick={() => toggleDone(note.id)}
                  className={`mt-0.5 shrink-0 w-3.5 h-3.5 rounded border transition-colors ${note.done ? 'bg-primary border-primary' : 'border-muted-foreground hover:border-primary'}`}
                >
                  {note.done && <Check className="w-3 h-3 text-primary-foreground" />}
                </button>
                <span className={`flex-1 text-[11px] leading-tight break-words ${note.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {note.text}
                </span>
                <button
                  onClick={() => removeNote(note.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-destructive transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-center gap-1 pt-1">
            <input
              ref={inputRef}
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addNote()}
              placeholder="פתק חדש..."
              className="flex-1 text-[11px] bg-card border border-input rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
              dir="rtl"
            />
            <button
              onClick={addNote}
              disabled={!newNote.trim()}
              className="shrink-0 w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}