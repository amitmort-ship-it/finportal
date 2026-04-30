import { Sparkles } from 'lucide-react';

const OPENINGS = [
  'Every new day is a chance',
  'One small step taken consistently',
  'Quiet discipline',
  'Real progress',
  'Clarity',
  'Professional courage',
  'Patient focus',
  'Daily discipline',
  'One good choice in the morning',
  'Focus on what matters',
  'Managing your energy well',
  'A steady routine',
  'Listening to yourself',
  'Calm responsibility',
  'Attention to detail',
  'An open heart and a clear schedule',
];

const MIDDLES = [
  'builds long-term confidence',
  'creates momentum even on busy days',
  'strengthens results before they are visible',
  'connects effort to meaning',
  'opens doors that were invisible yesterday',
  'teaches people they can rely on you',
  'compounds into major achievements',
  'leaves less room for distraction',
  'quiets the noise and sharpens direction',
  'gives work more depth and stability',
  'creates a pace you can sustain',
  'protects clarity under pressure',
  'organizes your thinking before your results',
  'restores energy for consistency',
  'turns intention into habit',
  'brings order to what once felt messy',
];

const ENDINGS = [
  'and you can choose it again today.',
  'and that choice matters more than it first appears.',
];

const DAILY_QUOTES = OPENINGS.flatMap((opening) =>
  MIDDLES.flatMap((middle) =>
    ENDINGS.map((ending) => `${opening} ${middle} ${ending}`)
  )
);

function getDailyQuote(date = new Date()) {
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const seed = Math.floor(localDate.getTime() / 86400000);
  const index = Math.abs(seed) % DAILY_QUOTES.length;

  return DAILY_QUOTES[index];
}

export default function DailyQuoteCard() {
  const text = getDailyQuote();

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
