import { CheckCircle2, Circle, Clock } from 'lucide-react';

const STAGES = [
  'איסוף מסמכים',
  'בניית תמהיל',
  'מכרז ריביות',
  'בנק מנצח',
  'בטחונות וחתימות',
  'המתנה לביצוע',
];

export default function ProcessTracker({ currentStage, notes }) {
  const currentIndex = STAGES.indexOf(currentStage);

  return (
    <div className="bg-card rounded-xl border border-border p-5 h-full">
      <h2 className="text-base font-bold mb-5">שלבי התהליך</h2>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute right-[11px] top-2 bottom-2 w-0.5 bg-border z-0" />

        <div className="space-y-4">
          {STAGES.map((stage, i) => {
            const isDone = i < currentIndex;
            const isCurrent = i === currentIndex;
            const isPending = i > currentIndex;

            return (
              <div key={stage} className="flex items-center gap-3 relative z-10">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  isDone ? 'bg-emerald-500 text-white' :
                  isCurrent ? 'bg-primary text-white shadow-md shadow-primary/40' :
                  'bg-background border-2 border-border'
                }`}>
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Clock className="w-3.5 h-3.5" />
                  ) : (
                    <Circle className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <span className={`text-sm font-medium ${
                    isDone ? 'text-muted-foreground line-through' :
                    isCurrent ? 'text-primary font-bold' :
                    'text-muted-foreground'
                  }`}>
                    {stage}
                  </span>
                  {isCurrent && notes && (
                    <p className="text-xs text-muted-foreground mt-0.5">{notes}</p>
                  )}
                </div>
                {isCurrent && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    כעת
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}