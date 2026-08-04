import assert from 'node:assert/strict';
import { calculateEmi, calculateFOIR, formatINR } from './calculator';

const expectedReducingBalanceEmi = (principal: number, annualRate: number, tenureMonths: number) => {
  if (annualRate === 0) return Math.round(principal / tenureMonths);
  const monthlyRate = annualRate / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  return Math.round((principal * monthlyRate * factor) / (factor - 1));
};

const verifySchedule = (principal: number, annualRate: number, tenureMonths: number) => {
  const result = calculateEmi(principal, annualRate, tenureMonths, 1.5);
  assert.equal(result.monthlyEmi, expectedReducingBalanceEmi(principal, annualRate, tenureMonths));
  assert.equal(result.schedule.length, tenureMonths);
  assert.equal(result.totalPayment, principal + result.totalInterest);
  assert.equal(result.processingFeeAmount, Math.round(principal * 1.5 / 100));
  assert.equal(result.netDisbursedAmount, principal - result.processingFeeAmount);

  let previousClosing = principal;
  let totalInterestFromRows = 0;
  result.schedule.forEach((row, index) => {
    assert.equal(row.openingPrincipal, Math.round(previousClosing), `row ${row.month} opening principal`);
    assert.equal(row.principalPayment, row.emi - row.interestPayment, `row ${row.month} principal = emi - interest`);
    assert.equal(row.closingPrincipal, Math.max(0, Math.round(row.openingPrincipal - row.principalPayment)), `row ${row.month} closing principal`);
    assert.ok(row.interestPayment >= 0, `row ${row.month} interest is non-negative`);
    assert.ok(row.principalPayment >= 0, `row ${row.month} principal is non-negative`);
    if (index < result.schedule.length - 1) {
      assert.equal(row.emi, result.monthlyEmi, `row ${row.month} standard EMI`);
    }
    previousClosing = row.closingPrincipal;
    totalInterestFromRows += row.interestPayment;
  });

  assert.ok(Math.abs(result.schedule.at(-1)!.closingPrincipal) <= 1, 'final closing principal is zero within rounding tolerance');
  assert.equal(totalInterestFromRows, result.totalInterest);
};

verifySchedule(500000, 6, 36);
verifySchedule(100000, 12, 12);
verifySchedule(1000000, 8.5, 60);
verifySchedule(25000, 6, 12);
verifySchedule(20000000, 16, 180);
verifySchedule(120000, 0, 12);

assert.deepEqual(calculateEmi(0, 6, 12).schedule, []);
assert.equal(calculateEmi(100000, -1, 12).monthlyEmi, 0);
assert.equal(calculateEmi(100000, 6, 0).monthlyEmi, 0);
assert.equal(calculateFOIR(60000, 10000, 15000), 42);
assert.equal(formatINR(1500000), '₹15,00,000');

console.log('calculator tests passed');
