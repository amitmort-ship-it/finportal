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

function extractPatternValue(text, patterns, transform) {
  const finalTransform = transform || cleanNumber;

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return finalTransform(match[1]);
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
  const currencyMatches = Array.from(normalized.matchAll(/([\d,]{5,})/g))
    .map((match) => cleanNumber(match[1]))
    .filter((value) => value !== null && value !== undefined);

  if (!hasTrackLabel && !percentMatch) {
    return null;
  }

  if (!currencyMatches.length) {
    return null;
  }

  const yearsMatch = normalized.match(/(\d{1,2})(?:\s*שנ(?:ים|ות)|\s*year)/i);
  const monthlyPayment = currencyMatches.length > 1 ? currencyMatches[1] : null;
  const trackNameMatch = TRACK_LABELS.find((label) => normalized.includes(label));

  return {
    id: `track-${index + 1}`,
    name: trackNameMatch ? trackNameMatch : `מסלול ${index + 1}`,
    amount: currencyMatches[0],
    monthly_payment: monthlyPayment,
    years: yearsMatch ? cleanNumber(yearsMatch[1]) : null,
    interest_rate: percentMatch ? cleanNumber(percentMatch[1]) : null,
    source_line: normalized,
  };
}

export function buildComparableApproval(approval) {
  const aiData = normalizeObject(approval ? approval.ai_data : null);
  const summaryMetrics = normalizeObject(aiData.summary_metrics);
  const offerMetadata = normalizeObject(aiData.offer_metadata);
  const tracks = Array.isArray(aiData.tracks) ? aiData.tracks : [];

  const amount = cleanNumber(
    summaryMetrics.amount !== undefined ? summaryMetrics.amount : approval.amount,
  );
  const firstMonthlyPayment = cleanNumber(
    summaryMetrics.first_monthly_payment !== undefined
      ? summaryMetrics.first_monthly_payment
      : approval.monthly_payment,
  );

  let maxMortgageYears = cleanNumber(approval.mortgage_years);
  if (maxMortgageYears === null || maxMortgageYears === undefined) {
    maxMortgageYears = 0;
  }

  tracks.forEach((track) => {
    const years = cleanNumber(track.years);
    if (years && years > maxMortgageYears) {
      maxMortgageYears = years;
    }
  });

  if (!maxMortgageYears) {
    maxMortgageYears = null;
  }

  let weightedRate = cleanNumber(summaryMetrics.weighted_interest_rate);
  if (weightedRate === null || weightedRate === undefined) {
    const validTracks = tracks.filter((track) => {
      const amountValue = cleanNumber(track.amount);
      const rateValue = cleanNumber(track.interest_rate);
      return amountValue !== null && amountValue !== undefined && rateValue !== null && rateValue !== undefined;
    });

    if (validTracks.length) {
      const total = validTracks.reduce((sum, track) => sum + cleanNumber(track.amount), 0);
      if (total) {
        const weighted = validTracks.reduce(
          (sum, track) => sum + cleanNumber(track.amount) * cleanNumber(track.interest_rate),
          0,
        );
        weightedRate = Number((weighted / total).toFixed(2));
      }
    }
  }

  let totalRepayment = cleanNumber(summaryMetrics.total_repayment_forecast);
  if (totalRepayment === null || totalRepayment === undefined) {
    const estimated = tracks
      .map(estimateTrackRepayment)
      .filter((value) => value !== null && value !== undefined)
      .reduce((sum, value) => sum + value, 0);

    totalRepayment = estimated ? estimated : null;
  }

  const expirySource = approval && approval.offer_expiry_date
    ? approval.offer_expiry_date
    : offerMetadata.expiry_date;

  const parsingConfidenceSource = offerMetadata.parsing_confidence !== undefined
    ? offerMetadata.parsing_confidence
    : offerMetadata.confidence;

  let source = offerMetadata.source;
  if (approval && approval.offer_expiry_date) {
    source = 'manual';
  } else if (!source) {
    source = tracks.length ? 'parsed_pdf' : 'manual';
  }

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
      expiry_date: parseDateValue(expirySource),
      parsing_confidence: cleanNumber(parsingConfidenceSource),
      source,
    },
    tracks: tracks.map((track, index) => ({
      id: track.id ? track.id : `track-${index + 1}`,
      name: track.name ? track.name : `מסלול ${index + 1}`,
      amount: cleanNumber(track.amount),
      monthly_payment: cleanNumber(track.monthly_payment),
      years: cleanNumber(track.years),
      interest_rate: cleanNumber(track.interest_rate),
      source_line: track.source_line ? track.source_line : null,
    })),
    raw_ai_data: aiData,
  };
}

