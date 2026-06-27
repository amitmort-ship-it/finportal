import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ImagePlus, X, ChevronDown, ChevronUp } from 'lucide-react';

export default function PreciseContracts() {
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [uploading, setUploading] = useState(null); // entryId or 'new'
  const [form, setForm] = useState({ title: '', notes: '' });
  const [captionEdits, setCaptionEdits] = useState({}); // { entryId_imgIdx: caption }

  useEffect(() => { loadEntries(); }, []);

  const loadEntries = async () => {
    const data = await base44.entities.ContractEntry.list('-created_date');
    setEntries(data);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    const entry = await base44.entities.ContractEntry.create({ ...form, images: [] });
    setForm({ title: '', notes: '' });
    setShowForm(false);
    setExpandedId(entry.id);
    loadEntries();
  };

  const handleDelete = async (id) => {
    await base44.entities.ContractEntry.delete(id);
    loadEntries();
  };

  const handleUploadImage = async (entryId, e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(entryId);
    const entry = entries.find(en => en.id === entryId);
    const existing = entry?.images || [];
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push({ url: file_url, name: file.name, caption: '' });
    }
    await base44.entities.ContractEntry.update(entryId, { images: [...existing, ...uploaded] });
    setUploading(null);
    loadEntries();
    e.target.value = '';
  };

  const handleRemoveImage = async (entry, idx) => {
    const images = entry.images.filter((_, i) => i !== idx);
    await base44.entities.ContractEntry.update(entry.id, { images });
    loadEntries();
  };

  const handleSaveCaption = async (entry, idx) => {
    const key = `${entry.id}_${idx}`;
    const caption = captionEdits[key] ?? entry.images[idx].caption ?? '';
    const images = entry.images.map((img, i) => i === idx ? { ...img, caption } : img);
    await base44.entities.ContractEntry.update(entry.id, { images });
    setCaptionEdits(prev => { const n = { ...prev }; delete n[key]; return n; });
    loadEntries();
  };

  const handleUpdateNotes = async (entry, notes) => {
    await base44.entities.ContractEntry.update(entry.id, { notes });
    loadEntries();
  };

  return (
    <div className="space-y-4">
      {showForm ? (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="כותרת (למשל: חוזה מול בנק הפועלים, תשלום ראשון...)"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="הערות (אופציונלי)"
            rows={2}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>ביטול</Button>
            <Button size="sm" onClick={handleCreate}>הוסף</Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setShowForm(true)} className="w-full" variant="outline">
          <Plus className="w-4 h-4" />
          רשומה חדשה
        </Button>
      )}

      <div className="space-y-2">
        {entries.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">אין רשומות עדיין</p>
        )}
        {entries.map(entry => (
          <div key={entry.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{entry.title}</p>
                {entry.notes && <p className="text-xs text-muted-foreground truncate">{entry.notes}</p>}
                {(entry.images || []).length > 0 && (
                  <p className="text-xs text-muted-foreground">{entry.images.length} צילומי מסך</p>
                )}
              </div>
              <button onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)} className="text-muted-foreground hover:text-foreground">
                {expandedId === entry.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button onClick={() => handleDelete(entry.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {expandedId === entry.id && (
              <div className="px-4 pb-4 border-t border-border pt-3 space-y-4">
                {/* Notes */}
                <NotesEditor value={entry.notes || ''} onSave={notes => handleUpdateNotes(entry, notes)} />

                {/* Images with captions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-muted-foreground">צילומי מסך</span>
                    <label className="cursor-pointer flex items-center gap-1 text-xs text-primary hover:underline">
                      <ImagePlus className="w-3.5 h-3.5" />
                      {uploading === entry.id ? 'מעלה...' : 'הוסף צילום מסך'}
                      <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleUploadImage(entry.id, e)} disabled={uploading === entry.id} />
                    </label>
                  </div>

                  <div className="space-y-3">
                    {(entry.images || []).map((img, idx) => {
                      const key = `${entry.id}_${idx}`;
                      const captionVal = captionEdits[key] !== undefined ? captionEdits[key] : (img.caption || '');
                      const isDirty = captionEdits[key] !== undefined;
                      return (
                        <div key={idx} className="flex gap-3 items-start bg-muted/40 rounded-lg p-3">
                          <div className="relative group shrink-0">
                            <img src={img.url} alt={img.name} className="w-24 h-24 object-cover rounded-lg border border-border cursor-pointer" onClick={() => window.open(img.url, '_blank')} />
                            <button
                              onClick={() => handleRemoveImage(entry, idx)}
                              className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <textarea
                              value={captionVal}
                              onChange={e => setCaptionEdits(prev => ({ ...prev, [key]: e.target.value }))}
                              placeholder="כתוב מלל / הסבר לצילום..."
                              rows={3}
                              className="w-full border border-input rounded-lg px-2.5 py-1.5 text-xs bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                            {isDirty && (
                              <Button size="sm" className="h-6 text-xs px-2" onClick={() => handleSaveCaption(entry, idx)}>שמור</Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NotesEditor({ value, onSave }) {
  const [text, setText] = useState(value);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setText(value); setDirty(false); }, [value]);

  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">הערות</label>
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setDirty(true); }}
        rows={2}
        className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder="הערות..."
      />
      {dirty && <Button size="sm" onClick={() => { onSave(text); setDirty(false); }}>שמור</Button>}
    </div>
  );
}