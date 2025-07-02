export interface LoanAnalytics {
  totalLoans: number;
  totalAmount: number;
  totalWithInterest: number;
  averageLoanAmount: number;
  averageInterestRate: number;
  paidLoans: number;
  pendingLoans: number;
  overdueLoans: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  totalInterestEarned: number;
  paymentRate: number;
  overdueRate: number;
}

export interface TimeSeriesData {
  date: string;
  totalLoans: number;
  totalAmount: number;
  paidLoans: number;
  overdueLoans: number;
  newLoans: number;
}

export interface LenderAnalytics {
  lenderName: string;
  phoneNumber: string;
  totalLoans: number;
  totalAmount: number;
  totalWithInterest: number;
  paidLoans: number;
  pendingLoans: number;
  overdueLoans: number;
  averageLoanAmount: number;
  averageInterestRate: number;
  paymentReliability: number;
  riskScore: number;
  lastLoanDate: string;
  firstLoanDate: string;
}

export interface MonthlyAnalytics {
  month: string;
  year: number;
  loansAdded: number;
  loansPaid: number;
  totalAmount: number;
  paidAmount: number;
  overdueAmount: number;
  averageAmount: number;
  interestEarned: number;
  paymentRate: number;
}

export interface InterestAnalytics {
  totalInterestExpected: number;
  totalInterestEarned: number;
  averageInterestRate: number;
  highestInterestRate: number;
  lowestInterestRate: number;
  loansWithInterest: number;
  loansWithoutInterest: number;
  interestByLender: Array<{
    lenderName: string;
    totalInterest: number;
    averageRate: number;
  }>;
}

export interface PaymentAnalytics {
  onTimePayments: number;
  latePayments: number;
  totalPayments: number;
  averageDaysLate: number;
  paymentTrends: Array<{
    month: string;
    onTime: number;
    late: number;
    rate: number;
  }>;
  paymentsByLender: Array<{
    lenderName: string;
    onTimeRate: number;
    averageDaysLate: number;
  }>;
}

export interface RiskAnalytics {
  lowRiskLoans: number;
  mediumRiskLoans: number;
  highRiskLoans: number;
  riskDistribution: Array<{
    riskLevel: 'low' | 'medium' | 'high';
    count: number;
    percentage: number;
    totalAmount: number;
  }>;
  riskFactors: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
}

export interface TrendAnalytics {
  loanVolumeGrowth: number;
  amountGrowth: number;
  paymentRateGrowth: number;
  overdueRateGrowth: number;
  monthlyTrends: Array<{
    month: string;
    loans: number;
    amount: number;
    growth: number;
  }>;
  seasonalPatterns: Array<{
    month: number;
    averageLoans: number;
    averageAmount: number;
    pattern: 'high' | 'medium' | 'low';
  }>;
}

export interface PortfolioAnalytics {
  diversification: {
    lenderCount: number;
    averageLoansPerLender: number;
    concentrationRisk: number;
    topLendersShare: number;
  };
  maturity: {
    shortTerm: number; // < 30 days
    mediumTerm: number; // 30-90 days
    longTerm: number; // > 90 days
    averageDays: number;
  };
  performance: {
    roi: number;
    defaultRate: number;
    recoveryRate: number;
    profitability: number;
  };
}

export interface ComparisonAnalytics {
  currentPeriod: LoanAnalytics;
  previousPeriod: LoanAnalytics;
  changes: {
    totalLoans: number;
    totalAmount: number;
    paymentRate: number;
    overdueRate: number;
    averageAmount: number;
  };
  percentageChanges: {
    totalLoans: number;
    totalAmount: number;
    paymentRate: number;
    overdueRate: number;
    averageAmount: number;
  };
}

