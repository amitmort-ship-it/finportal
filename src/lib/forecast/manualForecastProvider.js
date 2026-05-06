function toMonthlyRate(annualRate) {
  return (Number(annualRate) || 0) / 100 / 12;
}

function resolveAnnualValue(baseValue, annualDelta, monthNumber) {
  const yearOffset = Math.floor((monthNumber - 1) / 12);
  return (Number(baseValue) || 0) + (Number(annualDelta) || 0) * yearOffset;
}

export function createManualForecastCurve(config) {
  const horizonMonths = Math.max(1, Math.min(360, Math.round(config?.horizonMonths || 360)));
  const baseDate = config?.baseDate ? new Date(config.baseDate) : new Date();

  return Array.from({ length: horizonMonths }, (_, index) => {
    const monthNumber = index + 1;
    const annualBoiRate = resolveAnnualValue(config?.boiRate, config?.annualBoiDelta, monthNumber);
    const cpiAnnual = resolveAnnualValue(config?.cpiAnnual, config?.annualCpiDelta, monthNumber);
    const forecastDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + index, 1);

    return {
      monthNumber,
      forecastDate: forecastDate.toISOString().slice(0, 10),
      boiRate: annualBoiRate,
      primeRate: annualBoiRate + 1.5,
      cpiAnnual,
      cpiMonthly: toMonthlyRate(cpiAnnual),
      makamRate: Number(config?.makamRate || 0),
      govBondLinked1Y: Number(config?.govBondLinked1Y || 0),
      govBondLinked2Y: Number(config?.govBondLinked2Y || 0),
      govBondLinked5Y: Number(config?.govBondLinked5Y || 0),
      govBondLinked10Y: Number(config?.govBondLinked10Y || 0),
      govBondUnlinked1Y: Number(config?.govBondUnlinked1Y || 0),
      govBondUnlinked2Y: Number(config?.govBondUnlinked2Y || 0),
      govBondUnlinked5Y: Number(config?.govBondUnlinked5Y || 0),
      govBondUnlinked10Y: Number(config?.govBondUnlinked10Y || 0),
      avgMortgageLinked: Number(config?.govBondLinked5Y || 0) + 1,
      avgMortgageUnlinked: Number(config?.govBondUnlinked5Y || 0) + 1,
    };
  });
}
