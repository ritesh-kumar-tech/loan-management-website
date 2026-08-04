export interface AmortizationRow {
  month: number;
  openingPrincipal: number;
  emi: number;
  principalPayment: number;
  interestPayment: number;
  closingPrincipal: number;
}

export interface EmiCalculationResult {
  monthlyEmi: number;
  totalInterest: number;
  totalPayment: number;
  processingFeeAmount: number;
  netDisbursedAmount: number;
  schedule: AmortizationRow[];
}

/**
 * Calculates Reducing Balance EMI and detailed Amortization Schedule.
 * P = Principal
 * annualRate = Annual Interest Rate in %
 * tenureMonths = Tenure in months
 * processingFeePercent = Fee in %
 */
export function calculateEmi(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  processingFeePercent: number = 1.5
): EmiCalculationResult {
  if (principal <= 0 || annualRate < 0 || tenureMonths <= 0) {
    return {
      monthlyEmi: 0,
      totalInterest: 0,
      totalPayment: 0,
      processingFeeAmount: 0,
      netDisbursedAmount: 0,
      schedule: [],
    };
  }

  const monthlyRate = annualRate / 12 / 100;
  const monthlyEmi = monthlyRate === 0
    ? Math.round(principal / tenureMonths)
    : (() => {
        const factor = Math.pow(1 + monthlyRate, tenureMonths);
        return Math.round((principal * monthlyRate * factor) / (factor - 1));
      })();

  let currentPrincipal = principal;
  let totalInterest = 0;
  const schedule: AmortizationRow[] = [];

  for (let m = 1; m <= tenureMonths; m++) {
    const interestPayment = Math.round(currentPrincipal * monthlyRate);
    let principalPayment = monthlyEmi - interestPayment;
    
    // Adjust for final month rounding
    if (m === tenureMonths || currentPrincipal - principalPayment < 0) {
      principalPayment = currentPrincipal;
    }

    const closingPrincipal = Math.max(0, currentPrincipal - principalPayment);
    totalInterest += interestPayment;

    schedule.push({
      month: m,
      openingPrincipal: Math.round(currentPrincipal),
      emi: Math.round(principalPayment + interestPayment),
      principalPayment: Math.round(principalPayment),
      interestPayment: Math.round(interestPayment),
      closingPrincipal: Math.round(closingPrincipal),
    });

    currentPrincipal = closingPrincipal;
  }

  const totalPayment = principal + totalInterest;
  const processingFeeAmount = Math.round((principal * processingFeePercent) / 100);
  const netDisbursedAmount = principal - processingFeeAmount;

  return {
    monthlyEmi,
    totalInterest,
    totalPayment,
    processingFeeAmount,
    netDisbursedAmount,
    schedule,
  };
}

/**
 * Calculates FOIR (Fixed Obligation to Income Ratio)
 */
export function calculateFOIR(
  monthlyIncome: number,
  existingEmis: number,
  proposedEmi: number
): number {
  if (monthlyIncome <= 0) return 100;
  return Math.round(((existingEmis + proposedEmi) / monthlyIncome) * 100);
}

/**
 * Formats a number to Indian Rupees format (e.g. ₹2,50,000)
 */
export function formatINR(amount: number): string {
  if (isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats date to Indian standard DD/MM/YYYY
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
