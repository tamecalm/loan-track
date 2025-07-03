import { LoanModel } from '../loan.model';
import { Loan } from '../../interfaces/loan.interface';

describe('LoanModel', () => {
  const mockLoanData: Loan = {
    id: 'test-id-123',
    lenderName: 'John Doe',
    phoneNumber: '+2348012345678',
    amount: 50000,
    repaymentDate: '2025-02-15',
    interestRate: 10,
    isPaid: false,
  };

  describe('constructor', () => {
    it('should create a LoanModel instance with provided data', () => {
      const loan = new LoanModel(mockLoanData);

      expect(loan.id).toBe(mockLoanData.id);
      expect(loan.lenderName).toBe(mockLoanData.lenderName);
      expect(loan.phoneNumber).toBe(mockLoanData.phoneNumber);
      expect(loan.amount).toBe(mockLoanData.amount);
      expect(loan.repaymentDate).toBe(mockLoanData.repaymentDate);
      expect(loan.interestRate).toBe(mockLoanData.interestRate);
      expect(loan.isPaid).toBe(mockLoanData.isPaid);
    });

    it('should handle loan data without interest rate', () => {
      const loanDataWithoutInterest = { ...mockLoanData };
      delete loanDataWithoutInterest.interestRate;

      const loan = new LoanModel(loanDataWithoutInterest);

      expect(loan.interestRate).toBeUndefined();
    });
  });

  describe('calculateTotalWithInterest', () => {
    it('should calculate total amount with interest correctly', () => {
      const loan = new LoanModel(mockLoanData);
      const expectedTotal = 50000 + (50000 * 10) / 100; // 55000

      expect(loan.calculateTotalWithInterest()).toBe(expectedTotal);
    });

    it('should return original amount when no interest rate is provided', () => {
      const loanDataWithoutInterest = { ...mockLoanData };
      delete loanDataWithoutInterest.interestRate;

      const loan = new LoanModel(loanDataWithoutInterest);

      expect(loan.calculateTotalWithInterest()).toBe(mockLoanData.amount);
    });

    it('should handle zero interest rate', () => {
      const loanDataWithZeroInterest = { ...mockLoanData, interestRate: 0 };
      const loan = new LoanModel(loanDataWithZeroInterest);

      expect(loan.calculateTotalWithInterest()).toBe(mockLoanData.amount);
    });
  });

  describe('isOverdue', () => {
    it('should return true for overdue unpaid loans', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const overdueLoanData = {
        ...mockLoanData,
        repaymentDate: yesterday.toISOString().split('T')[0],
        isPaid: false,
      };

      const loan = new LoanModel(overdueLoanData);

      expect(loan.isOverdue()).toBe(true);
    });

    it('should return false for future due dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const futureLoanData = {
        ...mockLoanData,
        repaymentDate: tomorrow.toISOString().split('T')[0],
        isPaid: false,
      };

      const loan = new LoanModel(futureLoanData);

      expect(loan.isOverdue()).toBe(false);
    });

    it('should return false for paid loans even if past due date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const paidOverdueLoanData = {
        ...mockLoanData,
        repaymentDate: yesterday.toISOString().split('T')[0],
        isPaid: true,
      };

      const loan = new LoanModel(paidOverdueLoanData);

      expect(loan.isOverdue()).toBe(false);
    });

    it('should return false for today\'s due date', () => {
      const today = new Date().toISOString().split('T')[0];
      
      const todayLoanData = {
        ...mockLoanData,
        repaymentDate: today,
        isPaid: false,
      };

      const loan = new LoanModel(todayLoanData);

      expect(loan.isOverdue()).toBe(false);
    });
  });
});
