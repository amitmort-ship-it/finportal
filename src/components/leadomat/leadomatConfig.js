export const EMPLOYMENT_STATUSES = ['שכיר', 'עצמאי', 'בעל שליטה', 'אחר'];
export const MARITAL_STATUSES = ['רווק/ה', 'נשוי/ה', 'גרוש/ה', 'אלמן/ה', 'ידוע/ה בציבור'];
export const GENDERS = ['זכר', 'נקבה', 'אחר'];
export const DEAL_TYPES = ['יד שנייה', 'רכישה מקבלן', 'מחיר למשתכן', 'בנייה עצמית', 'מיחזור', 'אחר'];
export const SOURCES = ['המלצות', 'לקוח חוזר', 'פרסום', 'היכרות אישית', 'אחר'];
export const STATUSES = ['חדש', 'בטיפול', 'מוכשר', 'לא מוכשר', 'נסגר'];
export const INCOME_TYPES = ['שכיר', 'עצמאי', 'פנסיה', 'השכרת נכס', 'הון', 'מילואים', 'אחר'];
export const COMMITMENT_TYPES = ['משכנתא', 'הלוואה', 'אשראי צרכני', 'כרטיסי אשראי', 'ליסינג', 'אחר'];

export const selectClass = 'mt-1 w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring';

export function calcAge(birthDate) {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export function calcLTV(deal) {
  if (!deal) return 0;
  const base = deal.appraisal_value || deal.purchase_cost || 0;
  if (!base || !deal.requested_mortgage) return 0;
  return Math.round((deal.requested_mortgage / base) * 100);
}

export function calcTotalIncome(borrower) {
  if (!borrower?.incomes) return 0;
  return borrower.incomes.reduce((sum, inc) => sum + (Number(inc.net_amount) || 0), 0);
}

export function calcTotalCommitments(commitments) {
  if (!commitments) return 0;
  return commitments.reduce((sum, c) => sum + (Number(c.monthly_payment) || 0), 0);
}

export function fmt(num) {
  if (num == null || num === '' || isNaN(num)) return '—';
  return '₪' + Number(num).toLocaleString('he-IL');
}

export function emptyBorrower() {
  return {
    first_name: '', last_name: '', id_number: '', birth_date: '',
    id_issue_date: '', id_expiry_date: '', foreign_citizenship: false,
    passport: '', gender: '', mobile_phone: '', email: '', employment_status: '',
    marital_status: '', children_under_18: 0, children_ages: '',
    maternity_leave: false, city: '', address: '', zip_code: '',
    education: '', public_figure: false, incomes: []
  };
}

export function emptyIncome() {
  return { income_type: '', employer: '', net_amount: '', gross_amount: '' };
}

export function emptyCommitment() {
  return { current_balance: '', monthly_payment: '', end_date: '', commitment_type: '', notes: '' };
}

export function emptyBankAccount() {
  return { bank_name: '', branch: '', account_number: '', notes: '' };
}

export function emptyDeal() {
  return {
    deal_type: '', purchase_cost: '', appraisal_value: '', representative_value: '',
    requested_mortgage: '', equity: '', additional_payments: '', equity_completion_loan: '',
    contract_date: '', delivery_date: '', deal_description: ''
  };
}

export function emptyLead() {
  return {
    lead_name: '', status: 'חדש', source: '', referrer_name: '', phone: '',
    borrower1: emptyBorrower(), borrower2: emptyBorrower(),
    relationship_between_borrowers: '',
    deal: emptyDeal(),
    commitments: [], financial_wealth: '',
    bank_accounts: [],
    equity_sources: '', current_rent: '', clean_credit_report: false,
    financial_issues: false, requested_monthly_payment: '', preferred_payment_day: '',
    grace: false, grace_duration: '', monthly_savings: false, monthly_savings_amount: '',
    bank_employee_benefits: false, expected_prepayments: '', health_issues: false,
    personal_notes: ''
  };
}