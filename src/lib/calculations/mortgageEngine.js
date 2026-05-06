import { calculateEqualPrincipalPayment, calculateMonthlyPayment } from './amortization.js';
import { getMonthlyInterestRate, resolveTrackAnnualRate } from './interestRates.js';
import { calculateLinkedBalance } from './indexation.js';
import { applyLoanEvent } from './prepayments.js';

function getForecastMonth(forecastCurve, monthNumber) {
  return forecastCurve[Math.min(monthNumber - 1, forecastCurve.length - 1)];
}

function isTrackLinked(track) {
  return Boolean(track.isLinkedToCpi || track.loanType === 'fixed_linked' || track.loanType === 'variable_linked');
}

function calculateBalloonPayment(balance, monthlyRate, remainingMonths, amortizationType) {
  if (amortizationType === 'full_balloon') {
    return remainingMonths === 1 ? balance * (1 + monthlyRate) : 0;
  }

  const interestComponent = balance * monthlyRate;
  const principalComponent = remainingMonths === 1 ? balance : 0;

  return {
    monthlyPayment: interestComponent + principalComponent,
    principalComponent,
    interestComponent,
  };
}

export function calculateLoanTrackSchedule(track, forecastCurve, loanEvents = []) {
  const totalMonths = Math.max(1, Math.min(360, Math.round(Number(track.termMonths) || 0)));
  const eventsByMonth = new Map(
    loanEvents.map((event) => [Number(event.eventMonth), event])
  );
  const rows = [];

  let balance = Math.max(0, Number(track.principal) || 0);
  let cumulativePrincipalPaid = 0;
  let cumulativeInterestPaid = 0;
  let cumulativeIndexationPaid = 0;
  let cumulativePayments = 0;
  let previousAnnualRate = null;
  let remainingMonths = totalMonths;

  for (let monthNumber = 1; monthNumber <= totalMonths && balance > 0.01; monthNumber += 1) {
    const forecastMonth = getForecastMonth(forecastCurve, monthNumber);
    const openingBalance = balance;
    const linked = isTrackLinked(track);
    const { indexedOpeningBalance, indexationAmount } = linked
      ? calculateLinkedBalance(openingBalance, forecastMonth.cpiMonthly)
      : { indexedOpeningBalance: openingBalance, indexationAmount: 0 };
    const annualInterestRate = resolveTrackAnnualRate(track, forecastMonth, monthNumber, previousAnnualRate);
    const monthlyInterestRate = getMonthlyInterestRate(annualInterestRate);
    const rateChanged = previousAnnualRate !== null && previousAnnualRate !== annualInterestRate;
    previousAnnualRate = annualInterestRate;

    let monthlyPayment = 0;
    let interestComponent = 0;
    let principalComponent = 0;

    if (track.amortizationType === 'equal_principal') {
      const equalPrincipal = calculateEqualPrincipalPayment(
        indexedOpeningBalance,
        monthlyInterestRate,
        remainingMonths
      );
      monthlyPayment = equalPrincipal.monthlyPayment;
      interestComponent = equalPrincipal.interestComponent;
      principalComponent = equalPrincipal.monthlyPrincipal;
    } else if (
      track.amortizationType === 'full_balloon' ||
      track.amortizationType === 'partial_balloon'
    ) {
      const balloon = calculateBalloonPayment(
        indexedOpeningBalance,
        monthlyInterestRate,
        remainingMonths,
        track.amortizationType
      );

      if (typeof balloon === 'number') {
        monthlyPayment = balloon;
        principalComponent = remainingMonths === 1 ? indexedOpeningBalance : 0;
        interestComponent = Math.max(0, monthlyPayment - principalComponent);
      } else {
        monthlyPayment = balloon.monthlyPayment;
        principalComponent = balloon.principalComponent;
        interestComponent = balloon.interestComponent;
      }
    } else {
      monthlyPayment = calculateMonthlyPayment(indexedOpeningBalance, monthlyInterestRate, remainingMonths);
      interestComponent = indexedOpeningBalance * monthlyInterestRate;
      principalComponent = monthlyPayment - interestComponent;
    }

    if (principalComponent > indexedOpeningBalance) {
      principalComponent = indexedOpeningBalance;
      monthlyPayment = principalComponent + interestComponent;
    }

    let closingBalance = Math.max(0, indexedOpeningBalance - principalComponent);
    const event = eventsByMonth.get(monthNumber);
    const nextRemainingMonths = Math.max(0, remainingMonths - 1);
    const eventResult = applyLoanEvent({
      event,
      balance: closingBalance,
      monthlyPayment,
      remainingMonths: nextRemainingMonths,
      monthlyRate: monthlyInterestRate,
    });

    closingBalance = eventResult.balance;
    monthlyPayment = eventResult.monthlyPayment;
    remainingMonths = eventResult.remainingMonths;

    cumulativePrincipalPaid += principalComponent;
    cumulativeInterestPaid += interestComponent;
    cumulativeIndexationPaid += indexationAmount;
    cumulativePayments += monthlyPayment;

    rows.push({
      loanTrackId: track.id,
      monthNumber,
      paymentDate: forecastMonth.forecastDate,
      openingBalance,
      cpiMonthly: forecastMonth.cpiMonthly,
      indexationAmount,
      indexedOpeningBalance,
      annualInterestRate,
      monthlyInterestRate,
      monthlyPayment,
      principalComponent,
      interestComponent,
      indexationComponent: indexationAmount,
      prepaymentAmount: event?.amount || 0,
      capitalizationFee: event?.capitalizationFee || 0,
      closingBalance,
      cumulativePrincipalPaid,
      cumulativeInterestPaid,
      cumulativeIndexationPaid,
      cumulativePayments,
      isRateChangeMonth: rateChanged,
      isEventMonth: Boolean(event),
      eventType: eventResult.eventApplied,
    });

    balance = closingBalance;
    remainingMonths = eventResult.remainingMonths;
  }

  return rows;
}

