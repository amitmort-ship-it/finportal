import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ImagePlus, ChevronDown, ChevronUp, X, Check } from 'lucide-react';

const CATEGORIES = ['פיתוח', 'רון', 'שוטף', 'דוחות חודשיים'];
const STATUS_COLORS = {
  'פתוח': 'bg-red-100 text-red-700',
  'בתהליך': 'bg-yellow-100 text-yellow-700',
  'הושלם': 'bg-green-100 text-green-700',
};

export default function PreciseTasks() {
  const [tasks, setTasks] = useState([]);
  const [activeCategory, setActiveCategory] = useState('פיתוח');
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', status: 'פתוח', notes: '', category: 'פיתוח' });
  const fileInputRef = useRef(null);

  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    const data = await base44.entities.PreciseTask.list('-created_date');
    setTasks(data);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    await base44.entities.PreciseTask.create({ ...form, images: [] });
    setForm({ title: '', description: '', status: 'פתוח', notes: '', category: activeCategory });
    setShowForm(false);
    loadTasks();
  };

  const handleDelete = async (id) => {
    await base44.entities.PreciseTask.delete(id);
    loadTasks();
  };

  const handleStatusChange = async (task, status) => {
    await base44.entities.PreciseTask.update(task.id, { status });
    loadTasks();
  };

  const handleUploadImages = async (taskId, e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const task = tasks.find(t => t.id === taskId);
    const existing = task?.images || [];
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push({ url: file_url, name: file.name });
    }
    await base44.entities.PreciseTask.update(taskId, { images: [...existing, ...uploaded] });
    setUploading(false);
    loadTasks();
    e.target.value = '';
  };

  const handleRemoveImage = async (task, imgIdx) => {
    const images = task.images.filter((_, i) => i !== imgIdx);
    await base44.entities.PreciseTask.update(task.id, { images });
    loadTasks();
  };

  const filtered = tasks.filter(t => t.category === activeCategory);

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setShowForm(false); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              activeCategory === cat
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {cat}
            <span className="mr-1.5 text-xs opacity-70">({tasks.filter(t => t.category === cat && t.status !== 'הושלם').length})</span>
          </button>
        ))}
      </div>

      {/* Add task */}
      {showForm ? (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="כותרת המשימה"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="תיאור (אופציונלי)"
            rows={2}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="הערות (אופציונלי)"
            rows={2}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex gap-2">
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="flex-1 border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none"
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="flex-1 border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none"
            >
              <option>פתוח</option>
              <option>בתהליך</option>
              <option>הושלם</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>ביטול</Button>
            <Button size="sm" onClick={handleCreate}>הוסף משימה</Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => { setShowForm(true); setForm(f => ({ ...f, category: activeCategory })); }} className="w-full" variant="outline">
          <Plus className="w-4 h-4" />
          משימה חדשה ב{activeCategory}
        </Button>
      )}

      {/* Task list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">אין משימות בקטגוריה זו</p>
        )}
        {filtered.map(task => (
          <div key={task.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => handleStatusChange(task, task.status === 'הושלם' ? 'פתוח' : task.status === 'פתוח' ? 'בתהליך' : 'הושלם')}
                className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === 'הושלם' ? 'bg-green-500 border-green-500' : task.status === 'בתהליך' ? 'border-yellow-500' : 'border-border'}`}
              >
                {task.status === 'הושלם' && <Check className="w-3 h-3 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.status === 'הושלם' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[task.status]}`}>{task.status}</span>
              <button onClick={() => setExpandedId(expandedId === task.id ? null : task.id)} className="text-muted-foreground hover:text-foreground">
                {expandedId === task.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button onClick={() => handleDelete(task.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {expandedId === task.id && (
              <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                {task.notes && <p className="text-sm text-muted-foreground">{task.notes}</p>}

                {/* Images */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">תמונות התכתבויות</span>
                    <label className="cursor-pointer flex items-center gap-1 text-xs text-primary hover:underline">
                      <ImagePlus className="w-3.5 h-3.5" />
                      {uploading ? 'מעלה...' : 'הוסף תמונה'}
                      <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleUploadImages(task.id, e)} disabled={uploading} />
                    </label>
                  </div>
                  {(task.images || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {task.images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img src={img.url} alt={img.name} className="w-20 h-20 object-cover rounded-lg border border-border" />
                          <button
                            onClick={() => handleRemoveImage(task, idx)}
                            className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}