import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Send, ChevronDown, ChevronUp } from 'lucide-react';

export default function TelegramSummary() {
  const [chatId, setChatId] = useState('-5485105895');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [open, setOpen] = useState(false);

  const handleSend = async () => {
    if (!chatId.trim() || !message.trim()) return;
    setSending(true);
    setResult(null);
    const res = await base44.functions.invoke('sendTelegramSummary', {
      chat_id: chatId.trim(),
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
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Chat ID של הקבוצה/ערוץ</label>
            <input
              value={chatId}
              onChange={e => setChatId(e.target.value)}
              placeholder="לדוגמה: -1001234567890"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">תוכן ההודעה</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="כתוב את הסיכום כאן..."
              rows={5}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={sending || !chatId.trim() || !message.trim()}
            className="w-full"
          >
            {sending ? 'שולח...' : (
              <>
                <Send className="w-4 h-4" />
                שלח לטלגרם
              </>
            )}
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