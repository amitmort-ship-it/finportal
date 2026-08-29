import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { calcAge, calcLTV, calcTotalIncome, calcTotalCommitments, fmt } from './leadomatConfig';

function Field({ label, value }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground block">{label}</span>
      <p className="text-sm font-medium mt-0.5">{value || '—'}</p>
    </div>
  );
}

function BoolField({ label, value }) {
  return <Field label={label} value={value ? 'כן' : 'לא'} />;
}

function BorrowerDetail({ borrower, title }) {
  const age = calcAge(borrower?.birth_date);
  const totalIncome = calcTotalIncome(borrower);
  return (
    <div className="space-y-4" dir="rtl">
      <h3 className="text-sm font-bold text-primary border-b border-border pb-2">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="שם פרטי" value={borrower?.first_name} />
        <Field label="שם משפחה" value={borrower?.last_name} />
        <Field label="תעודת זהות" value={borrower?.id_number} />
        <Field label="תאריך לידה" value={borrower?.birth_date ? `${borrower.birth_date}${age != null ? ` (${age})` : ''}` : null} />
        <Field label="תאריך הנפקת תעודה" value={borrower?.id_issue_date} />
        <Field label="תוקף תעודת זהות" value={borrower?.id_expiry_date} />
        <BoolField label="אזרחות זרה" value={borrower?.foreign_citizenship} />
        <Field label="דרכון" value={borrower?.passport} />
        <Field label="מגדר" value={borrower?.gender} />
        <Field label="טלפון נייד" value={borrower?.mobile_phone} />
        <Field label="אימייל" value={borrower?.email} />
        <Field label="מעמד תעסוקתי" value={borrower?.employment_status} />
        <Field label="מצב משפחתי" value={borrower?.marital_status} />
        <Field label="ילדים מתחת ל-18" value={borrower?.children_under_18} />
        <Field label="גילאי הילדים" value={borrower?.children_ages} />
        <BoolField label="בחופשת לידה" value={borrower?.maternity_leave} />
        <Field label="עיר מגורים" value={borrower?.city} />
        <Field label="כתובת" value={borrower?.address} />
        <Field label="מיקוד" value={borrower?.zip_code} />
        <Field label="השכלה" value={borrower?.education} />
        <BoolField label="קירבה לאיש ציבור" value={borrower?.public_figure} />
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">הכנסות</p>
        {(borrower?.incomes || []).length === 0 ? (
          <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 text-center">אין הכנסות רשומות</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-3 py-1.5 text-right font-medium">סוג הכנסה</th>
                  <th className="px-3 py-1.5 text-right font-medium">מעסיק / עסק</th>
                  <th className="px-3 py-1.5 text-right font-medium">נטו</th>
                  <th className="px-3 py-1.5 text-right font-medium">ברוטו</th>
                </tr>
              </thead>
              <tbody>
                {borrower.incomes.map((inc, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-1.5">{inc.income_type || '—'}</td>
                    <td className="px-3 py-1.5">{inc.employer || '—'}</td>
                    <td className="px-3 py-1.5 font-medium text-emerald-700">{fmt(inc.net_amount)}</td>
                    <td className="px-3 py-1.5">{fmt(inc.gross_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalIncome > 0 && (
          <div className="mt-2 flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/25 rounded-lg px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">סך הכנסה נטו</span>
            <span className="text-sm font-bold text-emerald-700">{fmt(totalIncome)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeadomatDetail({ lead }) {
  const ltv = calcLTV(lead.deal);
  const totalIncome1 = calcTotalIncome(lead.borrower1);
  const totalIncome2 = calcTotalIncome(lead.borrower2);
  const totalIncome = totalIncome1 + totalIncome2;
  const totalCommitments = calcTotalCommitments(lead.commitments);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-primary/10 rounded-xl border border-primary/20 p-3">
          <p className="text-xs text-muted-foreground">LTV</p>
          <p className="text-lg font-bold text-primary">{ltv > 0 ? `${ltv}%` : '—'}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/25 rounded-xl border border-emerald-200 dark:border-emerald-900/50 p-3">
          <p className="text-xs text-muted-foreground">סך הכנסות נטו</p>
          <p className="text-lg font-bold text-emerald-700">{fmt(totalIncome)}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/25 rounded-xl border border-amber-200 dark:border-amber-900/50 p-3">
          <p className="text-xs text-muted-foreground">החזר התחייבויות חודשי</p>
          <p className="text-lg font-bold text-amber-700">{fmt(totalCommitments)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">סטטוס</p>
          <p className="text-lg font-bold text-foreground">{lead.status || '—'}</p>
        </div>
      </div>

      <Tabs defaultValue="borrower1" className="w-full">
        <TabsList className="w-full flex-wrap h-auto">
          <TabsTrigger value="borrower1" className="text-xs">לווה 1</TabsTrigger>
          <TabsTrigger value="borrower2" className="text-xs">לווה 2</TabsTrigger>
          <TabsTrigger value="deal" className="text-xs">פרטי עסקה</TabsTrigger>
          <TabsTrigger value="commitments" className="text-xs">התחייבויות</TabsTrigger>
          <TabsTrigger value="banks" className="text-xs">חשבונות בנק</TabsTrigger>
          <TabsTrigger value="additional" className="text-xs">נתונים נוספים</TabsTrigger>
        </TabsList>

        <TabsContent value="borrower1" className="mt-4">
          <BorrowerDetail borrower={lead.borrower1} title="לווה 1" />
        </TabsContent>
        <TabsContent value="borrower2" className="mt-4">
          <BorrowerDetail borrower={lead.borrower2} title="לווה 2" />
          <div className="mt-3">
            <Field label="קשר בין הלווים" value={lead.relationship_between_borrowers} />
          </div>
        </TabsContent>

        <TabsContent value="deal" className="mt-4">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-primary border-b border-border pb-2">פרטי העסקה</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="סוג העסקה" value={lead.deal?.deal_type} />
              <Field label="עלות הרכישה" value={fmt(lead.deal?.purchase_cost)} />
              <Field label={'שווי ע"פ שמאות'} value={fmt(lead.deal?.appraisal_value)} />
              <Field label="שווי נכס מייצג" value={fmt(lead.deal?.representative_value)} />
              <Field label="משכנתה מבוקשת" value={fmt(lead.deal?.requested_mortgage)} />
              <Field label="הון עצמי" value={fmt(lead.deal?.equity)} />
              <Field label="תשלומים נלווים" value={fmt(lead.deal?.additional_payments)} />
              <Field label="הלוואה להשלמת הון עצמי" value={fmt(lead.deal?.equity_completion_loan)} />
              <Field label="תאריך חתימת חוזה" value={lead.deal?.contract_date} />
              <Field label="תאריך מסירה" value={lead.deal?.delivery_date} />
            </div>
            {lead.deal?.deal_description && (
              <div>
                <span className="text-xs text-muted-foreground block mb-1">תיאור העסקה</span>
                <div className="rounded-lg border border-border bg-muted/30 p-3 whitespace-pre-wrap text-sm">{lead.deal.deal_description}</div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="commitments" className="mt-4">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-primary border-b border-border pb-2">התחייבויות ועושר פיננסי</h3>
            {(lead.commitments || []).length === 0 ? (
              <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 text-center">אין התחייבויות רשומות</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="px-3 py-1.5 text-right font-medium">סוג</th>
                      <th className="px-3 py-1.5 text-right font-medium">יתרה נוכחית</th>
                      <th className="px-3 py-1.5 text-right font-medium">החזר חודשי</th>
                      <th className="px-3 py-1.5 text-right font-medium">תאריך סיום</th>
                      <th className="px-3 py-1.5 text-right font-medium">הערות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lead.commitments.map((c, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-3 py-1.5">{c.commitment_type || '—'}</td>
                        <td className="px-3 py-1.5 font-medium">{fmt(c.current_balance)}</td>
                        <td className="px-3 py-1.5 font-medium text-amber-700">{fmt(c.monthly_payment)}</td>
                        <td className="px-3 py-1.5">{c.end_date || '—'}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{c.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {totalCommitments > 0 && (
              <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/25 rounded-lg px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">סך החזר חודשי כולל</span>
                <span className="text-sm font-bold text-amber-700">{fmt(totalCommitments)}</span>
              </div>
            )}
            {lead.financial_wealth && (
              <div>
                <span className="text-xs text-muted-foreground block mb-1">עושר פיננסי ונכסים נוספים</span>
                <div className="rounded-lg border border-border bg-muted/30 p-3 whitespace-pre-wrap text-sm">{lead.financial_wealth}</div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="banks" className="mt-4">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-primary border-b border-border pb-2">חשבונות בנק</h3>
            {(lead.bank_accounts || []).length === 0 ? (
              <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 text-center">אין חשבונות רשומים</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="px-3 py-1.5 text-right font-medium">שם הבנק</th>
                      <th className="px-3 py-1.5 text-right font-medium">סניף</th>
                      <th className="px-3 py-1.5 text-right font-medium">מספר חשבון</th>
                      <th className="px-3 py-1.5 text-right font-medium">הערות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lead.bank_accounts.map((a, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-3 py-1.5 font-medium">{a.bank_name || '—'}</td>
                        <td className="px-3 py-1.5" dir="ltr">{a.branch || '—'}</td>
                        <td className="px-3 py-1.5" dir="ltr">{a.account_number || '—'}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{a.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="additional" className="mt-4">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-primary border-b border-border pb-2">נתונים נוספים והערות אישיות</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="מקורות הון עצמי" value={lead.equity_sources} />
              <Field label="שכר דירה חודשי" value={fmt(lead.current_rent)} />
              <BoolField label="דוח אשראי נקי" value={lead.clean_credit_report} />
              <BoolField label="בעיה בהתנהלות פיננסית" value={lead.financial_issues} />
              <Field label="החזר חודשי מבוקש" value={fmt(lead.requested_monthly_payment)} />
              <Field label="יום החזר מועדף" value={lead.preferred_payment_day} />
              <BoolField label="גרייס" value={lead.grace} />
              {lead.grace && <Field label="משך גרייס" value={lead.grace_duration} />}
              <BoolField label="חוסכים כל חודש" value={lead.monthly_savings} />
              {lead.monthly_savings && <Field label="סכום חיסכון" value={fmt(lead.monthly_savings_amount)} />}
              <BoolField label="הטבת ריביות עובדי בנק" value={lead.bank_employee_benefits} />
              <BoolField label="בעיה בריאותית" value={lead.health_issues} />
            </div>
            {lead.expected_prepayments && (
              <Field label="פרעונות עתידיים צפויים" value={lead.expected_prepayments} />
            )}
            {lead.personal_notes && (
              <div>
                <span className="text-xs text-muted-foreground block mb-1">הערות אישיות</span>
                <div className="rounded-lg border border-border bg-muted/30 p-3 whitespace-pre-wrap text-sm">{lead.personal_notes}</div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}