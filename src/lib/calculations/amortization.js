/**
 * Calculate the fixed monthly payment for an equal-payment (שפיצר) loan.
 * @param {number} principal - Opening balance
 * @param {number} monthlyRate - Monthly interest rate (decimal)
 * @param {number} remainingMonths - Number of months remaining
 * @returns {number} Monthly payment amount
 */
export function calculateMonthlyPayment(principal, monthlyRate, remainingMonths) {
  if (remainingMonths <= 0 || principal <= 0) return 0;
  if (monthlyRate === 0) return principal / remainingMonths;

  const factor = Math.pow(1 + monthlyRate, remainingMonths);
  return (principal * monthlyRate * factor) / (factor - 1);
}

/**
 * Calculate a single month's payment for an equal-principal (קרן שווה) loan.
 * @param {number} balance - Opening balance
 * @param {number} monthlyRate - Monthly interest rate (decimal)
 * @param {number} remainingMonths - Number of months remaining
 * @returns {{ monthlyPrincipal: number, interestComponent: number, monthlyPayment: number }}
 */
export function calculateEqualPrincipalPayment(balance, monthlyRate, remainingMonths) {
  if (remainingMonths <= 0 || balance <= 0) {
    return { monthlyPrincipal: 0, interestComponent: 0, monthlyPayment: 0 };
  }

  const monthlyPrincipal = balance / remainingMonths;
  const interestComponent = balance * monthlyRate;
  const monthlyPayment = monthlyPrincipal + interestComponent;

  return { monthlyPrincipal, interestComponent, monthlyPayment };
}