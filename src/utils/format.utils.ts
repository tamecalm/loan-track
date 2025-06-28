import { LoanModel } from '../models/loan.model';
import { formatDate } from './date.utils';

export function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

export function formatLoanTable(loans: LoanModel[]): string {
  let table = 'ID | Lender | Phone | Amount | Due Date | Interest | Status\n';
  table += '-'.repeat(60) + '\n';
  loans.forEach((loan) => {
    table += `${loan.id.slice(0, 8)} | ${loan.lenderName} | ${loan.phoneNumber} | ${formatCurrency(loan.calculateTotalWithInterest())} | ${formatDate(loan.repaymentDate)} | ${loan.interestRate ? `${loan.interestRate}%` : 'None'} | ${loan.isPaid ? 'Paid' : loan.isOverdue() ? 'Overdue' : 'Pending'}\n`;
  });
  return table;
}
