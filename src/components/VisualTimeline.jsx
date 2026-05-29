import { CheckCircle2, Clock, Circle, ChevronLeft } from 'lucide-react';

export default function VisualTimeline({ stages = [], currentStageName }) {
  const currentIndex = stages.findIndex(s => s.name === currentStageName);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;

  return (
    <div className="w-full" dir="rtl">
      {/* Horizontal stepper for desktop, vertical for mobile */}
      <div className="hidden md:flex items-start gap-0 w-full overflow-x-auto pb-2">
        {stages.map((stage, i) => {
          const isDone = i < activeIndex;
          const isCurrent = i === activeIndex;
          const isPending = i > activeIndex;

          return (
            <div key={i} className="flex items-start flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1 min-w-0">
                {/* Circle + connector */}
                <div className="flex items-center w-full">
                  {i > 0 && (
                    <div className={`h-0.5 flex-1 ${isDone || isCurrent ? 'bg-primary' : 'bg-border'}`} />
                  )}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                    isDone ? 'bg-emerald-500 border-emerald-500 text-white' :
                    isCurrent ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30' :
                    'bg-background border-border text-muted-foreground'
                  }`}>
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isCurrent ? (
                      <Clock className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-bold">{i + 1}</span>
                    )}
                  </div>
                  {i < stages.length - 1 && (
                    <div className={`h-0.5 flex-1 ${isDone ? 'bg-primary' : 'bg-border'}`} />
                  )}
                </div>

                {/* Label */}
                <div className="mt-2 text-center px-1 w-full">
                  <p className={`text-xs font-semibold leading-tight ${
                    isCurrent ? 'text-primary' : isDone ? 'text-emerald-600' : 'text-muted-foreground'
                  }`}>
                    {stage.name}
                  </p>
                  {stage.estimated_days > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">~{stage.estimated_days} ימים</p>
                  )}
                  {isCurrent && stage.next_step && (
                    <div className="mt-1 bg-primary/10 border border-primary/20 rounded-md px-1.5 py-1 text-[10px] text-primary leading-snug">
                      <span className="font-semibold">הצעד הבא: </span>{stage.next_step}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical */}
      <div className="flex flex-col gap-0 md:hidden">
        <div className="relative">
          <div className="absolute right-[17px] top-5 bottom-5 w-0.5 bg-border z-0" />
          <div className="space-y-4">
            {stages.map((stage, i) => {
              const isDone = i < activeIndex;
              const isCurrent = i === activeIndex;

              return (
                <div key={i} className="flex items-start gap-3 relative z-10">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 ${
                    isDone ? 'bg-emerald-500 border-emerald-500 text-white' :
                    isCurrent ? 'bg-primary border-primary text-white shadow-md shadow-primary/30' :
                    'bg-background border-border text-muted-foreground'
                  }`}>
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> :
                     isCurrent ? <Clock className="w-4 h-4" /> :
                     <span className="text-xs font-bold">{i + 1}</span>}
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${
                        isCurrent ? 'text-primary' : isDone ? 'text-emerald-600' : 'text-muted-foreground'
                      }`}>{stage.name}</p>
                      {isCurrent && (
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">כעת</span>
                      )}
                    </div>
                    {stage.estimated_days > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">~{stage.estimated_days} ימים</p>
                    )}
                    {isCurrent && stage.next_step && (
                      <div className="mt-1.5 bg-primary/10 border border-primary/20 rounded-md px-2 py-1.5 text-xs text-primary">
                        <span className="font-semibold">הצעד הבא: </span>{stage.next_step}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}