export interface ForecastAnalytics {
  nextMonthPrediction: {
    expectedLoans: number;
    expectedAmount: number;
    expectedPayments: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  quarterlyForecast: Array<{
    quarter: string;
    expectedLoans: number;
    expectedAmount: number;
    confidence: number;
  }>;
  trends: {
    direction: 'increasing' | 'decreasing' | 'stable';
    strength: number;
    reliability: number;
  };
}

export interface AnalyticsFilter {
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  lenders?: string[];
  amountRange?: {
    min: number;
    max: number;
  };
  status?: ('paid' | 'pending' | 'overdue')[];
  interestRange?: {
    min: number;
    max: number;
  };
  includeInterest?: boolean;
}

export interface AnalyticsOptions {
  includeForecasts?: boolean;
  includeComparisons?: boolean;
  includeTrends?: boolean;
  includeRiskAnalysis?: boolean;
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  currency?: 'NGN' | 'USD' | 'EUR';
  precision?: number;
}

export interface AnalyticsExport {
  metadata: {
    generatedAt: string;
    period: string;
    filters: AnalyticsFilter;
    options: AnalyticsOptions;
  };
  summary: LoanAnalytics;
  detailed: {
    lenders: LenderAnalytics[];
    monthly: MonthlyAnalytics[];
    trends: TrendAnalytics;
    risks: RiskAnalytics;
    portfolio: PortfolioAnalytics;
  };
  charts: Array<{
    type: 'line' | 'bar' | 'pie' | 'area';
    title: string;
    data: any[];
    config: any;
  }>;
}

export interface AnalyticsAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  category: 'payment' | 'risk' | 'trend' | 'performance';
  title: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
  acknowledged: boolean;
  actions?: Array<{
    label: string;
    action: string;
  }>;
}

export interface AnalyticsInsight {
  id: string;
  type: 'positive' | 'negative' | 'neutral';
  category: 'performance' | 'risk' | 'opportunity' | 'trend';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  recommendations: string[];
  relatedMetrics: string[];
}

export interface AnalyticsDashboard {
  summary: LoanAnalytics;
  keyMetrics: Array<{
    label: string;
    value: number | string;
    change: number;
    trend: 'up' | 'down' | 'stable';
    format: 'currency' | 'percentage' | 'number';
  }>;
  charts: Array<{
    id: string;
    type: 'line' | 'bar' | 'pie' | 'area' | 'gauge';
    title: string;
    data: any[];
    height?: number;
    options?: any;
  }>;
  alerts: AnalyticsAlert[];
  insights: AnalyticsInsight[];
  lastUpdated: string;
}

export interface AnalyticsConfiguration {
  refreshInterval: number;
  alertThresholds: {
    overdueRate: number;
    paymentRate: number;
    riskScore: number;
    concentrationRisk: number;
  };
  defaultFilters: AnalyticsFilter;
  defaultOptions: AnalyticsOptions;
  chartPreferences: {
    colorScheme: string[];
    animations: boolean;
    responsive: boolean;
  };
}

export interface BenchmarkData {
  industry: {
    averagePaymentRate: number;
    averageOverdueRate: number;
    averageInterestRate: number;
    averageLoanAmount: number;
  };
  userPerformance: {
    paymentRate: number;
    overdueRate: number;
    interestRate: number;
    loanAmount: number;
  };
  comparison: {
    paymentRateVsIndustry: number;
    overdueRateVsIndustry: number;
    interestRateVsIndustry: number;
    loanAmountVsIndustry: number;
  };
  ranking: {
    paymentRate: number; // percentile
    overdueRate: number; // percentile
    overall: number; // percentile
  };
}

export interface AnalyticsQuery {
  type: 'summary' | 'detailed' | 'comparison' | 'forecast' | 'custom';
  filters: AnalyticsFilter;
  options: AnalyticsOptions;
  groupBy?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface AnalyticsResult<T = any> {
  success: boolean;
  data: T;
  metadata: {
    query: AnalyticsQuery;
    executionTime: number;
    recordCount: number;
    cacheHit: boolean;
  };
  error?: string;
}

export interface AnalyticsCache {
  key: string;
  data: any;
  timestamp: string;
  ttl: number;
  filters: AnalyticsFilter;
  options: AnalyticsOptions;
}

export interface AnalyticsEvent {
  type:
    | 'loan_added'
    | 'loan_paid'
    | 'loan_overdue'
    | 'loan_updated'
    | 'loan_deleted';
  timestamp: string;
  loanId: string;
  data: any;
  impact: {
    metrics: string[];
    recalculationRequired: boolean;
  };
}
