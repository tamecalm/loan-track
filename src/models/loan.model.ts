import { Loan } from '../interfaces/loan.interface';

export class LoanModel implements Loan {
  id: string;
  lenderName: string;
  phoneNumber: string;
  amount: number;
  repaymentDate: string;
  interestRate?: number;
  isPaid: boolean;

  constructor(data: Loan) {
    this.id = data.id;
    this.lenderName = data.lenderName;
    this.phoneNumber = data.phoneNumber;
    this.amount = data.amount;
    this.repaymentDate = data.repaymentDate;
    this.interestRate = data.interestRate;
    this.isPaid = data.isPaid;
  }

  // Calculate total amount with interest (if applicable)
  calculateTotalWithInterest(): number {
    if (this.interestRate) {
      const interest = (this.amount * this.interestRate) / 100;
      return this.amount + interest;
    }
    return this.amount;
  }

  // Check if loan is overdue
  isOverdue(): boolean {
    return new Date(this.repaymentDate) < new Date() && !this.isPaid;
  }
}
