import { Loan } from '../interfaces/loan.interface';
import { LoanModel } from '../models/loan.model';
import { StorageService } from './storage.service';
import { v4 as uuidv4 } from 'uuid';

export class LoanService {
  private storage: StorageService;

  constructor() {
    this.storage = new StorageService();
  }

  async addLoan(loanData: Omit<Loan, 'id' | 'isPaid'>): Promise<LoanModel> {
    const loan: Loan = { ...loanData, id: uuidv4(), isPaid: false };
    const loanModel = new LoanModel(loan);
    const loans = await this.storage.readLoans();
    loans.push(loan);
    await this.storage.saveLoans(loans);
    return loanModel;
  }

  async getLoans(): Promise<LoanModel[]> {
    const loans = await this.storage.readLoans();
    return loans.map(loan => new LoanModel(loan));
  }

  async updateLoan(
    id: string,
    updates: Partial<Loan>
  ): Promise<LoanModel | null> {
    const loans = await this.storage.readLoans();
    const loanIndex = loans.findIndex(loan => loan.id === id);
    if (loanIndex === -1) return null;
    loans[loanIndex] = { ...loans[loanIndex], ...updates };
    await this.storage.saveLoans(loans);
    return new LoanModel(loans[loanIndex]);
  }

  async deleteLoan(id: string): Promise<boolean> {
    const loans = await this.storage.readLoans();
    const updatedLoans = loans.filter(loan => loan.id !== id);
    if (updatedLoans.length === loans.length) return false;
    await this.storage.saveLoans(updatedLoans);
    return true;
  }

  async markLoanAsPaid(id: string): Promise<LoanModel | null> {
    return this.updateLoan(id, { isPaid: true });
  }

  getTotalDebt(loans: LoanModel[]): number {
    return loans.reduce(
      (total, loan) => total + loan.calculateTotalWithInterest(),
      0
    );
  }
}
