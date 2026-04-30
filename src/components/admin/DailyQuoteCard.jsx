import { Sparkles } from 'lucide-react';
import { getDailyQuote } from '@/lib/dailyQuotes';

export default function DailyQuoteCard() {
  const { text } = getDailyQuote();

  return (
    <div className="rounded-xl border border-primary/15 bg-gradient-to-l from-primary/10 via-card to-amber-50/70 p-6 shadow-sm dark:from-primary/10 dark:via-card dark:to-amber-950/20">
      <div className="flex items-start gap-3" dir="rtl">
        <div className="rounded-full bg-primary/10 p-2.5 shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-foreground">המשפט היומי</h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              השראה יומית
            </span>
          </div>
          <p className="text-base leading-7 text-foreground/90">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

