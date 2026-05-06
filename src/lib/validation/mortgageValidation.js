export function validateMortgageSimulation({ simulation, forecast, tracks }) {
  const warnings = [];
  const requestedLoan = Number(simulation?.requestedLoanAmount || 0);
  const totalTracks = tracks.reduce((sum, track) => sum + (Number(track.principal) || 0), 0);

  if (requestedLoan && Math.abs(totalTracks - requestedLoan) > 1) {
    warnings.push('סכום המסלולים אינו שווה לסכום המשכנתא המבוקש.');
  }

  if (!Number(simulation?.client?.householdIncomeNet || 0)) {
    warnings.push('חסרים נתוני הכנסה נטו לחישוב יחס החזר.');
  }

  tracks.forEach((track) => {
    if (Number(track.termMonths || 0) > 360) {
      warnings.push(`${track.name}: התקופה עולה על 360 חודשים.`);
    }

    if (
      !['prime', 'variable_unlinked', 'variable_linked', 'makam'].includes(track.loanType) &&
      !Number(track.annualInterestRate || 0)
    ) {
      warnings.push(`${track.name}: חסרה ריבית שנתית.`);
    }

    if (
      ['variable_unlinked', 'variable_linked'].includes(track.loanType) &&
      (!track.anchorType || !Number(track.changeFrequencyMonths || 0))
    ) {
      warnings.push(`${track.name}: מסלול משתנה חייב עוגן ותדירות שינוי.`);
    }

    if (
      (track.loanType === 'fixed_linked' || track.loanType === 'variable_linked') &&
      !Number(forecast?.cpiAnnual || 0)
    ) {
      warnings.push(`${track.name}: מסלול צמוד מחייב תחזית מדד.`);
    }
  });

  return warnings;
}
