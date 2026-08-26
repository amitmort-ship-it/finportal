import { PROCESS_STAGES } from '@/lib/business-config';

// גרסה מצומצמת של VisualTimeline — שורת התקדמות קצרה בלי הפרטים המלאים
// (זמן משוער, "הצעד הבא"), מיועדת להטמעה בראש דפי תהליך (אישורים/בטחונות/תמהיל)
// כדי שהלקוח יראה תמיד היכן הוא נמצא בתהליך הכולל, לא רק בדף הבית.
export default function MiniProcessProgress({ currentStage }) {
  if (!currentStage) return null;

  const currentIndex = PROCESS_STAGES.indexOf(currentStage);
  if (currentIndex < 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-border bg-card px-4 py-3" dir="rtl">
      <div className="flex items-center gap-1.5 mb-2">
        {PROCESS_STAGES.map((stage, i) => (
          <div
            key={stage}
            className={`h-1.5 flex-1 rounded-full ${
              i < currentIndex ? 'bg-emerald-500' : i === currentIndex ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        שלב נוכחי: <span className="font-semibold text-foreground">{currentStage}</span>
      </p>
    </div>
  );
}
