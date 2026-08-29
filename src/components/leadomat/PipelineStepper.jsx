import { Check } from 'lucide-react';

export const PIPELINE_STAGES = ['ליד', 'פגישה', 'הצעה', 'חתימה'];

const STAGE_COLORS = {
  'ליד': 'bg-blue-500 text-white',
  'פגישה': 'bg-amber-500 text-white',
  'הצעה': 'bg-violet-500 text-white',
  'חתימה': 'bg-emerald-500 text-white',
};

const STAGE_COLORS_MUTED = {
  'ליד': 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/25 dark:text-blue-300 dark:border-blue-900/50',
  'פגישה': 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/25 dark:text-amber-300 dark:border-amber-900/50',
  'הצעה': 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950/25 dark:text-violet-300 dark:border-violet-900/50',
  'חתימה': 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-300 dark:border-emerald-900/50',
};

// Compact badge for table rows
export function PipelineBadge({ stage }) {
  const s = stage || 'ליד';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STAGE_COLORS_MUTED[s] || STAGE_COLORS_MUTED['ליד']}`}>
      {s}
    </span>
  );
}

// Interactive stepper for detail view
export default function PipelineStepper({ lead, onStageChange, saving }) {
  const currentStage = lead.pipeline_stage || 'ליד';
  const currentIndex = PIPELINE_STAGES.indexOf(currentStage);

  const handleStageClick = (stage) => {
    if (saving) return;
    onStageChange?.(stage);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground">צינור מכירות</h3>
        <span className="text-xs text-muted-foreground">שלב נוכחי: <span className="font-semibold text-foreground">{currentStage}</span></span>
      </div>
      <div className="flex items-center gap-1" dir="rtl">
        {PIPELINE_STAGES.map((stage, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const colorClass = isCurrent ? STAGE_COLORS[stage] : isCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-muted text-muted-foreground';
          return (
            <div key={stage} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => handleStageClick(stage)}
                disabled={saving}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all border ${isCurrent ? `${STAGE_COLORS[stage]} border-transparent shadow-sm` : isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-300 dark:border-emerald-900/50' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/60'} ${saving ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                title={isCompleted ? 'הושלם' : isCurrent ? 'שלב נוכחי' : `עבור לשלב: ${stage}`}
              >
                <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${isCurrent ? 'bg-white/30' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-muted-foreground/20'}`}>
                  {isCompleted ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                {stage}
              </button>
              {i < PIPELINE_STAGES.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 rounded-full ${i < currentIndex ? 'bg-emerald-400' : 'bg-border'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}