export function calculateMixSummary({
  tracks,
  trackSchedules,
  monthlyRows,
  simulation,
}) {
  const totalLoanAmount = tracks.reduce((sum, track) => sum + (Number(track.principal) || 0), 0);
  const allPayments = monthlyRows.map((row) => row.monthlyPayment);
  const totalPayments = monthlyRows.reduce((sum, row) => sum + row.monthlyPayment, 0);
  const totalInterestPaid = monthlyRows.reduce((sum, row) => sum + row.interestComponent, 0);
  const totalIndexationPaid = monthlyRows.reduce((sum, row) => sum + row.indexationComponent, 0);
  const totalCost = totalPayments;
  const firstMonthlyPayment = allPayments[0] || 0;
  const peakMonthlyPayment = allPayments.length ? Math.max(...allPayments) : 0;
  const averageMonthlyPayment = allPayments.length ? totalPayments / allPayments.length : 0;
  const representativePayment = monthlyRows
    .slice(0, Math.min(60, monthlyRows.length))
    .reduce((sum, row) => sum + row.monthlyPayment, 0) / Math.max(1, Math.min(60, monthlyRows.length));
  const weightedAverageInterest = totalLoanAmount
    ? trackSchedules.reduce((sum, trackSchedule) => {
      const firstRowRate = Number(trackSchedule.rows[0]?.annualInterestRate || 0);
      return sum + (Number(trackSchedule.track.principal) || 0) * firstRowRate;
    }, 0) / totalLoanAmount
    : 0;
  const weightedAverageDuration = totalLoanAmount
    ? tracks.reduce((sum, track) => sum + (Number(track.principal) || 0) * (Number(track.termMonths) || 0), 0) / totalLoanAmount
    : 0;
  const householdIncomeNet = Number(simulation?.client?.householdIncomeNet || 0);
  const monthlyObligations = Number(simulation?.client?.monthlyObligations || 0);
  const repaymentRatio = householdIncomeNet
    ? ((firstMonthlyPayment + monthlyObligations) / householdIncomeNet) * 100
    : 0;

  return {
    totalLoanAmount,
    firstMonthlyPayment,
    peakMonthlyPayment,
    averageMonthlyPayment,
    representativePayment,
    totalPrincipalPaid: totalLoanAmount,
    totalInterestPaid,
    totalIndexationPaid,
    totalInterestAndIndexation: totalInterestPaid + totalIndexationPaid,
    totalPayments,
    totalCost,
    costPerShekel: totalLoanAmount ? totalCost / totalLoanAmount : 0,
    weightedAverageInterest,
    weightedAverageDuration,
    durationUntilFullRepayment: monthlyRows.length,
    debtAfter5Years: monthlyRows[Math.min(59, monthlyRows.length - 1)]?.closingBalance || 0,
    debtAfter10Years: monthlyRows[Math.min(119, monthlyRows.length - 1)]?.closingBalance || 0,
    debtAfter15Years: monthlyRows[Math.min(179, monthlyRows.length - 1)]?.closingBalance || 0,
    principalPaidAfter5Years: monthlyRows[Math.min(59, monthlyRows.length - 1)]?.cumulativePrincipalPaid || 0,
    principalPaidAfter10Years: monthlyRows[Math.min(119, monthlyRows.length - 1)]?.cumulativePrincipalPaid || 0,
    principalPaidAfter15Years: monthlyRows[Math.min(179, monthlyRows.length - 1)]?.cumulativePrincipalPaid || 0,
    repaymentRatio,
    trackCount: trackSchedules.length,
  };
}

