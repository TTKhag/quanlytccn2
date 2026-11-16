import { differenceInDays } from 'date-fns';
import type { InterestPeriod } from '../types';

/**
 * Calculate simple interest for a period
 * 
 * Formula:
 * - Monthly rate: interest = principal × (rate/100) × (days / 30)
 * - Yearly rate:  interest = principal × (rate/100) × (days / 365)
 * 
 * @param principal - Số tiền gốc
 * @param rate - Lãi suất (%)
 * @param period - Chu kỳ (monthly/yearly)
 * @param startDate - Ngày bắt đầu tính lãi
 * @param endDate - Ngày kết thúc tính lãi
 * @returns Lãi phát sinh
 */
export const calculateSimpleInterest = (
  principal: number,
  rate: number,
  period: InterestPeriod,
  startDate: string,
  endDate: string
): number => {
  if (principal <= 0 || rate <= 0) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = differenceInDays(end, start);
  
  if (days <= 0) return 0;
  
  const divisor = period === 'monthly' ? 30 : 365;
  const interest = principal * (rate / 100) * (days / divisor);
  
  return Math.round(interest);
};

/**
 * Calculate accrued interest considering partial repayments
 * Each repayment period is calculated separately with remaining principal
 * 
 * @param principalHistory - Array of { date, principal } tracking principal changes
 * @param rate - Lãi suất (%)
 * @param period - Chu kỳ (monthly/yearly)
 * @param endDate - Ngày kết thúc tính lãi
 * @returns Total accrued interest
 */
export interface PrincipalChange {
  date: string;
  principal: number;
}

export const calculateAccruedInterest = (
  principalHistory: PrincipalChange[],
  rate: number,
  period: InterestPeriod,
  endDate: string
): number => {
  if (!principalHistory.length || rate <= 0) return 0;
  
  // Sort by date
  const sorted = [...principalHistory].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  let totalInterest = 0;
  
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i].date;
    const end = i + 1 < sorted.length ? sorted[i + 1].date : endDate;
    const principal = sorted[i].principal;
    
    if (principal > 0) {
      totalInterest += calculateSimpleInterest(principal, rate, period, start, end);
    }
  }
  
  return totalInterest;
};

/**
 * Get interest calculation details for display
 */
export interface InterestDetail {
  startDate: string;
  endDate: string;
  principal: number;
  days: number;
  rate: number;
  period: InterestPeriod;
  interest: number;
  formula: string;
}

export const getInterestDetails = (
  principalHistory: PrincipalChange[],
  rate: number,
  period: InterestPeriod,
  endDate: string
): InterestDetail[] => {
  if (!principalHistory.length || rate <= 0) return [];
  
  const sorted = [...principalHistory].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const details: InterestDetail[] = [];
  
  for (let i = 0; i < sorted.length; i++) {
    const startDate = sorted[i].date;
    const endDateCalc = i + 1 < sorted.length ? sorted[i + 1].date : endDate;
    const principal = sorted[i].principal;
    const days = differenceInDays(new Date(endDateCalc), new Date(startDate));
    
    if (principal > 0 && days > 0) {
      const divisor = period === 'monthly' ? 30 : 365;
      const interest = calculateSimpleInterest(principal, rate, period, startDate, endDateCalc);
      
      details.push({
        startDate,
        endDate: endDateCalc,
        principal,
        days,
        rate,
        period,
        interest,
        formula: `${principal.toLocaleString('vi-VN')} × ${rate}% × ${days}/${divisor} = ${interest.toLocaleString('vi-VN')}`,
      });
    }
  }
  
  return details;
};
