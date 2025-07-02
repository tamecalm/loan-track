import { Logger } from '../core/logger';
import { Loan } from '../interfaces/loan.interface';

export interface ValidationRule {
  field: string;
  message: string;
  validator: (value: any) => boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface LoanValidationOptions {
  strictMode?: boolean;
  allowFutureDates?: boolean;
  maxAmount?: number;
  minAmount?: number;
  requiredFields?: string[];
}

export class ValidationService {
  private logger: Logger;
  private defaultRules: ValidationRule[];

  constructor() {
    this.logger = new Logger();
    this.defaultRules = this.initializeDefaultRules();
  }

  // ==================== LOAN VALIDATION ====================

  validateLoan(
    loanData: Partial<Loan>,
    options: LoanValidationOptions = {}
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Required field validation
      const requiredFields = options.requiredFields || [
        'lenderName',
        'phoneNumber',
        'amount',
        'repaymentDate',
      ];

      for (const field of requiredFields) {
        if (
          !loanData[field as keyof Loan] ||
          loanData[field as keyof Loan] === ''
        ) {
          errors.push(`${this.formatFieldName(field)} is required`);
        }
      }

      // Lender name validation
      if (loanData.lenderName) {
        const nameValidation = this.validateLenderName(loanData.lenderName);
        if (!nameValidation.isValid) {
          errors.push(...nameValidation.errors);
        }
        warnings.push(...nameValidation.warnings);
      }

      // Phone number validation
      if (loanData.phoneNumber) {
        const phoneValidation = this.validatePhoneNumber(loanData.phoneNumber);
        if (!phoneValidation.isValid) {
          errors.push(...phoneValidation.errors);
        }
        warnings.push(...phoneValidation.warnings);
      }

      // Amount validation
      if (loanData.amount !== undefined) {
        const amountValidation = this.validateAmount(loanData.amount, options);
        if (!amountValidation.isValid) {
          errors.push(...amountValidation.errors);
        }
        warnings.push(...amountValidation.warnings);
      }

      // Date validation
      if (loanData.repaymentDate) {
        const dateValidation = this.validateRepaymentDate(
          loanData.repaymentDate,
          options
        );
        if (!dateValidation.isValid) {
          errors.push(...dateValidation.errors);
        }
        warnings.push(...dateValidation.warnings);
      }

      // Interest rate validation
      if (loanData.interestRate !== undefined) {
        const interestValidation = this.validateInterestRate(
          loanData.interestRate
        );
        if (!interestValidation.isValid) {
          errors.push(...interestValidation.errors);
        }
        warnings.push(...interestValidation.warnings);
      }

      // Business logic validation
      const businessValidation = this.validateBusinessRules(loanData, options);
      errors.push(...businessValidation.errors);
      warnings.push(...businessValidation.warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      this.logger.error('Validation error', error as Error);
      return {
        isValid: false,
        errors: ['An error occurred during validation'],
        warnings: [],
      };
    }
  }

  validateLenderName(name: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic checks
    if (!name || typeof name !== 'string') {
      errors.push('Lender name must be a valid string');
      return { isValid: false, errors, warnings };
    }

    const trimmedName = name.trim();

    // Length validation
    if (trimmedName.length < 2) {
      errors.push('Lender name must be at least 2 characters long');
    }

    if (trimmedName.length > 50) {
      errors.push('Lender name cannot exceed 50 characters');
    }

    // Character validation
    if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) {
      errors.push(
        'Lender name can only contain letters, spaces, hyphens, and apostrophes'
      );
    }

    // Pattern validation
    if (/^\s+|\s+$/.test(name)) {
      warnings.push('Lender name has leading or trailing spaces');
    }

    if (/\s{2,}/.test(trimmedName)) {
      warnings.push('Lender name contains multiple consecutive spaces');
    }

    // Common issues
    if (/^\d+$/.test(trimmedName)) {
      errors.push('Lender name cannot be only numbers');
    }

