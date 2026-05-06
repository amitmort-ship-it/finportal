export function calculateLinkedBalance(openingBalance, cpiMonthly) {
  const safeBalance = Number(openingBalance) || 0;
  const safeCpiMonthly = Number(cpiMonthly) || 0;
  const indexedOpeningBalance = safeBalance * (1 + safeCpiMonthly);
  const indexationAmount = indexedOpeningBalance - safeBalance;

  return {
    indexedOpeningBalance,
    indexationAmount,
  };
}
