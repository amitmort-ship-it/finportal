export function formatCurrency(value) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(safeValue);
}

export function formatPercent(value, digits = 2) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `${safeValue.toFixed(digits)}%`;
}

export function formatMonths(months) {
  const safeMonths = Math.max(0, Math.round(Number(months) || 0));
  if (safeMonths < 12) {
    return `${safeMonths} חודשים`;
  }

  const years = safeMonths / 12;
  return Number.isInteger(years) ? `${years} שנים` : `${years.toFixed(1)} שנים`;
}

export function formatInputNumber(value) {
  const raw = String(value ?? '').replace(/,/g, '');
  if (!raw) return '';

  const [whole, fraction] = raw.split('.');
  const formattedWhole = Number(whole || 0).toLocaleString('en-US');
  return fraction !== undefined ? `${formattedWhole}.${fraction}` : formattedWhole;
}

export function sanitizeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}
