import { useState } from 'react';
import { Pencil, Trash2, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const INCOME_CATEGORIES = ['משכנתאות', 'כ.ד', 'הייטק', 'אחר'];
const DEAL_BUCKETS = ['חדש', 'בתהליך', 'ממתין לתשלום', 'שולם חלקית', 'שולם מלא'];

function fmt(n) {
  return `₪${Math.round(n || 0).toLocaleString('he-IL')}`;
}

function getDealStatus(deal) {
  if (deal?.isFrozen) return 'מוקפאת';
  const remaining = Math.max(0, Number(deal?.totalAmount || 0) - Number(deal?.paidAmount || 0));
  return remaining === 0 ? 'שולם מלא' : Number(deal?.paidAmount || 0) > 0 ? 'שולם חלקית' : 'ממתין לתשלום';
}

const STATUS_STYLES = {
  'מוקפאת': 'bg-slate-100 text-slate-600',
  'שולם מלא': 'bg-emerald-100 text-emerald-700',
  'שולם חלקית': 'bg-amber-100 text-amber-700',
  'ממתין לתשלום': 'bg-blue-100 text-blue-700',
};

const RAG_EMOJI = { green: '🟢', yellow: '🟡', red: '🔴' };

export default function DealCard({ deal, index, onEdit, onRemove, onToggleFrozen }) {
  const [editing, setEditing] = useState(false);
  const [editClient, setEditClient] = useState('');
  const [editTotal, setEditTotal] = useState('');
  const [editPaid, setEditPaid] = useState('');
  const [editCategory, setEditCategory] = useState('משכנתאות');
  const [editBucket, setEditBucket] = useState(DEAL_BUCKETS[0]);
  const [editRag, setEditRag] = useState('');

  const remaining = Math.max(0, Number(deal.totalAmount || 0) - Number(deal.paidAmount || 0));
  const status = getDealStatus(deal);
  const paidPct = deal.totalAmount > 0 ? Math.min(100, Math.round((Number(deal.paidAmount || 0) / Number(deal.totalAmount)) * 100)) : 0;

  const startEdit = () => {
    setEditClient(deal.clientName || '');
    setEditTotal(String(deal.totalAmount || ''));
    setEditPaid(String(deal.paidAmount || ''));
    setEditCategory(deal.category || 'משכנתאות');
    setEditBucket(deal.bucket || DEAL_BUCKETS[0]);
    setEditRag(deal.rag_status || '');
    setEditing(true);
  };

  const saveEdit = () => {
    const totalAmount = Number(String(editTotal).replace(/,/g, ''));
    const paidAmount = Number(String(editPaid).replace(/,/g, ''));
    if (!editClient.trim() || !totalAmount || paidAmount < 0) return;
    onEdit(deal.id, { clientName: editClient.trim(), totalAmount, paidAmount: Math.min(totalAmount, paidAmount), category: editCategory, bucket: editBucket, rag_status: editRag });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3" dir="rtl">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">שם לקוח</label>
            <Input value={editClient} onChange={(e) => setEditClient(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">סה"כ עסקה</label>
            <Input type="number" value={editTotal} onChange={(e) => setEditTotal(e.target.value)} dir="ltr" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">נגבה</label>
            <Input type="number" value={editPaid} onChange={(e) => setEditPaid(e.target.value)} dir="ltr" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">קטגוריה</label>
            <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
              {INCOME_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">R/Y/G</label>
            <select value={editRag} onChange={(e) => setEditRag(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
              <option value="">—</option>
              <option value="green">🟢 ירוק</option>
              <option value="yellow">🟡 צהוב</option>
              <option value="red">🔴 אדום</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={saveEdit} className="flex-1">שמור</Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="flex-1">ביטול</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-colors ${deal.isFrozen ? 'bg-muted/30 border-muted opacity-70' : 'bg-card border-border hover:border-primary/20'}`} dir="rtl">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-muted-foreground w-5 shrink-0">#{index + 1}</span>
          <span className="font-semibold text-foreground truncate">{deal.clientName}</span>
          {deal.rag_status && <span className="text-base leading-none">{RAG_EMOJI[deal.rag_status] || ''}</span>}
        </div>
        <span className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] || 'bg-muted text-muted-foreground'}`}>{status}</span>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted/40 px-2 py-1.5">
          <p className="text-[10px] text-muted-foreground">סה"כ</p>
          <p className="text-sm font-bold text-foreground">{fmt(deal.totalAmount)}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1.5">
          <p className="text-[10px] text-emerald-600">נגבה</p>
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{fmt(deal.paidAmount)}</p>
        </div>
        <div className="rounded-lg bg-orange-50 dark:bg-orange-950/20 px-2 py-1.5">
          <p className="text-[10px] text-orange-600">יתרה</p>
          <p className="text-sm font-bold text-orange-700 dark:text-orange-400">{fmt(remaining)}</p>
        </div>
      </div>

      {/* Progress bar */}
      {deal.totalAmount > 0 && (
        <div className="space-y-1">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{deal.category}</span>
            <span>{paidPct}% שולם</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-1.5 pt-1">
        <button onClick={() => onToggleFrozen(deal.id)} className={`flex-1 flex items-center justify-center gap-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${deal.isFrozen ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
          <Power className="w-3 h-3" />
          {deal.isFrozen ? 'הפעל' : 'הקפא'}
        </button>
        <button onClick={startEdit} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-primary/20 bg-primary/5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
          <Pencil className="w-3 h-3" />
          ערוך
        </button>
        <button onClick={() => onRemove(deal.id)} className="flex items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}