export const LOAN_TYPES = [
  { value: 'prime', label: 'פריים', linked: false },
  { value: 'fixed_unlinked', label: 'קל"צ', linked: false },
  { value: 'fixed_linked', label: 'ק"צ', linked: true },
  { value: 'variable_unlinked', label: 'מל"צ', linked: false },
  { value: 'variable_linked', label: 'מ"צ', linked: true },
  { value: 'makam', label: 'מק"מ', linked: false },
  { value: 'eligibility', label: 'זכאות', linked: true },
  { value: 'balloon_full', label: 'בלון מלא', linked: false },
  { value: 'balloon_partial', label: 'בלון חלקי', linked: false },
];

export const AMORTIZATION_TYPES = [
  { value: 'spitzer', label: 'שפיצר' },
  { value: 'equal_principal', label: 'קרן שווה' },
  { value: 'full_balloon', label: 'בלון מלא' },
  { value: 'partial_balloon', label: 'בלון חלקי' },
];

export const PURPOSE_OPTIONS = [
  { value: 'purchase', label: 'רכישה' },
  { value: 'refinance', label: 'מחזור' },
  { value: 'construction', label: 'בנייה' },
  { value: 'allPurpose', label: 'לכל מטרה' },
  { value: 'investment', label: 'השקעה' },
];

export const FORECAST_SCENARIOS = [
  { value: 'custom', label: 'מותאם אישית' },
  { value: 'conservative', label: 'שמרני' },
  { value: 'optimistic', label: 'אופטימי' },
  { value: 'no_indexation', label: 'ללא מדד' },
];

export const CHANGE_FREQUENCY_OPTIONS = [
  { value: 12, label: 'כל שנה' },
  { value: 24, label: 'כל שנתיים' },
  { value: 30, label: 'כל 2.5 שנים' },
  { value: 60, label: 'כל 5 שנים' },
  { value: 84, label: 'כל 7 שנים' },
  { value: 120, label: 'כל 10 שנים' },
];

export const ANCHOR_TERM_OPTIONS = [
  { value: 12, label: 'שנה' },
  { value: 24, label: 'שנתיים' },
  { value: 60, label: '5 שנים' },
  { value: 120, label: '10 שנים' },
];

export function getLoanTypeMeta(loanType) {
  return LOAN_TYPES.find((item) => item.value === loanType) || LOAN_TYPES[0];
}

export function createDefaultTrack(index = 0) {
  return {
    id: `track-${Date.now()}-${index}`,
    name: `מסלול ${index + 1}`,
    loanType: index === 0 ? 'prime' : 'fixed_unlinked',
    amortizationType: 'spitzer',
    principal: index === 0 ? 400000 : 500000,
    termMonths: index === 0 ? 360 : 240,
    annualInterestRate: index === 0 ? 0 : 4.85,
    customerMargin: index === 0 ? -0.8 : 0,
    isLinkedToCpi: false,
    changeFrequencyMonths: 60,
    anchorType: index === 0 ? 'prime' : 'gov_bond_unlinked',
    anchorTermMonths: 60,
    currentAnchorRate: index === 0 ? 0 : 3.9,
    graceMonths: 0,
    balloonPaymentMonth: null,
    monthlyPaymentInitial: null,
    monthlyPaymentCurrent: null,
    trackNotes: '',
  };
}

export function createDefaultSimulationState() {
  return {
    client: {
      firstName: 'דנה',
      lastName: 'לוי',
      phone: '',
      email: '',
      householdIncomeNet: 28000,
      householdIncomeGross: 0,
      monthlyObligations: 2500,
      notes: '',
    },
    simulation: {
      name: 'MVP סימולציית משכנתא',
      purpose: 'purchase',
      propertyValue: 2400000,
      purchasePrice: 2400000,
      requestedLoanAmount: 900000,
      equity: 1500000,
      ltv: 37.5,
      targetMonthlyPayment: 6200,
      advisorNotes: '',
      clientSummary: '',
    },
    forecast: {
      name: 'תרחיש מותאם אישית',
      type: 'custom',
      horizonMonths: 360,
      baseDate: new Date().toISOString().slice(0, 10),
      boiRate: 4.5,
      cpiAnnual: 2.4,
      makamRate: 4.2,
      govBondLinked1Y: 2.1,
      govBondLinked2Y: 2.2,
      govBondLinked5Y: 2.45,
      govBondLinked10Y: 2.65,
      govBondUnlinked1Y: 3.9,
      govBondUnlinked2Y: 4.0,
      govBondUnlinked5Y: 4.15,
      govBondUnlinked10Y: 4.3,
      annualBoiDelta: -0.15,
      annualCpiDelta: 0,
    },
    tracks: [createDefaultTrack(0), createDefaultTrack(1)],
  };
}
