export interface LoanBase {
  id: string;
  lenderName: string;
  phoneNumber: string;
  amount: number;
  repaymentDate: string;
  interestRate?: number;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoanExtended extends LoanBase {
  totalWithInterest: number;
  daysUntilDue: number;
  daysOverdue: number;
  status: LoanStatus;
  riskLevel: RiskLevel;
  paymentHistory: PaymentRecord[];
  notes?: string;
  category?: LoanCategory;
  priority: LoanPriority;
  tags: string[];
}

export interface LoanCreateInput {
  lenderName: string;
  phoneNumber: string;
  amount: number;
  repaymentDate: string;
  interestRate?: number;
  notes?: string;
  category?: LoanCategory;
  priority?: LoanPriority;
  tags?: string[];
}

export interface LoanUpdateInput {
  lenderName?: string;
  phoneNumber?: string;
  amount?: number;
  repaymentDate?: string;
  interestRate?: number;
  notes?: string;
  category?: LoanCategory;
  priority?: LoanPriority;
  tags?: string[];
}

export interface LoanSearchCriteria {
  query?: string;
  lenderName?: string;
  phoneNumber?: string;
  amountRange?: {
    min: number;
    max: number;
  };
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  status?: LoanStatus[];
  category?: LoanCategory[];
  priority?: LoanPriority[];
  riskLevel?: RiskLevel[];
  tags?: string[];
  hasInterest?: boolean;
  sortBy?: LoanSortField;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface LoanFilterOptions {
  showPaid?: boolean;
  showOverdue?: boolean;
  showPending?: boolean;
  showUpcoming?: boolean;
  dateFilter?: 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  amountFilter?: 'all' | 'small' | 'medium' | 'large' | 'custom';
  interestFilter?: 'all' | 'with-interest' | 'without-interest' | 'high-interest';
  riskFilter?: 'all' | 'low' | 'medium' | 'high';
  categoryFilter?: LoanCategory[];
  priorityFilter?: LoanPriority[];
}

export interface LoanSummary {
  totalLoans: number;
  totalAmount: number;
  totalWithInterest: number;
  paidLoans: number;
  pendingLoans: number;
  overdueLoans: number;
  upcomingLoans: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  averageLoanAmount: number;
  averageInterestRate: number;
  totalInterestExpected: number;
  totalInterestEarned: number;
}

export interface LoanStatistics {
  byStatus: Record<LoanStatus, number>;
  byCategory: Record<LoanCategory, number>;
  byPriority: Record<LoanPriority, number>;
  byRiskLevel: Record<RiskLevel, number>;
  byMonth: Array<{
    month: string;
    count: number;
    amount: number;
  }>;
  byLender: Array<{
    lenderName: string;
    count: number;
    totalAmount: number;
    averageAmount: number;
  }>;
  paymentTrends: Array<{
    period: string;
    onTime: number;
    late: number;
    rate: number;
  }>;
}

export interface PaymentRecord {
  id: string;
  loanId: string;
  amount: number;
  paymentDate: string;
  method?: PaymentMethod;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface LoanReminder {
  id: string;
  loanId: string;
  type: ReminderType;
  scheduledDate: string;
  message: string;
  isActive: boolean;
  isSent: boolean;
  sentAt?: string;
  createdAt: string;
}

export interface LoanTemplate {
  id: string;
  name: string;
  description?: string;
  lenderName?: string;
  phoneNumber?: string;
  amount?: number;
  interestRate?: number;
  defaultDays?: number;
  category?: LoanCategory;
  priority?: LoanPriority;
  tags?: string[];
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoanBatch {
  id: string;
  name: string;
  description?: string;
  loans: LoanCreateInput[];
  status: BatchStatus;
  totalLoans: number;
  processedLoans: number;
  failedLoans: number;
  errors: string[];
  createdAt: string;
  processedAt?: string;
}

export interface LoanExportOptions {
  format: ExportFormat;
  includeFields: LoanField[];
  filters: LoanFilterOptions;
  groupBy?: LoanGroupBy;
  sortBy?: LoanSortField;
  sortOrder?: 'asc' | 'desc';
  includeMetadata?: boolean;
  includeStatistics?: boolean;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export interface LoanImportOptions {
  format: ImportFormat;
  mapping: Record<string, string>;
  skipDuplicates?: boolean;
  validateData?: boolean;
  createTemplate?: boolean;
  templateName?: string;
}

export interface LoanImportResult {
  success: boolean;
  totalRecords: number;
  importedRecords: number;
  skippedRecords: number;
  failedRecords: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  duplicates: Array<{
    row: number;
    existingLoanId: string;
    reason: string;
  }>;
}

export interface LoanBackup {
  id: string;
  timestamp: string;
  type: BackupType;
  loans: LoanBase[];
  metadata: {
    version: string;
    totalLoans: number;
    totalAmount: number;
    checksum: string;
  };
  compressed: boolean;
  encrypted: boolean;
}

export interface LoanAuditLog {
  id: string;
  loanId: string;
  action: AuditAction;
  oldValues?: Partial<LoanBase>;
  newValues?: Partial<LoanBase>;
  userId?: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
}

export interface LoanNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  loanId?: string;
  priority: NotificationPriority;
  isRead: boolean;
  isArchived: boolean;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

export interface LoanConfiguration {
  defaultInterestRate?: number;
  defaultRepaymentDays?: number;
  defaultCategory?: LoanCategory;
  defaultPriority?: LoanPriority;
  autoReminders: boolean;
  reminderDays: number[];
  riskThresholds: {
    lowRisk: number;
    mediumRisk: number;
    highRisk: number;
  };
  amountThresholds: {
    small: number;
    medium: number;
    large: number;
  };
  currencySettings: {
    code: string;
    symbol: string;
    decimals: number;
    thousandsSeparator: string;
    decimalSeparator: string;
  };
  dateFormat: string;
  timeZone: string;
}

export interface LoanValidationRules {
  lenderName: {
    minLength: number;
    maxLength: number;
    pattern?: RegExp;
    required: boolean;
  };
  phoneNumber: {
    minLength: number;
    maxLength: number;
    pattern?: RegExp;
    required: boolean;
  };
  amount: {
    min: number;
    max: number;
    required: boolean;
    allowDecimals: boolean;
  };
  interestRate: {
    min: number;
    max: number;
    required: boolean;
    allowDecimals: boolean;
  };
  repaymentDate: {
    required: boolean;
    allowPastDates: boolean;
    maxFutureDays: number;
  };
}

export interface LoanMetrics {
  performance: {
    paymentRate: number;
    overdueRate: number;
    averageDaysToPayment: number;
    recoveryRate: number;
  };
  financial: {
    totalPortfolioValue: number;
    totalInterestEarned: number;
    averageROI: number;
    riskAdjustedReturn: number;
  };
  operational: {
    averageProcessingTime: number;
    dataQualityScore: number;
    systemUptime: number;
    errorRate: number;
  };
  trends: {
    volumeGrowth: number;
    amountGrowth: number;
    qualityImprovement: number;
    efficiencyGains: number;
  };
}

// ==================== ENUMS ====================

export enum LoanStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  PARTIALLY_PAID = 'partially_paid',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum LoanCategory {
  PERSONAL = 'personal',
  BUSINESS = 'business',
  EMERGENCY = 'emergency',
  INVESTMENT = 'investment',
  EDUCATION = 'education',
  MEDICAL = 'medical',
  FAMILY = 'family',
  OTHER = 'other'
}

export enum LoanPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  MOBILE_MONEY = 'mobile_money',
  CHECK = 'check',
  CARD = 'card',
  CRYPTO = 'crypto',
  OTHER = 'other'
}

export enum ReminderType {
  DUE_SOON = 'due_soon',
  OVERDUE = 'overdue',
  PAYMENT_RECEIVED = 'payment_received',
  CUSTOM = 'custom'
}

export enum BatchStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  PDF = 'pdf',
  EXCEL = 'excel',
  TXT = 'txt',
  HTML = 'html'
}

export enum ImportFormat {
  CSV = 'csv',
  JSON = 'json',
  EXCEL = 'excel',
  TXT = 'txt'
}

export enum LoanField {
  ID = 'id',
  LENDER_NAME = 'lenderName',
  PHONE_NUMBER = 'phoneNumber',
  AMOUNT = 'amount',
  INTEREST_RATE = 'interestRate',
  TOTAL_WITH_INTEREST = 'totalWithInterest',
  REPAYMENT_DATE = 'repaymentDate',
  STATUS = 'status',
  RISK_LEVEL = 'riskLevel',
  CATEGORY = 'category',
  PRIORITY = 'priority',
  TAGS = 'tags',
  NOTES = 'notes',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  DAYS_UNTIL_DUE = 'daysUntilDue',
  DAYS_OVERDUE = 'daysOverdue'
}

export enum LoanSortField {
  LENDER_NAME = 'lenderName',
  AMOUNT = 'amount',
  TOTAL_WITH_INTEREST = 'totalWithInterest',
  REPAYMENT_DATE = 'repaymentDate',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  STATUS = 'status',
  RISK_LEVEL = 'riskLevel',
  PRIORITY = 'priority',
  DAYS_UNTIL_DUE = 'daysUntilDue',
  DAYS_OVERDUE = 'daysOverdue'
}

export enum LoanGroupBy {
  STATUS = 'status',
  CATEGORY = 'category',
  PRIORITY = 'priority',
  RISK_LEVEL = 'riskLevel',
  LENDER = 'lender',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

export enum BackupType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  LOANS_ONLY = 'loans_only',
  METADATA_ONLY = 'metadata_only'
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MARK_PAID = 'mark_paid',
  RESCHEDULE = 'reschedule',
  CANCEL = 'cancel',
  RESTORE = 'restore',
  EXPORT = 'export',
  IMPORT = 'import'
}

export enum NotificationType {
  LOAN_DUE = 'loan_due',
  LOAN_OVERDUE = 'loan_overdue',
  PAYMENT_RECEIVED = 'payment_received',
  SYSTEM_ALERT = 'system_alert',
  REMINDER = 'reminder',
  WARNING = 'warning',
  INFO = 'info'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// ==================== TYPE GUARDS ====================

export function isLoanStatus(value: string): value is LoanStatus {
  return Object.values(LoanStatus).includes(value as LoanStatus);
}

export function isRiskLevel(value: string): value is RiskLevel {
  return Object.values(RiskLevel).includes(value as RiskLevel);
}

export function isLoanCategory(value: string): value is LoanCategory {
  return Object.values(LoanCategory).includes(value as LoanCategory);
}

export function isLoanPriority(value: string): value is LoanPriority {
  return Object.values(LoanPriority).includes(value as LoanPriority);
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return Object.values(PaymentMethod).includes(value as PaymentMethod);
}

export function isExportFormat(value: string): value is ExportFormat {
  return Object.values(ExportFormat).includes(value as ExportFormat);
}

export function isImportFormat(value: string): value is ImportFormat {
  return Object.values(ImportFormat).includes(value as ImportFormat);
}

// ==================== UTILITY TYPES ====================

export type LoanStatusCount = Record<LoanStatus, number>;
export type LoanCategoryCount = Record<LoanCategory, number>;
export type LoanPriorityCount = Record<LoanPriority, number>;
export type RiskLevelCount = Record<RiskLevel, number>;

export type LoanFieldValue<T extends LoanField> = 
  T extends LoanField.ID ? string :
  T extends LoanField.LENDER_NAME ? string :
  T extends LoanField.PHONE_NUMBER ? string :
  T extends LoanField.AMOUNT ? number :
  T extends LoanField.INTEREST_RATE ? number | undefined :
  T extends LoanField.TOTAL_WITH_INTEREST ? number :
  T extends LoanField.REPAYMENT_DATE ? string :
  T extends LoanField.STATUS ? LoanStatus :
  T extends LoanField.RISK_LEVEL ? RiskLevel :
  T extends LoanField.CATEGORY ? LoanCategory | undefined :
  T extends LoanField.PRIORITY ? LoanPriority :
  T extends LoanField.TAGS ? string[] :
  T extends LoanField.NOTES ? string | undefined :
  T extends LoanField.CREATED_AT ? string :
  T extends LoanField.UPDATED_AT ? string :
  T extends LoanField.DAYS_UNTIL_DUE ? number :
  T extends LoanField.DAYS_OVERDUE ? number :
  unknown;

export type PartialLoan = Partial<LoanBase>;
export type RequiredLoanFields = Pick<LoanBase, 'lenderName' | 'phoneNumber' | 'amount' | 'repaymentDate'>;
export type OptionalLoanFields = Omit<LoanBase, keyof RequiredLoanFields | 'id' | 'isPaid' | 'createdAt' | 'updatedAt'>;

export type LoanWithCalculatedFields = LoanBase & {
  totalWithInterest: number;
  daysUntilDue: number;
  daysOverdue: number;
  status: LoanStatus;
  riskLevel: RiskLevel;
};

export type LoanSearchResult = {
  loans: LoanWithCalculatedFields[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
};

export type LoanOperationResult<T = LoanBase> = {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
};

export type LoanBatchOperationResult = {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  results: LoanOperationResult[];
  errors: string[];
  warnings: string[];
};

// ==================== ADVANCED TYPES ====================

export interface LoanRelationship {
  id: string;
  primaryLoanId: string;
  relatedLoanId: string;
  relationshipType: 'refinance' | 'consolidation' | 'split' | 'renewal' | 'related';
  description?: string;
  createdAt: string;
}

export interface LoanDocument {
  id: string;
  loanId: string;
  name: string;
  type: 'agreement' | 'receipt' | 'id_copy' | 'collateral' | 'other';
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface LoanCollateral {
  id: string;
  loanId: string;
  type: 'property' | 'vehicle' | 'jewelry' | 'electronics' | 'documents' | 'other';
  description: string;
  estimatedValue: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoanGuarantor {
  id: string;
  loanId: string;
  name: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  relationship: string;
  guaranteeAmount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoanSchedule {
  id: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  paidDate?: string;
  notes?: string;
}

export interface LoanWorkflow {
  id: string;
  name: string;
  description?: string;
  steps: LoanWorkflowStep[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoanWorkflowStep {
  id: string;
  workflowId: string;
  stepNumber: number;
  name: string;
  description?: string;
  action: 'create_loan' | 'send_reminder' | 'mark_overdue' | 'generate_report' | 'custom';
  conditions: LoanWorkflowCondition[];
  parameters: Record<string, any>;
  isRequired: boolean;
}

export interface LoanWorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains';
  value: any;
  logicalOperator?: 'and' | 'or';
}

export interface LoanReport {
  id: string;
  name: string;
  type: 'summary' | 'detailed' | 'analytics' | 'compliance' | 'custom';
  parameters: LoanReportParameters;
  schedule?: LoanReportSchedule;
  format: ExportFormat;
  recipients: string[];
  isActive: boolean;
  lastGenerated?: string;
  nextGeneration?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoanReportParameters {
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  filters: LoanFilterOptions;
  groupBy?: LoanGroupBy[];
  includeCharts: boolean;
  includeStatistics: boolean;
  customFields?: string[];
}

export interface LoanReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  timezone: string;
}

export interface LoanIntegration {
  id: string;
  name: string;
  type: 'bank' | 'payment_gateway' | 'sms' | 'email' | 'accounting' | 'crm' | 'other';
  provider: string;
  configuration: Record<string, any>;
  isActive: boolean;
  lastSync?: string;
  syncStatus: 'success' | 'error' | 'pending' | 'disabled';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoanAPIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  warnings?: string[];
  metadata?: {
    timestamp: string;
    version: string;
    requestId: string;
    executionTime: number;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface LoanWebhook {
  id: string;
  url: string;
  events: LoanWebhookEvent[];
  secret?: string;
  isActive: boolean;
  retryCount: number;
  maxRetries: number;
  timeout: number;
  lastTriggered?: string;
  lastStatus?: 'success' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export enum LoanWebhookEvent {
  LOAN_CREATED = 'loan.created',
  LOAN_UPDATED = 'loan.updated',
  LOAN_DELETED = 'loan.deleted',
  LOAN_PAID = 'loan.paid',
  LOAN_OVERDUE = 'loan.overdue',
  PAYMENT_RECEIVED = 'payment.received',
  REMINDER_SENT = 'reminder.sent'
}

export interface LoanWebhookPayload {
  event: LoanWebhookEvent;
  timestamp: string;
  data: {
    loan: LoanBase;
    changes?: Partial<LoanBase>;
    payment?: PaymentRecord;
    reminder?: LoanReminder;
  };
  metadata: {
    version: string;
    requestId: string;
    signature?: string;
  };
}
