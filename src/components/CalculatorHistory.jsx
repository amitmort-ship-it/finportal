import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { History, Save, Trash2, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Props:
 *   calculatorId: string
 *   getCurrentInputs: () => object   — snapshot of form state
 *   getSummary: () => string          — short text summary of results
 *   onRestore: (inputs) => void       — called when user clicks restore
 */
export default function CalculatorHistory({ calculatorId, getCurrentInputs, getSummary, onRestore }) {
  const [history, setHistory] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState('');
  const [showLabelInput, setShowLabelInput] = useState(false);

  useEffect(() => {
    if (open) loadHistory();
  }, [open]);

  const loadHistory = async () => {
    const items = await base44.entities.CalculatorHistory.filter({ calculator_id: calculatorId }, '-created_date', 50);
    setHistory(items);
  };

  const handleSave = async () => {
    setSaving(true);
    const now = new Date().toLocaleString('he-IL');
    await base44.entities.CalculatorHistory.create({
      calculator_id: calculatorId,
      label: label.trim() || now,
      inputs: getCurrentInputs(),
      summary: getSummary(),
    });
    setSaving(false);
    setLabel('');
    setShowLabelInput(false);
    if (open) loadHistory();
  };

  const handleDelete = async (id) => {
    await base44.entities.CalculatorHistory.delete(id);
    loadHistory();
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          <History className="w-4 h-4 text-primary" />
          היסטוריית סימולציות
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-2">
          {showLabelInput && (
            <input
              autoFocus
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowLabelInput(false); }}
              placeholder="שם לסימולציה (אופציונלי)"
              className="border border-input rounded-lg px-2.5 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring w-48"
            />
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => showLabelInput ? handleSave() : setShowLabelInput(true)}
            disabled={saving}
            className="text-xs h-8"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'שומר...' : 'שמור סימולציה'}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">אין סימולציות שמורות עדיין</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {history.map(item => (
                <div key={item.id} className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    {item.summary && <p className="text-xs text-muted-foreground mt-0.5 leading-5">{item.summary}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(item.created_date).toLocaleString('he-IL')}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    {onRestore && (
                      <button
                        onClick={() => onRestore(item.inputs)}
                        title="טען סימולציה"
                        className="text-primary hover:text-primary/70 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      title="מחק"
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}