function getAnchorCandidates(forecastMonth, anchorType) {
  if (anchorType === 'gov_bond_linked') {
    return {
      12: forecastMonth.govBondLinked1Y,
      24: forecastMonth.govBondLinked2Y,
      60: forecastMonth.govBondLinked5Y,
      120: forecastMonth.govBondLinked10Y,
    };
  }

  if (anchorType === 'gov_bond_unlinked') {
    return {
      12: forecastMonth.govBondUnlinked1Y,
      24: forecastMonth.govBondUnlinked2Y,
      60: forecastMonth.govBondUnlinked5Y,
      120: forecastMonth.govBondUnlinked10Y,
    };
  }

  return {};
}

export function getMonthlyInterestRate(annualInterestRate) {
  return (Number(annualInterestRate) || 0) / 100 / 12;
}

export function getRelevantAnchor(forecastMonth, anchorType, anchorTermMonths) {
  if (!forecastMonth) return 0;

  if (anchorType === 'boi_rate') return Number(forecastMonth.boiRate || 0);
  if (anchorType === 'prime') return Number(forecastMonth.primeRate || 0);
  if (anchorType === 'makam') return Number(forecastMonth.makamRate || 0);
  if (anchorType === 'avg_mortgage_linked') return Number(forecastMonth.avgMortgageLinked || 0);
  if (anchorType === 'avg_mortgage_unlinked') return Number(forecastMonth.avgMortgageUnlinked || 0);
  if (anchorType === 'cpi') return Number(forecastMonth.cpiAnnual || 0);

  const candidates = getAnchorCandidates(forecastMonth, anchorType);
  const targetTerm = Number(anchorTermMonths) || 60;
  const exactMatch = candidates[targetTerm];
  if (exactMatch !== undefined) return Number(exactMatch || 0);

  const terms = Object.keys(candidates).map(Number).sort((a, b) => a - b);
  if (!terms.length) return 0;

  let nearestTerm = terms[0];
  for (const term of terms) {
    if (Math.abs(term - targetTerm) < Math.abs(nearestTerm - targetTerm)) {
      nearestTerm = term;
    }
  }

  return Number(candidates[nearestTerm] || 0);
}

export function resolveTrackAnnualRate(track, forecastMonth, monthNumber, previousAnnualRate) {
  const margin = Number(track.customerMargin || 0);
  const currentRate = Number(track.annualInterestRate || 0);
  const changeFrequencyMonths = Math.max(1, Number(track.changeFrequencyMonths || 12));
  const isChangeMonth = monthNumber === 1 || (monthNumber - 1) % changeFrequencyMonths === 0;

  switch (track.loanType) {
    case 'prime':
      return Number(forecastMonth?.primeRate || 0) + margin;
    case 'fixed_unlinked':
    case 'fixed_linked':
    case 'eligibility':
      return currentRate;
    case 'makam':
      return isChangeMonth || previousAnnualRate == null
        ? Number(forecastMonth?.makamRate || 0) + margin
        : previousAnnualRate;
    case 'variable_unlinked':
    case 'variable_linked':
      if (isChangeMonth || previousAnnualRate == null) {
        return getRelevantAnchor(forecastMonth, track.anchorType, track.anchorTermMonths) + margin;
      }
      return previousAnnualRate;
    case 'balloon_full':
    case 'balloon_partial':
      return currentRate;
    default:
      return currentRate;
  }
}
