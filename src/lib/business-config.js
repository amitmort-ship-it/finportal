// מקור אמת יחיד לשמות שלבי התהליך ולקבועים עסקיים אחרים.
// לפני קובץ זה, שמות השלבים היו מקודדים בנפרד ב-5 קבצים שונים
// (AdminBusiness, AdminTimelineEditor, AdminProcessStage, ClientsByStageTable, ProcessTracker),
// וזה גרם לבאג אמיתי: "ביטוחות וחתימות" מול "בטחונות וחתימות" — אי-התאמה
// ששיבשה בשקט את חישובי ה-pipeline והלקוחות הפעילים בדשבורד העסקי.
// כל קובץ שמשתמש בשמות השלבים צריך לייבא אותם מכאן ולא להגדיר אותם מחדש.

export const PROCESS_STAGES = [
  'איסוף מסמכים',
  'בניית תמהיל',
  'מכרז ריביות',
  'בנק מנצח',
  'בטחונות וחתימות',
  'המתנה לביצוע',
  'סיום טיפול',
];

// תת-קבוצות של PROCESS_STAGES, בשימוש בדשבורד העסקי
export const ACTIVE_STAGES = ['מכרז ריביות', 'בנק מנצח', 'בטחונות וחתימות', 'המתנה לביצוע'];
export const PIPELINE_STAGES = ['בנק מנצח', 'בטחונות וחתימות', 'המתנה לביצוע'];

export const STAGE_BADGE_COLORS = {
  'איסוף מסמכים': 'bg-slate-100 text-slate-700 border-slate-200',
  'בניית תמהיל': 'bg-blue-50 text-blue-700 border-blue-200',
  'מכרז ריביות': 'bg-violet-50 text-violet-700 border-violet-200',
  'בנק מנצח': 'bg-amber-50 text-amber-700 border-amber-200',
  'בטחונות וחתימות': 'bg-orange-50 text-orange-700 border-orange-200',
  'המתנה לביצוע': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'סיום טיפול': 'bg-gray-100 text-gray-500 border-gray-200',
};

export const INCOME_CATEGORIES = ['משכנתאות', 'כ.ד', 'הייטק', 'מילואים', 'אחר'];

// ממופה למשתני העיצוב (--chart-1 עד --chart-5 ב-index.css) במקום hex ישיר,
// כדי שהצבעים יתאימו אוטומטית גם ל-dark mode. "אחר" מקבל גוון ניטרלי בכוונה.
export const CATEGORY_COLORS = {
  'משכנתאות': 'hsl(var(--chart-1))',
  'כ.ד': 'hsl(var(--chart-4))',
  'הייטק': 'hsl(var(--chart-2))',
  'מילואים': 'hsl(var(--chart-3))',
  'אחר': 'hsl(var(--muted-foreground))',
};

export const DEAL_BUCKETS = ['חדש', 'בתהליך', 'ממתין לתשלום', 'שולם חלקית', 'שולם מלא'];

export const SALARY_TARGET = 25000;

// ברירות מחדל להגדרות עסקיות שניתנות לעריכה במסך (נשמרות ב-BusinessData);
// אלה רק הערכים הראשוניים, בשימוש גם ב-AdminBusiness.jsx וגם ב-SimulationPanel.jsx
// (קודם היו מוגדרים בנפרד בשני הקבצים עם אותם ערכים — כפילות שיכולה להיסחף).
export const DEFAULT_MONTHLY_GROSS_TARGET = 51500;
export const DEFAULT_TAX_BUFFER_RATE = 0.29;
export const DEFAULT_HITECH_TAX_RATE = 0.16;
