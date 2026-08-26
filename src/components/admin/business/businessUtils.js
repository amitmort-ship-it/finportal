// פונקציות עזר טהורות שחולצו מ-AdminBusiness.jsx כדי לצמצם את גודל הקובץ
// ולאפשר בדיקה/שימוש חוזר נפרד מלוגיקת ה-state של הרכיב.

export function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthLabelFromDate(date) {
  return date.toLocaleString('he-IL', { month: 'long', year: 'numeric' });
}

export function getEntryMonthKey(entry) {
  if (entry?.monthKey) return entry.monthKey;
  if (entry?.createdAt) {
    const p = new Date(entry.createdAt);
    if (!Number.isNaN(p.getTime())) return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}`;
  }
  return null;
}

export function getEntryMonthLabel(entry) {
  if (entry?.month) return entry.month;
  if (entry?.createdAt) {
    const p = new Date(entry.createdAt);
    if (!Number.isNaN(p.getTime())) return getMonthLabelFromDate(p);
  }
  return 'חודש לא ידוע';
}

export function fmt(n) {
  return `₪${Math.round(n || 0).toLocaleString('he-IL')}`;
}

export function getTaxRateForCategory(cat, tbr, htr) {
  return cat === 'הייטק' ? htr : cat === 'מילואים' ? 0 : tbr;
}

export function getDealStatus(deal) {
  if (deal?.isFrozen) return 'מוקפאת';
  const r = Math.max(0, Number(deal?.totalAmount || 0) - Number(deal?.paidAmount || 0));
  return r === 0 ? 'שולם מלא' : Number(deal?.paidAmount || 0) > 0 ? 'שולם חלקית' : 'ממתין לתשלום';
}

export function escapeCsvValue(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function parseCsvLine(line) {
  const vals = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i], n = line[i + 1];
    if (c === '"' && inQ && n === '"') { cur += '"'; i++; continue; }
    if (c === '"') { inQ = !inQ; continue; }
    if (c === ',' && !inQ) { vals.push(cur); cur = ''; continue; }
    cur += c;
  }
  vals.push(cur);
  return vals.map(v => v.trim());
}
