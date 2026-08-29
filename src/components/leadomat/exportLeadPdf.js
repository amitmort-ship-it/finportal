import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { calcAge, calcLTV, calcTotalIncome, calcTotalCommitments, fmt } from './leadomatConfig';

function row(label, value) {
  const v = value === undefined || value === null || value === '' ? '—' : String(value);
  return `<tr><td class="lbl">${label}</td><td>${v}</td></tr>`;
}

function borrowerHtml(b, title) {
  if (!b) return '';
  const age = calcAge(b.birth_date);
  const totalIncome = calcTotalIncome(b);
  const incomeRows = (b.incomes || []).map(inc => `
    <tr>
      <td>${inc.income_type || '—'}</td>
      <td>${inc.employer || '—'}</td>
      <td>${fmt(inc.net_amount)}</td>
      <td>${fmt(inc.gross_amount)}</td>
    </tr>`).join('') || '<tr><td colspan="4" class="empty">אין הכנסות רשומות</td></tr>';

  return `
    <div class="section">
      <h2>${title}</h2>
      <table class="grid">
        ${row('שם פרטי', b.first_name)}
        ${row('שם משפחה', b.last_name)}
        ${row('תעודת זהות', b.id_number)}
        ${row('תאריך לידה', b.birth_date ? `${b.birth_date}${age != null ? ` (${age})` : ''}` : null)}
        ${row('תאריך הנפקת תעודה', b.id_issue_date)}
        ${row('תוקף תעודת זהות', b.id_expiry_date)}
        ${row('אזרחות זרה', b.foreign_citizenship ? 'כן' : 'לא')}
        ${row('דרכון', b.passport)}
        ${row('מגדר', b.gender)}
        ${row('טלפון נייד', b.mobile_phone)}
        ${row('אימייל', b.email)}
        ${row('מעמד תעסוקתי', b.employment_status)}
        ${row('מצב משפחתי', b.marital_status)}
        ${row('ילדים מתחת ל-18', b.children_under_18)}
        ${row('גילאי הילדים', b.children_ages)}
        ${row('בחופשת לידה', b.maternity_leave ? 'כן' : 'לא')}
        ${row('עיר מגורים', b.city)}
        ${row('כתובת', b.address)}
        ${row('מיקוד', b.zip_code)}
        ${row('השכלה', b.education)}
        ${row('קירבה לאיש ציבור', b.public_figure ? 'כן' : 'לא')}
      </table>
      <h3>הכנסות</h3>
      <table class="data">
        <thead><tr><th>סוג הכנסה</th><th>מעסיק / עסק</th><th>נטו</th><th>ברוטו</th></tr></thead>
        <tbody>${incomeRows}</tbody>
      </table>
      ${totalIncome > 0 ? `<div class="total">סך הכנסה נטו: <strong>${fmt(totalIncome)}</strong></div>` : ''}
    </div>`;
}

