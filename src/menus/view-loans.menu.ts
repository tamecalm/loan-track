import inquirer from 'inquirer';
import { LoanService } from '../services/loan.service';
import { formatLoanTable, formatCurrency } from '../utils/format.utils';
import { showMainMenu } from './main.menu';
import { LoanModel } from '../models/loan.model';

export async function showViewLoansMenu(): Promise<void> {
  const loanService = new LoanService();
  const loans = await loanService.getLoans();
  console.log(formatLoanTable(loans));
  console.log(`Total debt: ${formatCurrency(loanService.getTotalDebt(loans))}`);

  const filters = [
    { name: 'All Loans', value: 'all' },
    { name: 'Overdue Loans', value: 'overdue' },
    { name: 'Upcoming Loans', value: 'upcoming' },
    { name: 'Paid Loans', value: 'paid' },
  ];

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'filter',
      message: 'Filter loans by status:',
      choices: filters,
    },
  ]);

  const filteredLoans = loans.filter((loan) => {
    if (answers.filter === 'all') return true;
    if (answers.filter === 'overdue') return loan.isOverdue();
    if (answers.filter === 'upcoming') return !loan.isOverdue() && !loan.isPaid;
    if (answers.filter === 'paid') return loan.isPaid;
    return false;
  });

  console.log(formatLoanTable(filteredLoans));
  await showMainMenu();
}