export function generateClientSummary({ simulation, summary }) {
  const clientName = [simulation?.client?.firstName, simulation?.client?.lastName].filter(Boolean).join(' ');
  return [
    `הסימולציה עבור ${clientName || 'הלקוח'} בודקת משכנתא של כ-${Math.round(summary.totalLoanAmount).toLocaleString('he-IL')} ₪.`,
    `ההחזר הראשון עומד על כ-${Math.round(summary.firstMonthlyPayment).toLocaleString('he-IL')} ₪ והחזר מייצג של כ-${Math.round(summary.representativePayment).toLocaleString('he-IL')} ₪.`,
    `סך ריבית והצמדה צפויים מוערכים בכ-${Math.round(summary.totalInterestAndIndexation).toLocaleString('he-IL')} ₪ לאורך ${summary.durationUntilFullRepayment} חודשים.`,
  ].join(' ');
}

export function calculateMortgageMixSchedule({
  simulation,
  tracks,
  forecastCurve,
  loanEventsByTrack = {},
}) {
  const trackSchedules = tracks.map((track) => ({
    track,
    rows: calculateLoanTrackSchedule(track, forecastCurve, loanEventsByTrack[track.id] || []),
  }));

  const maxMonths = Math.max(0, ...trackSchedules.map((trackSchedule) => trackSchedule.rows.length));
  const monthlyRows = Array.from({ length: maxMonths }, (_, index) => {
    const monthNumber = index + 1;
    const sourceRows = trackSchedules
      .map((trackSchedule) => trackSchedule.rows[index])
      .filter(Boolean);

    return {
      monthNumber,
      paymentDate: sourceRows[0]?.paymentDate || null,
      monthlyPayment: sourceRows.reduce((sum, row) => sum + row.monthlyPayment, 0),
      principalComponent: sourceRows.reduce((sum, row) => sum + row.principalComponent, 0),
      interestComponent: sourceRows.reduce((sum, row) => sum + row.interestComponent, 0),
      indexationComponent: sourceRows.reduce((sum, row) => sum + row.indexationComponent, 0),
      closingBalance: sourceRows.reduce((sum, row) => sum + row.closingBalance, 0),
      cumulativePrincipalPaid: sourceRows.reduce((sum, row) => sum + row.cumulativePrincipalPaid, 0),
      cumulativeInterestPaid: sourceRows.reduce((sum, row) => sum + row.cumulativeInterestPaid, 0),
      cumulativeIndexationPaid: sourceRows.reduce((sum, row) => sum + row.cumulativeIndexationPaid, 0),
      cumulativePayments: sourceRows.reduce((sum, row) => sum + row.cumulativePayments, 0),
    };
  });

  const summary = calculateMixSummary({
    tracks,
    trackSchedules,
    monthlyRows,
    simulation,
  });

  return {
    summary,
    monthlyRows,
    trackSchedules,
    clientSummary: generateClientSummary({ simulation, summary }),
  };
}
