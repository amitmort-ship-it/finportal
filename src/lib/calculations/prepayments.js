import { calculateMonthlyPayment } from './amortization.js';

export function applyLoanEvent({
  event,
  balance,
  monthlyPayment,
  remainingMonths,
  monthlyRate,
}) {
  if (!event) {
    return {
      balance,
      monthlyPayment,
      remainingMonths,
      eventApplied: null,
    };
  }

  const safeBalance = Math.max(0, Number(balance) || 0);
  const safeAmount = Math.max(0, Number(event.amount) || 0);

  if (event.eventType === 'full_settlement') {
    return {
      balance: 0,
      monthlyPayment: 0,
      remainingMonths: 0,
      eventApplied: event.eventType,
    };
  }

  if (event.eventType === 'prepayment_reduce_payment') {
    const nextBalance = Math.max(0, safeBalance - safeAmount);
    return {
      balance: nextBalance,
      monthlyPayment: calculateMonthlyPayment(nextBalance, monthlyRate, remainingMonths),
      remainingMonths,
      eventApplied: event.eventType,
    };
  }

  if (event.eventType === 'prepayment_reduce_term') {
    return {
      balance: Math.max(0, safeBalance - safeAmount),
      monthlyPayment,
      remainingMonths,
      eventApplied: event.eventType,
    };
  }

  return {
    balance,
    monthlyPayment,
    remainingMonths,
    eventApplied: event.eventType,
  };
}
