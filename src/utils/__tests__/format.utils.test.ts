import { formatCurrency, formatDate, formatLoanTable } from '../format.utils';
import { LoanModel } from '../../models/loan.model';
import { Loan } from '../../interfaces/loan.interface';

describe('Format Utils', () => {
  describe('formatCurrency', () => {
    it('should format Nigerian currency correctly', () => {
      expect(formatCurrency(1000)).toBe('₦1,000');
      expect(formatCurrency(50000)).toBe('₦50,000');
      expect(formatCurrency(1000000)).toBe('₦1,000,000');
      expect(formatCurrency(1234567)).toBe('₦1,234,567');
    });

    it('should handle small amounts', () => {
      expect(formatCurrency(1)).toBe('₦1');
      expect(formatCurrency(10)).toBe('₦10');
      expect(formatCurrency(100)).toBe('₦100');
      expect(formatCurrency(999)).toBe('₦999');
    });

    it('should handle zero amount', () => {
      expect(formatCurrency(0)).toBe('₦0');
    });

    it('should handle decimal amounts', () => {
      expect(formatCurrency(1000.50)).toBe('₦1,000.5');
      expect(formatCurrency(1234.99)).toBe('₦1,234.99');
      expect(formatCurrency(999.01)).toBe('₦999.01');
    });

    it('should handle large amounts', () => {
      expect(formatCurrency(10000000)).toBe('₦10,000,000');
      expect(formatCurrency(100000000)).toBe('₦100,000,000');
      expect(formatCurrency(1000000000)).toBe('₦1,000,000,000');
    });

    it('should handle negative amounts', () => {
      expect(formatCurrency(-1000)).toBe('₦-1,000');
      expect(formatCurrency(-50000)).toBe('₦-50,000');
    });
  });

  describe('formatDate', () => {
    it('should format dates correctly', () => {
      expect(formatDate('2025-02-15')).toBe('15/02/2025');
      expect(formatDate('2025-12-31')).toBe('31/12/2025');
      expect(formatDate('2025-01-01')).toBe('01/01/2025');
    });

    it('should handle different date formats', () => {
      expect(formatDate('2025-02-15T10:30:00.000Z')).toBe('15/02/2025');
      expect(formatDate('2025-02-15T23:59:59')).toBe('15/02/2025');
    });

    it('should handle all months correctly', () => {
      const testCases = [
        { input: '2025-01-15', expected: '15/01/2025' },
        { input: '2025-02-15', expected: '15/02/2025' },
        { input: '2025-03-15', expected: '15/03/2025' },
        { input: '2025-04-15', expected: '15/04/2025' },
        { input: '2025-05-15', expected: '15/05/2025' },
        { input: '2025-06-15', expected: '15/06/2025' },
        { input: '2025-07-15', expected: '15/07/2025' },
        { input: '2025-08-15', expected: '15/08/2025' },
        { input: '2025-09-15', expected: '15/09/2025' },
        { input: '2025-10-15', expected: '15/10/2025' },
        { input: '2025-11-15', expected: '15/11/2025' },
        { input: '2025-12-15', expected: '15/12/2025' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(formatDate(input)).toBe(expected);
      });
    });
  });

  describe('formatLoanTable', () => {
    const mockLoanData: Loan[] = [
      {
        id: 'loan-001-test',
        lenderName: 'John Doe',
        phoneNumber: '+2348012345678',
        amount: 50000,
        repaymentDate: '2025-02-15',
        interestRate: 10,
        isPaid: false,
      },
      {
        id: 'loan-002-test',
        lenderName: 'Jane Smith',
        phoneNumber: '08087654321',
        amount: 25000,
        repaymentDate: '2025-01-30',
        interestRate: 5,
        isPaid: true,
      },
      {
        id: 'loan-003-test',
        lenderName: 'Bob Johnson',
        phoneNumber: '+2347012345678',
        amount: 75000,
        repaymentDate: '2024-12-01', // Past date for overdue test
        isPaid: false,
      },
    ];

    it('should format loan table with headers', () => {
      const loans = mockLoanData.map(loan => new LoanModel(loan));
      const table = formatLoanTable(loans);

      expect(table).toContain('ID | Lender | Phone | Amount | Due Date | Interest | Status');
      expect(table).toContain('-'.repeat(60));
    });

    it('should include all loan data in table', () => {
      const loans = mockLoanData.map(loan => new LoanModel(loan));
      const table = formatLoanTable(loans);

      // Check for loan IDs (first 8 characters)
      expect(table).toContain('loan-001');
      expect(table).toContain('loan-002');
      expect(table).toContain('loan-003');

      // Check for lender names
      expect(table).toContain('John Doe');
      expect(table).toContain('Jane Smith');
      expect(table).toContain('Bob Johnson');

      // Check for phone numbers
      expect(table).toContain('+2348012345678');
      expect(table).toContain('08087654321');
      expect(table).toContain('+2347012345678');
    });

    it('should format amounts with currency', () => {
      const loans = mockLoanData.map(loan => new LoanModel(loan));
      const table = formatLoanTable(loans);

      expect(table).toContain('₦55,000'); // 50000 + 10% interest
      expect(table).toContain('₦26,250'); // 25000 + 5% interest
      expect(table).toContain('₦75,000'); // 75000 with no interest
    });

    it('should format dates correctly', () => {
      const loans = mockLoanData.map(loan => new LoanModel(loan));
      const table = formatLoanTable(loans);

      expect(table).toContain('15/02/2025');
      expect(table).toContain('30/01/2025');
      expect(table).toContain('01/12/2024');
    });

    it('should show interest rates correctly', () => {
      const loans = mockLoanData.map(loan => new LoanModel(loan));
      const table = formatLoanTable(loans);

      expect(table).toContain('10%');
      expect(table).toContain('5%');
      expect(table).toContain('None'); // For loan without interest
    });

    it('should show correct loan statuses', () => {
      const loans = mockLoanData.map(loan => new LoanModel(loan));
      const table = formatLoanTable(loans);

      expect(table).toContain('Pending'); // For future unpaid loan
      expect(table).toContain('Paid'); // For paid loan
      expect(table).toContain('Overdue'); // For past due unpaid loan
    });

    it('should handle empty loan array', () => {
      const table = formatLoanTable([]);

      expect(table).toContain('ID | Lender | Phone | Amount | Due Date | Interest | Status');
      expect(table).toContain('-'.repeat(60));
      // Should only contain headers and separator, no loan data
      const lines = table.split('\n').filter(line => line.trim());
      expect(lines).toHaveLength(2); // Header + separator only
    });

    it('should handle loans without interest rate', () => {
      const loanWithoutInterest: Loan = {
        id: 'loan-004-test',
        lenderName: 'Alice Brown',
        phoneNumber: '+2349012345678',
        amount: 30000,
        repaymentDate: '2025-03-01',
        isPaid: false,
      };

      const loans = [new LoanModel(loanWithoutInterest)];
      const table = formatLoanTable(loans);

      expect(table).toContain('Alice Brown');
      expect(table).toContain('₦30,000'); // Amount without interest
      expect(table).toContain('None'); // No interest rate
      expect(table).toContain('Pending');
    });

    it('should truncate long loan IDs to 8 characters', () => {
      const longIdLoan: Loan = {
        id: 'very-long-loan-id-that-should-be-truncated',
        lenderName: 'Test User',
        phoneNumber: '+2348012345678',
        amount: 10000,
        repaymentDate: '2025-02-15',
        isPaid: false,
      };

      const loans = [new LoanModel(longIdLoan)];
      const table = formatLoanTable(loans);

      expect(table).toContain('very-lon'); // First 8 characters
      expect(table).not.toContain('very-long-loan-id-that-should-be-truncated');
    });

    it('should handle multiple loans with different statuses', () => {
      const mixedLoans: Loan[] = [
        {
          id: 'paid-loan',
          lenderName: 'Paid Lender',
          phoneNumber: '+2348011111111',
          amount: 10000,
          repaymentDate: '2025-01-01',
          interestRate: 2,
          isPaid: true,
        },
        {
          id: 'pending-loan',
          lenderName: 'Future Lender',
          phoneNumber: '+2348022222222',
          amount: 20000,
          repaymentDate: '2025-12-31',
          interestRate: 3,
          isPaid: false,
        },
        {
          id: 'overdue-loan',
          lenderName: 'Past Lender',
          phoneNumber: '+2348033333333',
          amount: 30000,
          repaymentDate: '2024-01-01',
          interestRate: 4,
          isPaid: false,
        },
      ];

      const loans = mixedLoans.map(loan => new LoanModel(loan));
      const table = formatLoanTable(loans);

      expect(table).toContain('Paid');
      expect(table).toContain('Pending');
      expect(table).toContain('Overdue');
      
      // Check that all loans are included
      expect(table).toContain('Paid Lender');
      expect(table).toContain('Future Lender');
      expect(table).toContain('Past Lender');
    });
  });
});
