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

const normalizeObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);

const cleanNumber = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const normalized = String(value)
    .replace(/[^\d.,-]/g, '')
    .replace(/,(?=\d{3}\b)/g, '')
    .replace(/,/g, '.');

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();

  const normalizedValue = String(value).trim();
  if (!normalizedValue) return null;

  const isoMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const isoDate = new Date(`${year}-${month}-${day}T00:00:00`);
    return Number.isNaN(isoDate.getTime()) ? null : isoDate.toISOString();
  }

  const directDate = new Date(normalizedValue);
  if (!Number.isNaN(directDate.getTime())) return directDate.toISOString();

  const match = normalizedValue.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (!match) return null;

  const [, dayRaw, monthRaw, yearRaw] = match;
  const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
  const date = new Date(`${year}-${monthRaw.padStart(2, '0')}-${dayRaw.padStart(2, '0')}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const extractPatternValue = (text, patterns, transform = cleanNumber) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return transform(match[1]);
    }
  }
  return null;
};

const estimateTrackRepayment = (track) => {
  const principal = cleanNumber(track.amount);
  const years = cleanNumber(track.years);
  const annualRate = cleanNumber(track.interest_rate);

  if (!principal || !years) return null;

  const totalMonths = Math.round(years * 12);
  if (!totalMonths) return null;

  if (!annualRate) {
    return principal;
  }

  const monthlyRate = annualRate / 100 / 12;
  if (!monthlyRate) return principal;

  const monthlyPayment = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalMonths));
  return Number.isFinite(monthlyPayment) ? monthlyPayment * totalMonths : null;
};

const extractTrackFromLine = (line, index) => {
  const normalized = line.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;

  const hasTrackLabel = TRACK_LABELS.some((label) => normalized.includes(label));
  const percentMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*%/);
  const currencyMatches = [...normalized.matchAll(/([\d,]{5,})/g)].map((match) => cleanNumber(match[1])).filter(Boolean);

  if (!hasTrackLabel && !percentMatch) return null;
  if (currencyMatches.length === 0) return null;

  const yearsMatch = normalized.match(/(\d{1,2})(?:\s*שנ(?:ים|ות)|\s*year)/i);
  const monthlyPayment = currencyMatches.length > 1 ? currencyMatches[1] : null;

  return {
    id: `track-${index + 1}`,
    name: TRACK_LABELS.find((label) => normalized.includes(label)) || `מסלול ${index + 1}`,
    amount: currencyMatches[0] || null,
    monthly_payment: monthlyPayment,
    years: yearsMatch ? cleanNumber(yearsMatch[1]) : null,
    interest_rate: percentMatch ? cleanNumber(percentMatch[1]) : null,
    source_line: normalized,
  };
};

export const buildComparableApproval = (approval) => {
  const aiData = normalizeObject(approval?.ai_data);
  const summaryMetrics = normalizeObject(aiData.summary_metrics);
  const offerMetadata = normalizeObject(aiData.offer_metadata);
  const tracks = Array.isArray(aiData.tracks) ? aiData.tracks : [];

  const amount = cleanNumber(summaryMetrics.amount ?? approval.amount);
  const firstMonthlyPayment = cleanNumber(summaryMetrics.first_monthly_payment ?? approval.monthly_payment);
  const maxMortgageYears = tracks.reduce((max, track) => {
    const years = cleanNumber(track.years);
    if (!years) return max;
    return Math.max(max, years);
  }, cleanNumber(approval.mortgage_years) || 0) || null;

  const weightedRate =
    cleanNumber(summaryMetrics.weighted_interest_rate) ??
    (() => {
      const validTracks = tracks.filter((track) => cleanNumber(track.amount) && cleanNumber(track.interest_rate));
      if (!validTracks.length) return null;

      const total = validTracks.reduce((sum, track) => sum + cleanNumber(track.amount), 0);
      if (!total) return null;

      const weighted = validTracks.reduce(
        (sum, track) => sum + cleanNumber(track.amount) * cleanNumber(track.interest_rate),
        0,
      );
      return Number((weighted / total).toFixed(2));
    })();

  const totalRepayment =
    cleanNumber(summaryMetrics.total_repayment_forecast) ??
    (() => {
      const estimated = tracks
        .map(estimateTrackRepayment)
        .filter(Boolean)
        .reduce((sum, value) => sum + value, 0);
      return estimated || null;
    })();

  return {
    id: approval.id,
    bank_name: approval.bank_name,
    approval_title: approval.approval_title,
    summary_metrics: {
      amount,
      first_monthly_payment: firstMonthlyPayment,
      mortgage_years: maxMortgageYears,
      max_monthly_payment_forecast: cleanNumber(summaryMetrics.max_monthly_payment_forecast),
      weighted_interest_rate: weightedRate,
      total_repayment_forecast: totalRepayment,
    },
    offer_metadata: {
      expiry_date: parseDateValue(approval.offer_expiry_date || offerMetadata.expiry_date),
      parsing_confidence: cleanNumber(offerMetadata.parsing_confidence ?? offerMetadata.confidence),
      source: approval.offer_expiry_date ? 'manual' : (offerMetadata.source || (tracks.length ? 'parsed_pdf' : 'manual')),
    },
    tracks: tracks.map((track, index) => ({
      id: track.id || `track-${index + 1}`,
      name: track.name || `מסלול ${index + 1}`,
      amount: cleanNumber(track.amount),
      monthly_payment: cleanNumber(track.monthly_payment),
      years: cleanNumber(track.years),
      interest_rate: cleanNumber(track.interest_rate),
      source_line: track.source_line || null,
    })),
    raw_ai_data: aiData,
  };
};

export const buildComparisonRows = (approvals) => {
  const comparable = (Array.isArray(approvals) ? approvals : []).map(buildComparableApproval).filter((approval) => (
    approval.summary_metrics.amount ||
    approval.summary_metrics.first_monthly_payment ||
    approval.summary_metrics.total_repayment_forecast ||
    approval.tracks.length
  ));

  const maxTrackCount = comparable.reduce((max, approval) => Math.max(max, approval.tracks.length), 0);

  return {
    approvals: comparable,
    maxTrackCount,
  };
};

export const parseApprovalText = (text, fallback = {}) => {
  const normalizedText = text.replace(/\u0000/g, ' ').replace(/\s+/g, ' ').trim();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const tracks = lines
    .map(extractTrackFromLine)
    .filter(Boolean);

  const tracksAmount = tracks.reduce((sum, track) => sum + (cleanNumber(track.amount) || 0), 0);
  const tracksMonthlyPayment = tracks.reduce((sum, track) => sum + (cleanNumber(track.monthly_payment) || 0), 0);

  const summaryAmount = extractPatternValue(normalizedText, SUMMARY_PATTERNS.amount) ?? (tracksAmount || null);

  const firstMonthlyPayment =
    extractPatternValue(normalizedText, SUMMARY_PATTERNS.first_monthly_payment) ??
    (tracksMonthlyPayment || null);

  const weightedInterestRate =
    extractPatternValue(normalizedText, SUMMARY_PATTERNS.weighted_interest_rate) ??
    (() => {
      const validTracks = tracks.filter((track) => cleanNumber(track.amount) && cleanNumber(track.interest_rate));
      if (!validTracks.length) return null;
      const totalAmount = validTracks.reduce((sum, track) => sum + cleanNumber(track.amount), 0);
      const weighted = validTracks.reduce(
        (sum, track) => sum + cleanNumber(track.amount) * cleanNumber(track.interest_rate),
        0,
      );
      return totalAmount ? Number((weighted / totalAmount).toFixed(2)) : null;
    })();

  const parsed = {
    summary_metrics: {
      amount: summaryAmount,
      first_monthly_payment: firstMonthlyPayment,
      max_monthly_payment_forecast: extractPatternValue(normalizedText, SUMMARY_PATTERNS.max_monthly_payment_forecast),
      weighted_interest_rate: weightedInterestRate,
      total_repayment_forecast: extractPatternValue(normalizedText, SUMMARY_PATTERNS.total_repayment_forecast),
    },
    offer_metadata: {
      expiry_date: extractPatternValue(normalizedText, SUMMARY_PATTERNS.expiry_date, parseDateValue),
      parsing_confidence: tracks.length ? 0.72 : 0.4,
      source: 'parsed_pdf',
    },
    tracks,
    raw_text_excerpt: normalizedText.slice(0, 2000),
    bank_name: fallback.bank_name || null,
  };

  return {
    ai_data: parsed,
    amount: summaryAmount,
    monthly_payment: firstMonthlyPayment,
    mortgage_years: tracks[0]?.years || null,
  };
};
