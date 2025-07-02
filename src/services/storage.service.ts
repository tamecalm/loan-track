import * as fs from 'fs/promises';
import * as path from 'path';
import { Loan } from '../interfaces/loan.interface';
import { LOAN_DATA_PATH } from '../config';

export class StorageService {
  async readLoans(): Promise<Loan[]> {
    try {
      const data = await fs.readFile(LOAN_DATA_PATH, 'utf-8');
      return JSON.parse(data) as Loan[];
    } catch (error) {
      // If file doesn't exist, create it with an empty array
      await this.saveLoans([]);
      return [];
    }
  }

  async saveLoans(loans: Loan[]): Promise<void> {
    await fs.writeFile(LOAN_DATA_PATH, JSON.stringify(loans, null, 2));
  }

  async exportLoans(): Promise<void> {
    const loans = await this.readLoans();
    const exportPath = path.join(
      path.dirname(LOAN_DATA_PATH),
      'loans_export.txt'
    );
    const exportData = loans
      .map(
        loan =>
          `Lender: ${loan.lenderName}, Phone: ${loan.phoneNumber}, Amount: ₦${loan.amount}, Due: ${loan.repaymentDate}, Interest: ${loan.interestRate ? `${loan.interestRate}%` : 'None'}, Paid: ${loan.isPaid ? 'Yes' : 'No'}`
      )
      .join('\n');
    await fs.writeFile(exportPath, exportData);
  }
}