    if (
      trimmedName.toLowerCase() === 'unknown' ||
      trimmedName.toLowerCase() === 'n/a'
    ) {
      warnings.push('Consider using a more specific lender name');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validatePhoneNumber(phone: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!phone || typeof phone !== 'string') {
      errors.push('Phone number must be a valid string');
      return { isValid: false, errors, warnings };
    }

    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Length validation
    if (cleanPhone.length < 10) {
      errors.push('Phone number must be at least 10 digits');
    }

    if (cleanPhone.length > 15) {
      errors.push('Phone number cannot exceed 15 digits');
    }

    // Format validation
    if (!/^[\+]?[\d\s\-\(\)]+$/.test(phone)) {
      errors.push('Phone number contains invalid characters');
    }

    // Nigerian phone number specific validation
    if (cleanPhone.startsWith('234') || cleanPhone.startsWith('+234')) {
      const nigerianNumber = cleanPhone.replace(/^\+?234/, '');
      if (nigerianNumber.length !== 10) {
        warnings.push(
          'Nigerian phone number should have 10 digits after country code'
        );
      }

      if (!nigerianNumber.match(/^[789]/)) {
        warnings.push(
          'Nigerian mobile numbers typically start with 7, 8, or 9'
        );
      }
    }

    // International format validation
    if (phone.startsWith('+')) {
      if (cleanPhone.length < 12) {
        warnings.push('International phone numbers are typically longer');
      }
    } else if (!phone.startsWith('0') && cleanPhone.length === 10) {
      warnings.push('Consider adding country code or leading zero');
    }

    // Pattern warnings
    if (/^(\d)\1+$/.test(cleanPhone)) {
      warnings.push('Phone number appears to be all the same digit');
    }

    if (cleanPhone === '1234567890' || cleanPhone === '0123456789') {
      warnings.push('Phone number appears to be a placeholder');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateAmount(
    amount: number,
    options: LoanValidationOptions = {}
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Type validation
    if (typeof amount !== 'number' || isNaN(amount)) {
      errors.push('Amount must be a valid number');
      return { isValid: false, errors, warnings };
    }

    // Basic range validation
    if (amount <= 0) {
      errors.push('Amount must be greater than zero');
    }

    // Custom range validation
    const minAmount = options.minAmount || 100;
    const maxAmount = options.maxAmount || 10000000; // 10 million default

    if (amount < minAmount) {
      errors.push(`Amount must be at least ₦${minAmount.toLocaleString()}`);
    }

    if (amount > maxAmount) {
      errors.push(`Amount cannot exceed ₦${maxAmount.toLocaleString()}`);
    }

    // Decimal validation
    if (amount % 1 !== 0) {
      warnings.push('Amount contains decimal places - will be rounded');
    }

    // Practical warnings
    if (amount < 1000) {
      warnings.push('Very small loan amount - consider if this is correct');
    }

    if (amount > 1000000) {
      warnings.push('Large loan amount - ensure this is accurate');
    }

    // Suspicious patterns
    if (amount.toString().match(/^(\d)\1+$/)) {
      warnings.push('Amount appears to be repeated digits (e.g., 1111)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateRepaymentDate(
    dateString: string,
    options: LoanValidationOptions = {}
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!dateString || typeof dateString !== 'string') {
      errors.push('Repayment date must be a valid string');
      return { isValid: false, errors, warnings };
    }

    // Parse date
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      errors.push('Repayment date is not a valid date');
      return { isValid: false, errors, warnings };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const repaymentDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    // Future date validation
    if (options.allowFutureDates !== false) {
      if (repaymentDate < today) {
        errors.push('Repayment date cannot be in the past');
      }
    }

    // Reasonable timeframe validation
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    const fiveYearsFromNow = new Date();
    fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);

    if (repaymentDate > fiveYearsFromNow) {
      warnings.push('Repayment date is more than 5 years in the future');
    }

    // Short-term warnings
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (repaymentDate <= tomorrow) {
      warnings.push('Repayment date is very soon - ensure this is correct');
    }

    // Weekend warnings
    const dayOfWeek = repaymentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      warnings.push('Repayment date falls on a weekend');
    }

    // Holiday warnings (basic check for common dates)
    const month = repaymentDate.getMonth() + 1;
    const day = repaymentDate.getDate();

    if ((month === 12 && day === 25) || (month === 1 && day === 1)) {
      warnings.push('Repayment date falls on a major holiday');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateInterestRate(rate: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Type validation
    if (typeof rate !== 'number' || isNaN(rate)) {
      errors.push('Interest rate must be a valid number');
      return { isValid: false, errors, warnings };
    }

    // Range validation
    if (rate < 0) {
      errors.push('Interest rate cannot be negative');
    }

    if (rate > 100) {
      errors.push('Interest rate cannot exceed 100%');
    }

    // Practical warnings
    if (rate === 0) {
      warnings.push('Zero interest rate - confirm this is intentional');
    }

    if (rate > 50) {
      warnings.push('Very high interest rate - ensure this is correct');
    }

    if (rate < 1 && rate > 0) {
      warnings.push('Very low interest rate - confirm this is correct');
    }

    // Decimal precision
    if (rate % 0.01 !== 0) {
      warnings.push('Interest rate has more than 2 decimal places');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ==================== BUSINESS RULES VALIDATION ====================

  validateBusinessRules(
    loanData: Partial<Loan>,
    options: LoanValidationOptions = {}
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Amount vs Interest relationship
    if (loanData.amount && loanData.interestRate) {
      const totalWithInterest =
        loanData.amount + (loanData.amount * loanData.interestRate) / 100;

      if (totalWithInterest > 50000000) {
        // 50 million
        warnings.push('Total amount with interest is very large');
      }
    }

    // Date vs Amount relationship
    if (loanData.amount && loanData.repaymentDate) {
      const repaymentDate = new Date(loanData.repaymentDate);
      const now = new Date();
      const daysUntilRepayment = Math.ceil(
        (repaymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (loanData.amount > 100000 && daysUntilRepayment < 7) {
        warnings.push('Large loan amount with very short repayment period');
      }

      if (loanData.amount < 1000 && daysUntilRepayment > 365) {
        warnings.push('Small loan amount with very long repayment period');
      }
    }

    // Strict mode validations
    if (options.strictMode) {
      if (loanData.lenderName && loanData.lenderName.length < 3) {
        errors.push(
          'In strict mode, lender name must be at least 3 characters'
        );
      }

      if (loanData.amount && loanData.amount < 500) {
        errors.push('In strict mode, minimum loan amount is ₦500');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ==================== BATCH VALIDATION ====================

  validateLoanBatch(
    loans: Partial<Loan>[],
    options: LoanValidationOptions = {}
  ): ValidationResult[] {
    return loans.map((loan, index) => {
      const result = this.validateLoan(loan, options);

      // Add index information to errors
      result.errors = result.errors.map(error => `Loan ${index + 1}: ${error}`);
      result.warnings = result.warnings.map(
        warning => `Loan ${index + 1}: ${warning}`
      );

      return result;
    });
  }

  validateForDuplicates(loans: Partial<Loan>[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate phone numbers
    const phoneNumbers = loans.map(loan => loan.phoneNumber).filter(Boolean);
    const duplicatePhones = phoneNumbers.filter(
      (phone, index) => phoneNumbers.indexOf(phone) !== index
    );

    if (duplicatePhones.length > 0) {
      warnings.push(
        `Duplicate phone numbers found: ${[...new Set(duplicatePhones)].join(', ')}`
      );
    }

    // Check for duplicate lender names with same phone
    const lenderPhonePairs = loans
      .filter(loan => loan.lenderName && loan.phoneNumber)
      .map(loan => `${loan.lenderName}|${loan.phoneNumber}`);

    const duplicatePairs = lenderPhonePairs.filter(
      (pair, index) => lenderPhonePairs.indexOf(pair) !== index
    );

    if (duplicatePairs.length > 0) {
      warnings.push(
        'Potential duplicate loans detected (same lender and phone number)'
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ==================== UTILITY METHODS ====================

  sanitizeLoanData(loanData: Partial<Loan>): Partial<Loan> {
    const sanitized: Partial<Loan> = {};

    // Sanitize lender name
    if (loanData.lenderName) {
      sanitized.lenderName = loanData.lenderName.trim().replace(/\s+/g, ' ');
    }

    // Sanitize phone number
    if (loanData.phoneNumber) {
      sanitized.phoneNumber = loanData.phoneNumber.trim();
    }

    // Sanitize amount
    if (loanData.amount !== undefined) {
      sanitized.amount = Math.round(loanData.amount);
    }

    // Sanitize interest rate
    if (loanData.interestRate !== undefined) {
      sanitized.interestRate = Math.round(loanData.interestRate * 100) / 100;
    }

    // Sanitize date
    if (loanData.repaymentDate) {
      const date = new Date(loanData.repaymentDate);
      if (!isNaN(date.getTime())) {
        sanitized.repaymentDate = date.toISOString().split('T')[0];
      }
    }

    // Copy other fields as-is
    if (loanData.id) sanitized.id = loanData.id;
    if (loanData.isPaid !== undefined) sanitized.isPaid = loanData.isPaid;

    return sanitized;
  }

  getValidationSummary(results: ValidationResult[]): {
    totalErrors: number;
    totalWarnings: number;
    validCount: number;
  } {
    return {
      totalErrors: results.reduce(
        (sum, result) => sum + result.errors.length,
        0
      ),
      totalWarnings: results.reduce(
        (sum, result) => sum + result.warnings.length,
        0
      ),
      validCount: results.filter(result => result.isValid).length,
    };
  }

  private initializeDefaultRules(): ValidationRule[] {
    return [
      {
        field: 'lenderName',
        message: 'Lender name is required',
        validator: value => !!value && value.trim().length > 0,
      },
      {
        field: 'phoneNumber',
        message: 'Phone number is required',
        validator: value => !!value && value.trim().length > 0,
      },
      {
        field: 'amount',
        message: 'Amount must be greater than zero',
        validator: value => typeof value === 'number' && value > 0,
      },
      {
        field: 'repaymentDate',
        message: 'Repayment date is required',
        validator: value => !!value && !isNaN(new Date(value).getTime()),
      },
    ];
  }

  private formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}
