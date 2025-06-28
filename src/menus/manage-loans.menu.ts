import inquirer from 'inquirer';
import { LoanService } from '../services/loan.service';
import { formatCurrency } from '../utils/format.utils';
import { formatDate, isValidDate } from '../utils/date.utils';
import { isValidPhoneNumber, isValidAmount } from '../utils/validation.utils';
import { showMainMenu } from './main.menu';
import { LoanModel } from '../models/loan.model';

export async function showManageLoansMenu(): Promise<void> {
  const loanService = new LoanService();
  const loans = await loanService.getLoans();
  if (loans.length === 0) {
    console.log('No loans to manage.');
    await showMainMenu();
    return;
  }

  const choices = loans.map((loan) => ({
    name: `${loan.lenderName} - ${formatCurrency(loan.calculateTotalWithInterest())} - ${formatDate(loan.repaymentDate)}`,
    value: loan.id,
  }));

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'loanId',
      message: 'Select a loan to manage:',
      choices,
    },
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do with this loan?',
      choices: ['Mark as Paid', 'Edit Loan', 'Delete Loan'],
    },
  ]);

  if (answers.action === 'Mark as Paid') {
    await loanService.markLoanAsPaid(answers.loanId);
    console.log('Loan marked as paid.');
  } else if (answers.action === 'Edit Loan') {
    const loan = loans.find((loan) => loan.id === answers.loanId);
    if (!loan) {
      console.log('Loan not found.');
      await showMainMenu();
      return;
    }

    const editAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'lenderName',
        message: 'Enter new lender’s first name:',
        default: loan.lenderName,
        validate: (input: string) => input.trim().length > 0 || 'Name cannot be empty',
      },
      {
        type: 'input',
        name: 'phoneNumber',
        message: 'Enter new phone number:',
        default: loan.phoneNumber,
        validate: (input: string) => isValidPhoneNumber(input) || 'Invalid phone number',
      },
      {
        type: 'number',
        name: 'amount',
        message: 'Enter new loan amount (in Naira):',
        default: loan.amount,
        validate: (input: number) => isValidAmount(input) || 'Amount must be greater than 0',
      },
      {
        type: 'input',
        name: 'repaymentDate',
        message: 'Enter new repayment date (YYYY-MM-DD):',
        default: loan.repaymentDate,
        validate: (input: string) => isValidDate(input) || 'Invalid date or date must be in the future',
      },
      {
        type: 'confirm',
        name: 'hasInterest',
        message: 'Does this loan have interest?',
        default: !!loan.interestRate,
      },
      {
        type: 'number',
        name: 'interestRate',
        message: 'Enter new interest rate (%):',
        default: loan.interestRate,
        when: (answers: any) => answers.hasInterest,
        validate: (input: number) => input >= 0 || 'Interest rate cannot be negative',
      },
    ]);

    const updatedLoan = {
      lenderName: editAnswers.lenderName,
      phoneNumber: editAnswers.phoneNumber,
      amount: editAnswers.amount,
      repaymentDate: editAnswers.repaymentDate,
      interestRate: editAnswers.hasInterest ? editAnswers.interestRate : undefined,
    };

    await loanService.updateLoan(answers.loanId, updatedLoan);
    console.log('Loan updated successfully.');
  } else if (answers.action === 'Delete Loan') {
    const deleted = await loanService.deleteLoan(answers.loanId);
    if (deleted) {
      console.log('Loan deleted successfully.');
    } else {
      console.log('Loan not found.');
    }
  }

  await showMainMenu();
}
