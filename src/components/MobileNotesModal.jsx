import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { StickyNote, Plus, Trash2, Check, X } from 'lucide-react';

const STORAGE_KEY = 'sidebar_notes_v1';

export default function MobileNotesModal({ open, onClose }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [recordId, setRecordId] = useState(null);
  const saveTimer = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        if (Array.isArray(local) && local.length > 0) setNotes(local);
        const records = await base44.entities.BusinessData.filter({ key: 'main' });
        if (records.length > 0) {
          const r = records[0];
          setRecordId(r.id);
          if (Array.isArray(r.sidebarNotes) && r.sidebarNotes.length > 0) {
            setNotes(r.sidebarNotes);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(r.sidebarNotes));
          }
        }
      } catch (e) {}
    };
    if (open) load();
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const persist = (updated) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        if (recordId) {
          await base44.entities.BusinessData.update(recordId, { sidebarNotes: updated });
        }
      } catch (e) {}
    }, 800);
  };

  const addNote = () => {
    const text = newNote.trim();
    if (!text) return;
    const updated = [...notes, { id: Date.now(), text, done: false }];
    setNotes(updated);
    persist(updated);
    setNewNote('');
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:hidden" onClick={onClose}>
      <div
        className="w-full bg-card border-t border-border rounded-t-2xl shadow-2xl p-4 pb-8 max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">פתקים מהירים</span>
            {notes.filter(n => !n.done).length > 0 && (
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[11px] font-bold">
                {notes.filter(n => !n.done).length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto space-y-1.5 mb-3">
          {notes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">אין פתקים עדיין</p>
          )}
          {notes.map(note => (
            <div key={note.id} className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 group ${note.done ? 'opacity-50 border-border' : 'border-border bg-muted/20'}`}>
              <button
                onClick={() => toggleDone(note.id)}
                className={`mt-0.5 shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${note.done ? 'bg-primary border-primary' : 'border-muted-foreground'}`}
              >
                {note.done && <Check className="w-3 h-3 text-primary-foreground" />}
              </button>
              <span className={`flex-1 text-sm leading-snug ${note.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {note.text}
              </span>
              <button onClick={() => removeNote(note.id)} className="shrink-0 text-destructive/60 hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addNote()}
            placeholder="פתק חדש..."
            className="flex-1 text-sm bg-muted border border-input rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            dir="rtl"
          />
          <button
            onClick={addNote}
            disabled={!newNote.trim()}
            className="shrink-0 w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}