export function buildComparisonRows(approvals) {
  const sourceApprovals = Array.isArray(approvals) ? approvals : [];
  const comparable = sourceApprovals
    .map(buildComparableApproval)
    .filter((approval) => (
      approval.summary_metrics.amount !== null ||
      approval.summary_metrics.first_monthly_payment !== null ||
      approval.summary_metrics.total_repayment_forecast !== null ||
      approval.tracks.length > 0
    ));

  const maxTrackCount = comparable.reduce((max, approval) => Math.max(max, approval.tracks.length), 0);

  return {
    approvals: comparable,
    maxTrackCount,
  };
}

export function parseApprovalText(text, fallback) {
  const fallbackValue = fallback || {};
  const normalizedText = text.replace(/\u0000/g, ' ').replace(/\s+/g, ' ').trim();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const tracks = lines
    .map(extractTrackFromLine)
    .filter((track) => track !== null);

  const tracksAmount = tracks.reduce((sum, track) => sum + (cleanNumber(track.amount) || 0), 0);
  const tracksMonthlyPayment = tracks.reduce((sum, track) => sum + (cleanNumber(track.monthly_payment) || 0), 0);

  const summaryAmount = extractPatternValue(normalizedText, SUMMARY_PATTERNS.amount, cleanNumber);
  const finalAmount = summaryAmount !== null && summaryAmount !== undefined ? summaryAmount : (tracksAmount || null);

  const extractedFirstPayment = extractPatternValue(normalizedText, SUMMARY_PATTERNS.first_monthly_payment, cleanNumber);
  const firstMonthlyPayment = extractedFirstPayment !== null && extractedFirstPayment !== undefined
    ? extractedFirstPayment
    : (tracksMonthlyPayment || null);

  let weightedInterestRate = extractPatternValue(normalizedText, SUMMARY_PATTERNS.weighted_interest_rate, cleanNumber);
  if (weightedInterestRate === null || weightedInterestRate === undefined) {
    const validTracks = tracks.filter((track) => {
      const amountValue = cleanNumber(track.amount);
      const rateValue = cleanNumber(track.interest_rate);
      return amountValue !== null && amountValue !== undefined && rateValue !== null && rateValue !== undefined;
    });

    if (validTracks.length) {
      const totalAmount = validTracks.reduce((sum, track) => sum + cleanNumber(track.amount), 0);
      if (totalAmount) {
        const weighted = validTracks.reduce(
          (sum, track) => sum + cleanNumber(track.amount) * cleanNumber(track.interest_rate),
          0,
        );
        weightedInterestRate = Number((weighted / totalAmount).toFixed(2));
      }
    }
  }

  const parsed = {
    summary_metrics: {
      amount: finalAmount,
      first_monthly_payment: firstMonthlyPayment,
      max_monthly_payment_forecast: extractPatternValue(normalizedText, SUMMARY_PATTERNS.max_monthly_payment_forecast, cleanNumber),
      weighted_interest_rate: weightedInterestRate,
      total_repayment_forecast: extractPatternValue(normalizedText, SUMMARY_PATTERNS.total_repayment_forecast, cleanNumber),
    },
    offer_metadata: {
      expiry_date: extractPatternValue(normalizedText, SUMMARY_PATTERNS.expiry_date, parseDateValue),
      parsing_confidence: tracks.length ? 0.72 : 0.4,
      source: 'parsed_pdf',
    },
    tracks,
    raw_text_excerpt: normalizedText.slice(0, 2000),
    bank_name: fallbackValue.bank_name ? fallbackValue.bank_name : null,
  };

  return {
    ai_data: parsed,
    amount: finalAmount,
    monthly_payment: firstMonthlyPayment,
    mortgage_years: tracks.length ? tracks[0].years : null,
  };
}
