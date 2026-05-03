import { Building2, Download } from 'lucide-react';

const BANK_LOGOS = {
  'בנק הפועלים': 'https://media.base44.com/images/public/69c2ce93ab0a8ed34c65a4a8/f7803ff58_2.png',
  'בנק לאומי': 'https://media.base44.com/images/public/69c2ce93ab0a8ed34c65a4a8/b7343d309_.png',
  'בנק דיסקונט': 'https://media.base44.com/images/public/69c2ce93ab0a8ed34c65a4a8/9ee113e07_--PNG.png',
  'בנק מזרחי טפחות': 'https://media.base44.com/images/public/69c2ce93ab0a8ed34c65a4a8/39b2c22ec____-svg.png',
  'מזרחי טפחות': 'https://media.base44.com/images/public/69c2ce93ab0a8ed34c65a4a8/39b2c22ec____-svg.png',
  'בנק טפחות': 'https://media.base44.com/images/public/69c2ce93ab0a8ed34c65a4a8/39b2c22ec____-svg.png',
  'הבנק הבינלאומי': 'https://media.base44.com/images/public/69c2ce93ab0a8ed34c65a4a8/09271c1de_2.jpg',
  'בנק בינלאומי': 'https://media.base44.com/images/public/69c2ce93ab0a8ed34c65a4a8/09271c1de_2.jpg',
  'בנק ירושלים': 'https://media.base44.com/images/public/69c2ce93ab0a8ed34c65a4a8/7b97adc2f_.png',
  'בנק יהב': 'https://media.base44.com/images/public/69c2ce93ab0a8ed34c65a4a8/06d35288d__svg.png',
};

const EXPIRY_MARKER_REGEX = /\[\[expiry:[^\]]+\]\]/gi;
const TOTAL_REPAYMENT_MARKER_REGEX = /\[\[total_repayment:[^\]]+\]\]/gi;
const SHARED_INSIGHTS_MARKER_REGEX = /\[\[shared_insights:[^\]]+\]\]/gi;

function cleanApprovalNotes(notes) {
  if (!notes) {
    return '';
  }

  return String(notes)
    .replace(EXPIRY_MARKER_REGEX, '')
    .replace(TOTAL_REPAYMENT_MARKER_REGEX, '')
    .replace(SHARED_INSIGHTS_MARKER_REGEX, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const bankColors = {
  'בנק הפועלים': { bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-200 dark:border-red-900/40', icon: 'text-red-600 dark:text-red-300' },
  'בנק לאומי': { bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-900/40', icon: 'text-blue-600 dark:text-blue-300' },
  'בנק דיסקונט': { bg: 'bg-green-50 dark:bg-green-950/20', border: 'border-green-200 dark:border-green-900/40', icon: 'text-green-600 dark:text-green-300' },
  'בנק טפחות': { bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-900/40', icon: 'text-orange-600 dark:text-orange-300' },
  'הבנק הבינלאומי': { bg: 'bg-yellow-50 dark:bg-yellow-950/20', border: 'border-yellow-300 dark:border-yellow-900/40', icon: 'text-yellow-600 dark:text-yellow-300' },
  'חוץ בנקאי': { bg: 'bg-slate-50 dark:bg-slate-950/60', border: 'border-slate-200 dark:border-slate-800', icon: 'text-slate-500 dark:text-slate-300' },
};

export default function BankApprovalCard({ approval }) {
  const colors = bankColors[approval.bank_name] || {
    bg: 'bg-slate-50 dark:bg-slate-950/60',
    border: 'border-slate-200 dark:border-slate-800',
    icon: 'text-slate-600 dark:text-slate-300',
  };
  const logoUrl = BANK_LOGOS[approval.bank_name];
  const displayNotes = cleanApprovalNotes(approval.notes);
  return (
    <div className={`rounded-xl border p-5 hover:shadow-md transition-all duration-300 ${colors.bg} ${colors.border}`}>
      <div className="flex items-start gap-4">
        <div className="w-16 h-10 rounded-lg flex items-center justify-center shrink-0 bg-white border border-border overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt={approval.bank_name} className="w-full h-full object-contain p-1" />
          ) : (
            <Building2 className={`w-5 h-5 ${colors.icon}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{approval.bank_name}</h3>
          {approval.approval_title && (
            <p className="text-sm text-muted-foreground mt-0.5">{approval.approval_title}</p>
          )}
          
          <div className="flex flex-wrap gap-3 mt-3">
            {approval.amount && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                ₪{approval.amount.toLocaleString()}
              </span>
            )}
            {approval.monthly_payment && (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                החזר חודשי: ₪{approval.monthly_payment.toLocaleString()}
              </span>
            )}
            {approval.mortgage_years && (
              <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-950/30 dark:text-purple-300">
                {approval.mortgage_years} שנות משכנתא
              </span>
            )}
          </div>

          {displayNotes && (
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{displayNotes}</p>
          )}

          {approval.file_url && (
            <a
              href={approval.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 text-sm text-primary hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              {approval.file_name || 'הורד מסמך'}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}