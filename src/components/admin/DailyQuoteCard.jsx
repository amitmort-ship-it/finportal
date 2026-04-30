import { Sparkles } from 'lucide-react';

const OPENINGS = [
  'כל יום חדש הוא הזדמנות',
  'גם צעד קטן שנעשה בעקביות',
  'התמדה שקטה',
  'התקדמות אמיתית',
  'בהירות מגיעה',
  'אומץ מקצועי',
  'סבלנות חכמה',
  'משמעת יומית',
  'בחירה אחת טובה בבוקר',
  'מיקוד במה שחשוב',
  'ניהול נכון של האנרגיה',
  'שגרה יציבה',
  'הקשבה לעצמך',
  'אחריות רגועה',
  'דיוק בפרטים',
  'לב פתוח ולוח זמנים מסודר',
];

const MIDDLES = [
  'שבונה ביטחון לטווח ארוך',
  'שיוצר תנופה גם בימים עמוסים',
  'שמחזק תוצאות לפני שמרגישים אותן',
  'שמחבר בין מאמץ למשמעות',
  'שפותח דלתות שלא נראו אתמול',
  'שמלמדת את הדרך לסמוך עליך',
  'שמצטבר להישגים גדולים',
  'שמשאיר פחות מקום להסחות דעת',
  'שמרגיע רעש ומחדד כיוון',
  'שמעניק לעבודה עומק ויציבות',
  'שבונה קצב שאפשר להחזיק לאורך זמן',
  'שמחזק בהירות גם תחת לחץ',
  'שמסדר מחשבות לפני שמסדר תוצאות',
  'שמחזיר כוח להתמדה',
  'שהופך כוונה להרגל',
  'שמביא סדר למקומות שנראו מבולגנים',
];

const ENDINGS = [
  'וגם היום אתה יכול לבחור בו.',
  'והבחירה הזו שווה יותר ממה שנראה ברגע הראשון.',
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
