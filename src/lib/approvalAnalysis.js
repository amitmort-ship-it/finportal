const TRACK_LABELS = [
  'קל"צ',
  'קבועה לא צמודה',
  'קבועה צמודה',
  'משתנה',
  'משתנה צמודה',
  'משתנה לא צמודה',
  'פריים',
  'זכאות',
  'בלון',
  'גרייס',
];

const SUMMARY_PATTERNS = {
  amount: [
    /(?:סכום|סה["']?כ(?:\s+)?הלוואה|loan amount|approved amount)[^\d]{0,24}([\d,]{5,})/i,
  ],
  first_monthly_payment: [
    /(?:החזר(?:\s+חודשי)?\s+ראשון|תשלום(?:\s+חודשי)?\s+ראשון|monthly payment)[^\d]{0,24}([\d,]{3,})/i,
  ],
  max_monthly_payment_forecast: [
    /(?:החזר(?:\s+חודשי)?\s+מקסימלי|החזר(?:\s+חודשי)?\s+צפוי|max monthly payment)[^\d]{0,24}([\d,]{3,})/i,
  ],
  weighted_interest_rate: [
    /(?:ריבית\s+משוקללת|weighted interest)[^\d]{0,24}(\d+(?:[.,]\d+)?)/i,
  ],
  total_repayment_forecast: [
    /(?:סך(?:\s+ה)?החזר|סה["']?כ(?:\s+)?החזר|total repayment)[^\d]{0,24}([\d,]{5,})/i,
  ],
  expiry_date: [
    /(?:תוקף(?:\s+עד)?|בתוקף\s+עד|expiry(?:\s+date)?)[^\d]{0,24}(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i,
  ],
};

function normalizeObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  return {};
}

function cleanNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value)
    .replace(/[^\d.,-]/g, '')
    .replace(/,(?=\d{3}\b)/g, '')
    .replace(/,/g, '.');

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  const normalizedValue = String(value).trim();
  if (!normalizedValue) {
    return null;
  }

  const isoMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2];
    const day = isoMatch[3];
    const isoDate = new Date(`${year}-${month}-${day}T00:00:00`);
    return Number.isNaN(isoDate.getTime()) ? null : isoDate.toISOString();
  }

  const directDate = new Date(normalizedValue);
  if (!Number.isNaN(directDate.getTime())) {
    return directDate.toISOString();
  }

  const match = normalizedValue.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (!match) {
    return null;
  }

  const dayRaw = match[1];
  const monthRaw = match[2];
  const yearRaw = match[3];
  const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
  const date = new Date(`${year}-${monthRaw.padStart(2, '0')}-${dayRaw.padStart(2, '0')}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function extractPatternValue(text, patterns, transform = cleanNumber) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return transform(match[1]);
    }
  }

  return null;
}

function estimateTrackRepayment(track) {
  const principal = cleanNumber(track.amount);
  const years = cleanNumber(track.years);
  const annualRate = cleanNumber(track.interest_rate);

  if (!principal || !years) {
    return null;
  }

  const totalMonths = Math.round(years * 12);
  if (!totalMonths) {
    return null;
  }

  if (!annualRate) {
    return principal;
  }

  const monthlyRate = annualRate / 100 / 12;
  if (!monthlyRate) {
    return principal;
  }

  const monthlyPayment = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalMonths));
  return Number.isFinite(monthlyPayment) ? monthlyPayment * totalMonths : null;
}

function extractTrackFromLine(line, index) {
  const normalized = line.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return null;
  }

  const hasTrackLabel = TRACK_LABELS.some((label) => normalized.includes(label));
  const percentMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*%/);
  const currencyMatches = [...normalized.matchAll(/([\d,]{5,})/g)]
    .map((match) => cleanNumber(match[1]))
    .filter((value) => value !== null && value !== undefined);

  if (!hasTrackLabel && !percentMatch) {
    return null;
  }

  if (!currencyMatches.length) {
    return null;
  }

  const yearsMatch = normalized.match(/(\d{1,2})(?:\s*שנ(?:
