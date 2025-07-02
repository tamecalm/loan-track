import { Logger } from '../core/logger';
import { LoanModel } from '../models/loan.model';

export interface OverviewAnalytics {
  totalLoans: number;
  activeLoans: number;
  paidLoans: number;
  overdueLoans: number;
  pendingLoans: number;
  totalDebt: number;
  totalInterest: number;
  overdueAmount: number;
  paidAmount: number;
  pendingAmount: number;
  averageLoanAmount: number;
  smallestLoan: number;
  largestLoan: number;
  paymentRate: number;
}

export interface MonthlyBreakdown {
  month: string;
  newLoans: number;
  totalAmount: number;
  paidLoans: number;
  overdueLoans: number;
  averageAmount: number;
}

export interface LenderAnalysis {
  name: string;
  totalLoans: number;
  totalAmount: number;
  paidLoans: number;
  overdueLoans: number;
  paymentRate: number;
  averageAmount: number;
  riskLevel: 'Low' | 'Medium' | 'High';
}

export interface InterestAnalysis {
  totalInterest: number;
  interestPercentage: number;
  averageRate: number;
  highestRate: number;
  lowestRate: number;
  loansWithInterest: number;
  interestLoanPercentage: number;
  potentialRevenue: number;
}

export interface PaymentTrend {
  period: string;
  payments: number;
  amount: number;
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
}

export interface RiskFactor {
  name: string;
  score: number;
  impact: string;
  recommendation: string;
}

export interface RiskAssessment {
  overallRisk: number;
  factors: RiskFactor[];
  summary: string;
}

export class AnalyticsService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  async generateOverviewAnalytics(
    loans: LoanModel[]
  ): Promise<OverviewAnalytics> {
    try {
      this.logger.info('Generating overview analytics', {
        loanCount: loans.length,
      });

      const totalLoans = loans.length;
      const paidLoans = loans.filter(loan => loan.isPaid).length;
      const overdueLoans = loans.filter(loan => loan.isOverdue()).length;
      const activeLoans = totalLoans - paidLoans;
      const pendingLoans = activeLoans - overdueLoans;

      const totalDebt = loans.reduce(
        (sum, loan) => sum + loan.calculateTotalWithInterest(),
        0
      );
      const totalInterest = loans.reduce((sum, loan) => {
        if (loan.interestRate) {
          return sum + (loan.amount * loan.interestRate) / 100;
        }
        return sum;
      }, 0);

      const overdueAmount = loans
        .filter(loan => loan.isOverdue())
        .reduce((sum, loan) => sum + loan.calculateTotalWithInterest(), 0);

      const paidAmount = loans
        .filter(loan => loan.isPaid)
        .reduce((sum, loan) => sum + loan.calculateTotalWithInterest(), 0);

      const pendingAmount = totalDebt - paidAmount - overdueAmount;

      const loanAmounts = loans.map(loan => loan.calculateTotalWithInterest());
      const averageLoanAmount = totalLoans > 0 ? totalDebt / totalLoans : 0;
      const smallestLoan =
        loanAmounts.length > 0 ? Math.min(...loanAmounts) : 0;
      const largestLoan = loanAmounts.length > 0 ? Math.max(...loanAmounts) : 0;

      const paymentRate = totalLoans > 0 ? (paidLoans / totalLoans) * 100 : 0;

      const analytics: OverviewAnalytics = {
        totalLoans,
        activeLoans,
        paidLoans,
        overdueLoans,
        pendingLoans,
        totalDebt,
        totalInterest,
        overdueAmount,
        paidAmount,
        pendingAmount,
        averageLoanAmount,
        smallestLoan,
        largestLoan,
        paymentRate,
      };

      this.logger.info('Overview analytics generated successfully', analytics);
      return analytics;
    } catch (error) {
      this.logger.error(
        'Failed to generate overview analytics',
        error as Error
      );
      throw error;
    }
  }

  async generateMonthlyBreakdown(
    loans: LoanModel[]
  ): Promise<MonthlyBreakdown[]> {
    try {
      this.logger.info('Generating monthly breakdown analytics');

      const monthlyData = new Map<
        string,
        {
          newLoans: number;
          totalAmount: number;
          paidLoans: number;
          overdueLoans: number;
        }
      >();

      // Get the last 12 months
      const months: string[] = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
        months.push(monthKey);
        monthlyData.set(monthKey, {
          newLoans: 0,
          totalAmount: 0,
          paidLoans: 0,
          overdueLoans: 0,
        });
      }

      // Process loans by repayment date month
      loans.forEach(loan => {
        const repaymentMonth = loan.repaymentDate.slice(0, 7);

        if (monthlyData.has(repaymentMonth)) {
          const data = monthlyData.get(repaymentMonth)!;
          data.newLoans++;
          data.totalAmount += loan.calculateTotalWithInterest();

          if (loan.isPaid) {
            data.paidLoans++;
          } else if (loan.isOverdue()) {
            data.overdueLoans++;
          }
        }
      });

      const breakdown: MonthlyBreakdown[] = months.map(month => {
        const data = monthlyData.get(month)!;
        const date = new Date(month + '-01');
        const monthName = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        });

        return {
          month: monthName,
          newLoans: data.newLoans,
          totalAmount: data.totalAmount,
          paidLoans: data.paidLoans,
          overdueLoans: data.overdueLoans,
          averageAmount:
            data.newLoans > 0 ? data.totalAmount / data.newLoans : 0,
        };
      });

      this.logger.info('Monthly breakdown generated successfully', {
        months: breakdown.length,
      });
      return breakdown;
    } catch (error) {
      this.logger.error('Failed to generate monthly breakdown', error as Error);
      throw error;
    }
  }

  async generateLenderAnalysis(loans: LoanModel[]): Promise<LenderAnalysis[]> {
    try {
      this.logger.info('Generating lender analysis');

      const lenderMap = new Map<
        string,
        {
          loans: LoanModel[];
          totalAmount: number;
          paidLoans: number;
          overdueLoans: number;
        }
      >();

      // Group loans by lender
      loans.forEach(loan => {
        if (!lenderMap.has(loan.lenderName)) {
          lenderMap.set(loan.lenderName, {
            loans: [],
            totalAmount: 0,
            paidLoans: 0,
            overdueLoans: 0,
          });
        }

        const lenderData = lenderMap.get(loan.lenderName)!;
        lenderData.loans.push(loan);
        lenderData.totalAmount += loan.calculateTotalWithInterest();

        if (loan.isPaid) {
          lenderData.paidLoans++;
        } else if (loan.isOverdue()) {
          lenderData.overdueLoans++;
        }
      });

      const analysis: LenderAnalysis[] = Array.from(lenderMap.entries()).map(
        ([name, data]) => {
          const totalLoans = data.loans.length;
          const paymentRate =
            totalLoans > 0 ? (data.paidLoans / totalLoans) * 100 : 0;
          const averageAmount =
            totalLoans > 0 ? data.totalAmount / totalLoans : 0;

          // Calculate risk level based on payment rate and overdue loans
          let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
          const overdueRate =
            totalLoans > 0 ? (data.overdueLoans / totalLoans) * 100 : 0;

          if (overdueRate > 50 || paymentRate < 30) {
            riskLevel = 'High';
          } else if (overdueRate > 20 || paymentRate < 60) {
            riskLevel = 'Medium';
          }

          return {
            name,
            totalLoans,
            totalAmount: data.totalAmount,
            paidLoans: data.paidLoans,
            overdueLoans: data.overdueLoans,
            paymentRate,
            averageAmount,
            riskLevel,
          };
        }
      );

      // Sort by total amount descending
      analysis.sort((a, b) => b.totalAmount - a.totalAmount);

      this.logger.info('Lender analysis generated successfully', {
        lenders: analysis.length,
      });
      return analysis;
    } catch (error) {
      this.logger.error('Failed to generate lender analysis', error as Error);
      throw error;
    }
  }

  async generateInterestAnalysis(
    loans: LoanModel[]
  ): Promise<InterestAnalysis> {
    try {
      this.logger.info('Generating interest analysis');

      const loansWithInterest = loans.filter(
        loan => loan.interestRate && loan.interestRate > 0
      );
      const totalInterest = loans.reduce((sum, loan) => {
        if (loan.interestRate) {
          return sum + (loan.amount * loan.interestRate) / 100;
        }
        return sum;
      }, 0);

      const totalPrincipal = loans.reduce((sum, loan) => sum + loan.amount, 0);
      const interestPercentage =
        totalPrincipal > 0 ? (totalInterest / totalPrincipal) * 100 : 0;

      const interestRates = loansWithInterest.map(loan => loan.interestRate!);
      const averageRate =
        interestRates.length > 0
          ? interestRates.reduce((sum, rate) => sum + rate, 0) /
            interestRates.length
          : 0;

      const highestRate =
        interestRates.length > 0 ? Math.max(...interestRates) : 0;
      const lowestRate =
        interestRates.length > 0 ? Math.min(...interestRates) : 0;

      const interestLoanPercentage =
        loans.length > 0 ? (loansWithInterest.length / loans.length) * 100 : 0;

      // Calculate potential revenue if all loans were paid with interest
      const potentialRevenue = loans.reduce(
        (sum, loan) => sum + loan.calculateTotalWithInterest(),
        0
      );

      const analysis: InterestAnalysis = {
        totalInterest,
        interestPercentage,
        averageRate,
        highestRate,
        lowestRate,
        loansWithInterest: loansWithInterest.length,
        interestLoanPercentage,
        potentialRevenue,
      };

      this.logger.info('Interest analysis generated successfully', analysis);
      return analysis;
    } catch (error) {
      this.logger.error('Failed to generate interest analysis', error as Error);
      throw error;
    }
  }

  async generatePaymentTrends(loans: LoanModel[]): Promise<PaymentTrend[]> {
    try {
      this.logger.info('Generating payment trends');

      const trends: PaymentTrend[] = [];
      const periods = [
        'Last 7 days',
        'Last 30 days',
        'Last 90 days',
        'Last 6 months',
        'Last year',
      ];
      const dayRanges = [7, 30, 90, 180, 365];

      for (let i = 0; i < periods.length; i++) {
        const period = periods[i];
        const days = dayRanges[i];

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const periodLoans = loans.filter(loan => {
          const repaymentDate = new Date(loan.repaymentDate);
          return repaymentDate >= cutoffDate && loan.isPaid;
        });

        const payments = periodLoans.length;
        const amount = periodLoans.reduce(
          (sum, loan) => sum + loan.calculateTotalWithInterest(),
          0
        );

        // Calculate trend compared to previous period
        let trend: 'up' | 'down' | 'stable' = 'stable';
        let changePercentage = 0;

        if (i > 0) {
          const prevPeriodDays = dayRanges[i - 1];
          const prevCutoffDate = new Date();
          prevCutoffDate.setDate(prevCutoffDate.getDate() - prevPeriodDays);

          const prevPeriodLoans = loans.filter(loan => {
            const repaymentDate = new Date(loan.repaymentDate);
            return repaymentDate >= prevCutoffDate && loan.isPaid;
          });

          const prevAmount = prevPeriodLoans.reduce(
            (sum, loan) => sum + loan.calculateTotalWithInterest(),
            0
          );

          if (prevAmount > 0) {
            changePercentage = ((amount - prevAmount) / prevAmount) * 100;
            if (changePercentage > 5) {
              trend = 'up';
            } else if (changePercentage < -5) {
              trend = 'down';
            }
          }
        }

        trends.push({
          period,
          payments,
          amount,
          trend,
          changePercentage: Math.abs(changePercentage),
        });
      }

      this.logger.info('Payment trends generated successfully', {
        trends: trends.length,
      });
      return trends;
    } catch (error) {
      this.logger.error('Failed to generate payment trends', error as Error);
      throw error;
    }
  }

  async generateRiskAssessment(loans: LoanModel[]): Promise<RiskAssessment> {
    try {
      this.logger.info('Generating risk assessment');

      const factors: RiskFactor[] = [];
      let totalRiskScore = 0;

      // Factor 1: Overdue Rate
      const overdueLoans = loans.filter(loan => loan.isOverdue()).length;
      const overdueRate =
        loans.length > 0 ? (overdueLoans / loans.length) * 100 : 0;
      const overdueScore = Math.min(overdueRate * 2, 100); // Scale to 0-100

      factors.push({
        name: 'Overdue Rate',
        score: overdueScore,
        impact: overdueRate > 30 ? 'High' : overdueRate > 15 ? 'Medium' : 'Low',
        recommendation:
          overdueRate > 30
            ? 'Immediate action required - contact overdue borrowers'
            : overdueRate > 15
              ? 'Monitor closely and follow up on overdue loans'
              : 'Maintain current collection practices',
      });

      // Factor 2: Concentration Risk (single lender dependency)
      const lenderMap = new Map<string, number>();
      loans.forEach(loan => {
        const current = lenderMap.get(loan.lenderName) || 0;
        lenderMap.set(
          loan.lenderName,
          current + loan.calculateTotalWithInterest()
        );
      });

      const totalDebt = loans.reduce(
        (sum, loan) => sum + loan.calculateTotalWithInterest(),
        0
      );
      const maxLenderExposure = Math.max(...Array.from(lenderMap.values()));
      const concentrationRate =
        totalDebt > 0 ? (maxLenderExposure / totalDebt) * 100 : 0;
      const concentrationScore =
        concentrationRate > 50 ? 80 : concentrationRate > 30 ? 50 : 20;

      factors.push({
        name: 'Concentration Risk',
        score: concentrationScore,
        impact:
          concentrationRate > 50
            ? 'High'
            : concentrationRate > 30
              ? 'Medium'
              : 'Low',
        recommendation:
          concentrationRate > 50
            ? 'Diversify lending portfolio to reduce single-lender dependency'
            : concentrationRate > 30
              ? 'Consider diversifying to reduce concentration risk'
              : 'Good diversification across lenders',
      });

      // Factor 3: Interest Rate Risk
      const loansWithInterest = loans.filter(
        loan => loan.interestRate && loan.interestRate > 0
      );
      const noInterestRate =
        loans.length > 0
          ? ((loans.length - loansWithInterest.length) / loans.length) * 100
          : 0;
      const interestRiskScore =
        noInterestRate > 70 ? 60 : noInterestRate > 40 ? 30 : 10;

      factors.push({
        name: 'Interest Rate Risk',
        score: interestRiskScore,
        impact:
          noInterestRate > 70
            ? 'Medium'
            : noInterestRate > 40
              ? 'Low'
              : 'Very Low',
        recommendation:
          noInterestRate > 70
            ? 'Consider implementing interest rates to improve returns'
            : noInterestRate > 40
              ? 'Review interest rate strategy for better profitability'
              : 'Good balance of interest-bearing loans',
      });

      // Factor 4: Payment Velocity
      const paidLoans = loans.filter(loan => loan.isPaid).length;
      const paymentRate =
        loans.length > 0 ? (paidLoans / loans.length) * 100 : 0;
      const velocityScore = paymentRate < 50 ? 70 : paymentRate < 70 ? 40 : 20;

      factors.push({
        name: 'Payment Velocity',
        score: velocityScore,
        impact: paymentRate < 50 ? 'High' : paymentRate < 70 ? 'Medium' : 'Low',
        recommendation:
          paymentRate < 50
            ? 'Improve collection processes and borrower communication'
            : paymentRate < 70
              ? 'Enhance payment reminders and follow-up procedures'
              : 'Excellent payment collection rate',
      });

      // Factor 5: Portfolio Size Risk
      const portfolioSize = loans.length;
      const sizeScore = portfolioSize < 5 ? 40 : portfolioSize < 10 ? 20 : 10;

      factors.push({
        name: 'Portfolio Size',
        score: sizeScore,
        impact:
          portfolioSize < 5
            ? 'Medium'
            : portfolioSize < 10
              ? 'Low'
              : 'Very Low',
        recommendation:
          portfolioSize < 5
            ? 'Consider expanding portfolio for better risk distribution'
            : portfolioSize < 10
              ? 'Good portfolio size, continue steady growth'
              : 'Well-diversified portfolio size',
      });

      // Calculate overall risk score (weighted average)
      const weights = [0.3, 0.25, 0.15, 0.2, 0.1]; // Weights for each factor
      totalRiskScore = factors.reduce((sum, factor, index) => {
        return sum + factor.score * weights[index];
      }, 0);

      // Generate summary
      let summary = '';
      if (totalRiskScore >= 70) {
        summary =
          'High risk portfolio requiring immediate attention. Focus on overdue collections and risk mitigation strategies.';
      } else if (totalRiskScore >= 40) {
        summary =
          'Moderate risk portfolio. Monitor key metrics closely and implement preventive measures.';
      } else {
        summary =
          'Low risk portfolio with good fundamentals. Maintain current practices and continue monitoring.';
      }

      const assessment: RiskAssessment = {
        overallRisk: Math.round(totalRiskScore),
        factors,
        summary,
      };

      this.logger.info('Risk assessment generated successfully', {
        overallRisk: assessment.overallRisk,
      });
      return assessment;
    } catch (error) {
      this.logger.error('Failed to generate risk assessment', error as Error);
      throw error;
    }
  }

  // Utility methods for advanced analytics

  async calculatePortfolioMetrics(loans: LoanModel[]): Promise<{
    totalValue: number;
    weightedAverageRate: number;
    portfolioYield: number;
    defaultRate: number;
    recoveryRate: number;
  }> {
    try {
      const totalValue = loans.reduce(
        (sum, loan) => sum + loan.calculateTotalWithInterest(),
        0
      );
      const totalPrincipal = loans.reduce((sum, loan) => sum + loan.amount, 0);

      // Weighted average interest rate
      let weightedRate = 0;
      if (totalPrincipal > 0) {
        weightedRate = loans.reduce((sum, loan) => {
          const weight = loan.amount / totalPrincipal;
          return sum + weight * (loan.interestRate || 0);
        }, 0);
      }

      // Portfolio yield (total interest / total principal)
      const totalInterest = totalValue - totalPrincipal;
      const portfolioYield =
        totalPrincipal > 0 ? (totalInterest / totalPrincipal) * 100 : 0;

      // Default rate (overdue loans / total loans)
      const overdueLoans = loans.filter(loan => loan.isOverdue()).length;
      const defaultRate =
        loans.length > 0 ? (overdueLoans / loans.length) * 100 : 0;

      // Recovery rate (paid loans / total loans)
      const paidLoans = loans.filter(loan => loan.isPaid).length;
      const recoveryRate =
        loans.length > 0 ? (paidLoans / loans.length) * 100 : 0;

      return {
        totalValue,
        weightedAverageRate: weightedRate,
        portfolioYield,
        defaultRate,
        recoveryRate,
      };
    } catch (error) {
      this.logger.error(
        'Failed to calculate portfolio metrics',
        error as Error
      );
      throw error;
    }
  }

  async generateCashFlowProjection(
    loans: LoanModel[],
    months: number = 12
  ): Promise<
    Array<{
      month: string;
      expectedInflow: number;
      overdueAmount: number;
      netCashFlow: number;
    }>
  > {
    try {
      const projections: Array<{
        month: string;
        expectedInflow: number;
        overdueAmount: number;
        netCashFlow: number;
      }> = [];

      for (let i = 0; i < months; i++) {
        const projectionDate = new Date();
        projectionDate.setMonth(projectionDate.getMonth() + i);

        const monthKey = projectionDate.toISOString().slice(0, 7);
        const monthName = projectionDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        });

        // Calculate expected inflows for this month
        const monthLoans = loans.filter(loan => {
          const repaymentMonth = loan.repaymentDate.slice(0, 7);
          return repaymentMonth === monthKey && !loan.isPaid;
        });

        const expectedInflow = monthLoans.reduce((sum, loan) => {
          // Apply probability of payment based on current status
          const paymentProbability = loan.isOverdue() ? 0.3 : 0.85;
          return sum + loan.calculateTotalWithInterest() * paymentProbability;
        }, 0);

        const overdueAmount = monthLoans
          .filter(loan => loan.isOverdue())
          .reduce((sum, loan) => sum + loan.calculateTotalWithInterest(), 0);

        const netCashFlow = expectedInflow - overdueAmount * 0.1; // Assume 10% collection cost

        projections.push({
          month: monthName,
          expectedInflow,
          overdueAmount,
          netCashFlow,
        });
      }

      return projections;
    } catch (error) {
      this.logger.error(
        'Failed to generate cash flow projection',
        error as Error
      );
      throw error;
    }
  }

  async generatePerformanceComparison(loans: LoanModel[]): Promise<{
    currentPeriod: any;
    previousPeriod: any;
    comparison: any;
  }> {
    try {
      const now = new Date();
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

      // Current period (last 3 months)
      const currentLoans = loans.filter(loan => {
        const repaymentDate = new Date(loan.repaymentDate);
        return repaymentDate >= threeMonthsAgo;
      });

      // Previous period (3-6 months ago)
      const previousLoans = loans.filter(loan => {
        const repaymentDate = new Date(loan.repaymentDate);
        return repaymentDate >= sixMonthsAgo && repaymentDate < threeMonthsAgo;
      });

      const currentMetrics = await this.calculatePortfolioMetrics(currentLoans);
      const previousMetrics =
        await this.calculatePortfolioMetrics(previousLoans);

      const comparison = {
        volumeChange: this.calculatePercentageChange(
          currentLoans.length,
          previousLoans.length
        ),
        valueChange: this.calculatePercentageChange(
          currentMetrics.totalValue,
          previousMetrics.totalValue
        ),
        yieldChange: this.calculatePercentageChange(
          currentMetrics.portfolioYield,
          previousMetrics.portfolioYield
        ),
        defaultRateChange: this.calculatePercentageChange(
          currentMetrics.defaultRate,
          previousMetrics.defaultRate
        ),
        recoveryRateChange: this.calculatePercentageChange(
          currentMetrics.recoveryRate,
          previousMetrics.recoveryRate
        ),
      };

      return {
        currentPeriod: {
          loans: currentLoans.length,
          metrics: currentMetrics,
        },
        previousPeriod: {
          loans: previousLoans.length,
          metrics: previousMetrics,
        },
        comparison,
      };
    } catch (error) {
      this.logger.error(
        'Failed to generate performance comparison',
        error as Error
      );
      throw error;
    }
  }

  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  // Export analytics data
  async exportAnalyticsData(loans: LoanModel[]): Promise<{
    overview: OverviewAnalytics;
    monthly: MonthlyBreakdown[];
    lenders: LenderAnalysis[];
    interest: InterestAnalysis;
    trends: PaymentTrend[];
    risk: RiskAssessment;
    exportTimestamp: string;
  }> {
    try {
      this.logger.info('Exporting comprehensive analytics data');

      const [overview, monthly, lenders, interest, trends, risk] =
        await Promise.all([
          this.generateOverviewAnalytics(loans),
          this.generateMonthlyBreakdown(loans),
          this.generateLenderAnalysis(loans),
          this.generateInterestAnalysis(loans),
          this.generatePaymentTrends(loans),
          this.generateRiskAssessment(loans),
        ]);

      const exportData = {
        overview,
        monthly,
        lenders,
        interest,
        trends,
        risk,
        exportTimestamp: new Date().toISOString(),
      };

      this.logger.info('Analytics data exported successfully');
      return exportData;
    } catch (error) {
      this.logger.error('Failed to export analytics data', error as Error);
      throw error;
    }
  }
}
