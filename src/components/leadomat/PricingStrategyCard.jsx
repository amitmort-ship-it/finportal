const PRICING_ROWS = [
  { value: 'חיסכון ריאלי של כ-80,000 ש"ח בריביות ומניעת טעויות קריטיות בתמהיל.', price: '8,000 – 10,000', service: 'ליווי תיק סטנדרטי (יד 2/קבלן)' },
  { value: 'יצירת שקט תזרמי וטיפול מורכב בשני תיקים במקביל.', price: '10,000 – 14,000', service: 'מיחזור ואיחוד הלוואות' },
  { value: 'בניית אסטרטגיית צמיחה, איתור הזדמנויות ומינוף מקסימלי לאוכלוסיית פרימיום.', price: '19,900 – 39,900', service: 'ליווי משקיעים מקיף' },
  { value: 'סידור כלל ההתחייבויות מעבר למשכנתא הספציפית.', price: '6,900+', service: 'תכנון פיננסי הוליסטי' },
];

export default function PricingStrategyCard() {
  return (
    <div dir="rtl" className="bg-card rounded-xl border border-border overflow-hidden mb-4">
      <div className="bg-primary/5 px-5 py-3 border-b border-border">
        <h3 className="text-sm font-bold text-foreground">2. משימה 1: ארגון מחדש של אסטרטגיית התמחור וחבילות השירות</h3>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          התמחור הוא הכלי האגרסיבי ביותר לסינון לקוחות "רעילים" ומניעת שחיקה. אם אתה לא גובה מספיק, אתה פוגע בלקוח שלך - כי אין לך הזמן להילחם עבורו מול הבנק.
        </p>

        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">טבלת מחירון אסטרטגית — 2026</h4>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-right font-medium">הערך האסטרטגי ללקוח</th>
                  <th className="px-4 py-2.5 text-right font-medium whitespace-nowrap">טווח מחיר (ש"ח)</th>
                  <th className="px-4 py-2.5 text-right font-medium">סוג השירות</th>
                </tr>
              </thead>
              <tbody>
                {PRICING_ROWS.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-foreground">{row.value}</td>
                    <td className="px-4 py-2.5 font-bold text-primary whitespace-nowrap" dir="ltr">{row.price}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.service}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3.5">
          <p className="text-sm text-foreground leading-relaxed">
            <span className="font-bold text-primary">בניית מודל ROI ללקוח:</span> אל תמכור שירות, תמכור רווח. בשיחה עם הלקוח, הצג את שכר הטרחה כהשקעה:
            <span className="block mt-1.5 text-muted-foreground italic">
              "שכר הטרחה שלי הוא 10,000 ש"ח, אבל הוא קונה לך חיסכון מוכח של 110,000 ש"ח בבנק. האם אתה מעדיף לשמור 10,000 ש"ח היום, או להפסיד 100,000 ש"ח לאורך חיי המשכנתא?"
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}