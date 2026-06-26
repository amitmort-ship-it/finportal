import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Send, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';

const CHAT_ID = '-5485105895';

export default function TelegramSummary() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [open, setOpen] = useState(false);

  const generateSummary = async () => {
    setGenerating(true);
    setResult(null);
    try {
      // Fetch recent activity data
      const [fileRequests, updates, approvals, clients] = await Promise.all([
        base44.entities.FileRequest.list('-updated_date', 50),
        base44.entities.ClientUpdate.list('-created_date', 20),
        base44.entities.BankApproval.list('-created_date', 20),
        base44.entities.ClientProfile.list('-created_date', 50),
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayUploads = fileRequests.filter(r => r.status === 'uploaded' && new Date(r.updated_date) >= today);
      const todayUpdates = updates.filter(u => new Date(u.created_date) >= today);
      const recentApprovals = approvals.filter(a => new Date(a.created_date) >= today);
      const activeClients = clients.filter(c => !c.treatment_ended_at);

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה עוזר של יועץ משכנתאות. הכן סיכום יומי קצר ועניני לשליחה בקבוצת ניהול בטלגרם.
        
נתונים להיום (${new Date().toLocaleDateString('he-IL')}):
- מסמכים שהועלו היום: ${todayUploads.length}
- עדכונים שנשלחו ללקוחות היום: ${todayUpdates.length}
- אישורי בנק חדשים היום: ${recentApprovals.length}
- סה"כ לקוחות פעילים: ${activeClients.length}

${todayUploads.length > 0 ? `מסמכים שהועלו: ${todayUploads.map(r => r.title).join(', ')}` : ''}

כתוב סיכום קצר בעברית עם אימוג׳ים מתאימים. פורמט: כותרת + נקודות עיקריות. קצר ועניני, עד 5 שורות.`,
      });

      setMessage(res);
    } catch (e) {
      setResult({ ok: false, text: 'שגיאה בהכנת הסיכום' });
    }
    setGenerating(false);
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setResult(null);
    const res = await base44.functions.invoke('sendTelegramSummary', {
      chat_id: CHAT_ID,
      message: message.trim(),
    });
    setSending(false);
    if (res.data?.success) {
      setResult({ ok: true, text: 'ההודעה נשלחה בהצלחה ✓' });
      setMessage('');
    } else {
      setResult({ ok: false, text: res.data?.error || 'שגיאה בשליחה' });
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-primary" />
          שליחת סיכום לטלגרם
        </div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3" dir="rtl">
          <Button
            variant="outline"
            onClick={generateSummary}
            disabled={generating}
            className="w-full"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> מכין סיכום...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> הכן סיכום אוטומטי</>
            )}
          </Button>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">תוכן ההודעה</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="לחץ 'הכן סיכום אוטומטי' או כתוב כאן ידנית..."
              rows={6}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="w-full"
          >
            {sending ? 'שולח...' : <><Send className="w-4 h-4" /> שלח לטלגרם</>}
          </Button>

          {result && (
            <p className={`text-sm text-center font-medium ${result.ok ? 'text-green-600' : 'text-destructive'}`}>
              {result.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}