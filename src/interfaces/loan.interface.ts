export interface Loan {
  id: string;
  lenderName: string;
  phoneNumber: string;
  amount: number;
  repaymentDate: string;
  interestRate?: number; // Optional interest rate (percentage)
  isPaid: boolean;
}
