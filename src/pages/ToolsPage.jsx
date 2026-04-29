import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Calculator, ChevronRight, Landmark, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ToolsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTool, setActiveTool] = useState(searchParams.get('tool') || null);

  useEffect(() => {
    setActiveTool(searchParams.get('tool') || null);
  }, [searchParams]);

  const toolCards = [
    {
      id: 'compound-interest',
      title: 'מחשבון ריבית דריבית',
      description: 'חישוב צמיחה של סכום התחלתי, הפקדה חודשית וריבית לאורך זמן.',
      icon: Calculator,
      tone: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    },
    {
      id: 'loan-comparison',
      title: 'מחשבון כדאיות הלוואה',
      description: 'השוואה בין עד 3 הלוואות לפי החזר חודשי, עלות כוללת, ריבית ועלויות חד פעמיות.',
      icon: Scale,
      tone: 'bg-blue-50 border-blue-200 text-blue-700',
    },
    {
      id: 'property-purchase-costs',
      title: 'מחשבון עלויות נלוות לרכישת דירה',
      description: 'הערכת כלל העלויות הנלוות לעסקת רכישת דירה מעבר למחיר הנכס עצמו.',
      icon: Landmark,
      tone: 'bg-amber-50 border-amber-200 text-amber-700',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">כלים שימושיים</h1>
          <p className="text-muted-foreground mt-1">
            מרכז כלים ומחשבונים שיעזרו לך לקבל החלטות פיננסיות בצורה חכמה יותר
          </p>
        </div>

        {activeTool ? (
          <Button
            type="button"
            className="gap-2 shrink-0 w-full sm:w-auto bg-red-600 hover:bg-red-700"
            onClick={() => {
              setActiveTool(null);
              setSearchParams({});
            }}
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לכל הכלים
          </Button>
        ) : null}
      </div>

      {!activeTool ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {toolCards.map(({ id, title, description, icon: Icon, tone }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveTool(id);
                setSearchParams({ tool: id });
              }}
              className={`rounded-2xl border p-6 text-right transition-all hover:shadow-md hover:-translate-y-0.5 ${tone}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/80 flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 opacity-70 shrink-0" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mt-6">{title}</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-6">{description}</p>
            </button>
          ))}
        </div>
      ) : null}

      {activeTool ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground">
          <p>מחשבון {activeTool} - בקרוב</p>
        </div>
      ) : null}
    </div>
  );
}