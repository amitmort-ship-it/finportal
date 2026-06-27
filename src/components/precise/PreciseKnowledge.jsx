import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, FileText, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

export default function PreciseKnowledge() {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', tags: '', notes: '', file_url: '', file_name: '' });

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    const data = await base44.entities.KnowledgeItem.list('-created_date');
    setItems(data);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, file_url, file_name: file.name }));
    setUploading(false);
    e.target.value = '';
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    await base44.entities.KnowledgeItem.create(form);
    setForm({ title: '', description: '', tags: '', notes: '', file_url: '', file_name: '' });
    setShowForm(false);
    loadItems();
  };

  const handleDelete = async (id) => {
    await base44.entities.KnowledgeItem.delete(id);
    loadItems();
  };

  const handleUpdateNotes = async (item, notes) => {
    await base44.entities.KnowledgeItem.update(item.id, { notes });
    loadItems();
  };

  return (
    <div className="space-y-4">
      {/* Add item */}
      {showForm ? (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="שם המסמך / נושא הידע"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="תיאור קצר..."
            rows={3}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            value={form.tags}
            onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            placeholder="תגיות (מופרדות בפסיקים)"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="הערות"
            rows={2}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {/* File upload */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">צרף קובץ</label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer flex items-center gap-2 border border-dashed border-border rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
                <FileText className="w-4 h-4" />
                {uploading ? 'מעלה...' : form.file_name || 'בחר קובץ'}
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
              {form.file_url && (
                <a href={form.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  פתח
                </a>
              )}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>ביטול</Button>
            <Button size="sm" onClick={handleCreate}>הוסף</Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setShowForm(true)} className="w-full" variant="outline">
          <Plus className="w-4 h-4" />
          הוסף פריט ידע
        </Button>
      )}

      {/* Items list */}
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">אין פריטים עדיין</p>
        )}
        {items.map(item => (
          <div key={item.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-start gap-3 px-4 py-3">
              <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>}
                {item.tags && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.tags.split(',').map((tag, i) => (
                      <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{tag.trim()}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {item.file_url && (
                  <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} className="text-muted-foreground hover:text-foreground">
                  {expandedId === item.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {expandedId === item.id && (
              <div className="px-4 pb-4 border-t border-border pt-3">
                <label className="text-xs text-muted-foreground block mb-1">הערות</label>
                <NoteEditor value={item.notes || ''} onSave={notes => handleUpdateNotes(item, notes)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NoteEditor({ value, onSave }) {
  const [text, setText] = useState(value);
  const [saved, setSaved] = useState(true);

  const handleSave = () => {
    onSave(text);
    setSaved(true);
  };

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setSaved(false); }}
        rows={3}
        className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder="הערות..."
      />
      {!saved && (
        <Button size="sm" onClick={handleSave}>שמור הערות</Button>
      )}
    </div>
  );
}