function buildHtml(lead) {
  const ltv = calcLTV(lead.deal);
  const totalIncome = calcTotalIncome(lead.borrower1) + calcTotalIncome(lead.borrower2);
  const totalCommitments = calcTotalCommitments(lead.commitments);
  const d = lead.deal || {};

  const commitmentsRows = (lead.commitments || []).map(c => `
    <tr>
      <td>${c.commitment_type || '—'}</td>
      <td>${fmt(c.current_balance)}</td>
      <td>${fmt(c.monthly_payment)}</td>
      <td>${c.end_date || '—'}</td>
      <td>${c.notes || '—'}</td>
    </tr>`).join('') || '<tr><td colspan="5" class="empty">אין התחייבויות רשומות</td></tr>';

  const bankRows = (lead.bank_accounts || []).map(a => `
    <tr>
      <td>${a.bank_name || '—'}</td>
      <td>${a.branch || '—'}</td>
      <td>${a.account_number || '—'}</td>
      <td>${a.notes || '—'}</td>
    </tr>`).join('') || '<tr><td colspan="4" class="empty">אין חשבונות רשומים</td></tr>';

  return `
  <div dir="rtl" class="root">
    <div class="header">
      <h1>${lead.lead_name || 'ליד'}</h1>
      <div class="meta">
        ${lead.source ? `<span>מקור: ${lead.source}</span>` : ''}
        ${lead.phone ? `<span>טלפון: ${lead.phone}</span>` : ''}
        ${lead.referrer_name ? `<span>ממליץ: ${lead.referrer_name}</span>` : ''}
        <span>סטטוס: ${lead.status || '—'}</span>
        <span>שלב: ${lead.pipeline_stage || '—'}</span>
      </div>
    </div>

    <div class="summary">
      <div class="card primary"><span>LTV</span><strong>${ltv > 0 ? `${ltv}%` : '—'}</strong></div>
      <div class="card green"><span>סך הכנסות נטו</span><strong>${fmt(totalIncome)}</strong></div>
      <div class="card amber"><span>החזר התחייבויות חודשי</span><strong>${fmt(totalCommitments)}</strong></div>
      <div class="card red"><span>גובה עסקה — שווי תיק</span><strong>${fmt(lead.deal_value)}</strong></div>
    </div>

    ${borrowerHtml(lead.borrower1, 'לווה 1')}
    ${borrowerHtml(lead.borrower2, 'לווה 2')}
    ${lead.relationship_between_borrowers ? `<div class="section"><table class="grid">${row('קשר בין הלווים', lead.relationship_between_borrowers)}</table></div>` : ''}

    <div class="section">
      <h2>פרטי העסקה</h2>
      <table class="grid">
        ${row('סוג העסקה', d.deal_type)}
        ${row('עלות הרכישה', fmt(d.purchase_cost))}
        ${row('שווי ע"פ שמאות', fmt(d.appraisal_value))}
        ${row('שווי נכס מייצג', fmt(d.representative_value))}
        ${row('משכנתה מבוקשת', fmt(d.requested_mortgage))}
        ${row('הון עצמי', fmt(d.equity))}
        ${row('תשלומים נלווים', fmt(d.additional_payments))}
        ${row('הלוואה להשלמת הון עצמי', fmt(d.equity_completion_loan))}
        ${row('תאריך חתימת חוזה', d.contract_date)}
        ${row('תאריך מסירה', d.delivery_date)}
      </table>
      ${d.deal_description ? `<h3>תיאור העסקה</h3><div class="box">${d.deal_description}</div>` : ''}
    </div>

    <div class="section">
      <h2>התחייבויות ועושר פיננסי</h2>
      <table class="data">
        <thead><tr><th>סוג</th><th>יתרה נוכחית</th><th>החזר חודשי</th><th>תאריך סיום</th><th>הערות</th></tr></thead>
        <tbody>${commitmentsRows}</tbody>
      </table>
      ${lead.financial_wealth ? `<h3>עושר פיננסי ונכסים נוספים</h3><div class="box">${lead.financial_wealth}</div>` : ''}
    </div>

    <div class="section">
      <h2>חשבונות בנק</h2>
      <table class="data">
        <thead><tr><th>שם הבנק</th><th>סניף</th><th>מספר חשבון</th><th>הערות</th></tr></thead>
        <tbody>${bankRows}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>נתונים נוספים והערות אישיות</h2>
      <table class="grid">
        ${row('מקורות הון עצמי', lead.equity_sources)}
        ${row('שכר דירה חודשי', fmt(lead.current_rent))}
        ${row('דוח אשראי נקי', lead.clean_credit_report ? 'כן' : 'לא')}
        ${row('בעיה בהתנהלות פיננסית', lead.financial_issues ? 'כן' : 'לא')}
        ${row('החזר חודשי מבוקש', fmt(lead.requested_monthly_payment))}
        ${row('יום החזר מועדף', lead.preferred_payment_day)}
        ${row('גרייס', lead.grace ? 'כן' : 'לא')}
        ${lead.grace ? row('משך גרייס', lead.grace_duration) : ''}
        ${row('חוסכים כל חודש', lead.monthly_savings ? 'כן' : 'לא')}
        ${lead.monthly_savings ? row('סכום חיסכון', fmt(lead.monthly_savings_amount)) : ''}
        ${row('הטבת ריביות עובדי בנק', lead.bank_employee_benefits ? 'כן' : 'לא')}
        ${row('בעיה בריאותית', lead.health_issues ? 'כן' : 'לא')}
        ${row('פרעונות עתידיים צפויים', lead.expected_prepayments)}
      </table>
      ${lead.personal_notes ? `<h3>הערות אישיות</h3><div class="box">${lead.personal_notes}</div>` : ''}
    </div>

    <div class="footer">הופק בתאריך ${new Date().toLocaleDateString('he-IL')}</div>
  </div>`;
}

const STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Heebo', Arial, sans-serif; color: #1a2b3c; background: #fff; }
  .root { width: 760px; padding: 32px 36px; }
  .header { border-bottom: 3px solid #2ECC71; padding-bottom: 12px; margin-bottom: 18px; }
  .header h1 { margin: 0 0 6px 0; font-size: 26px; color: #0D2137; }
  .meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: #64748b; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 22px; }
  .card { border-radius: 10px; padding: 10px 12px; border: 1px solid #e2e8f0; }
  .card span { display: block; font-size: 11px; color: #64748b; margin-bottom: 4px; }
  .card strong { font-size: 18px; }
  .card.primary { background: #e6f9f0; border-color: #2ECC71; }
  .card.primary strong { color: #1fa974; }
  .card.green { background: #ecfdf5; }
  .card.green strong { color: #047857; }
  .card.amber { background: #fffbeb; }
  .card.amber strong { color: #b45309; }
  .card.red { background: #fef2f2; border-color: #fca5a5; }
  .card.red strong { color: #dc2626; }
  .section { margin-bottom: 20px; page-break-inside: avoid; }
  h2 { font-size: 15px; color: #0D2137; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin: 0 0 10px 0; }
  h3 { font-size: 12px; color: #64748b; margin: 14px 0 6px 0; }
  table { border-collapse: collapse; width: 100%; }
  table.grid td { padding: 4px 8px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
  table.grid td.lbl { color: #94a3b8; width: 38%; }
  table.data th { background: #f8fafc; color: #64748b; font-size: 11px; font-weight: 600; text-align: right; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
  table.data td { font-size: 12px; padding: 6px 8px; border-bottom: 1px solid #f1f5f9; text-align: right; }
  td.empty { text-align: center; color: #94a3b8; padding: 12px; }
  .total { margin-top: 8px; background: #ecfdf5; border-radius: 8px; padding: 6px 10px; font-size: 12px; color: #047857; text-align: left; }
  .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; font-size: 12px; white-space: pre-wrap; }
  .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
`;

export async function exportLeadToPdf(lead) {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.innerHTML = `<style>${STYLES}</style>${buildHtml(lead)}`;
  document.body.appendChild(container);

  try {
    const root = container.querySelector('.root');
    const canvas = await html2canvas(root, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - margin * 2);

    while (heightLeft > 0) {
      position = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);
    }

    const safeName = (lead.lead_name || 'lead').replace(/[^\w\u0590-\u05FF\s-]/g, '').trim() || 'lead';
    pdf.save(`${safeName}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}