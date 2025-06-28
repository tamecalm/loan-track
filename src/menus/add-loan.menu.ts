import inquirer from 'inquirer';
import { LoanService } from '../services/loan.service';
import { isValidPhoneNumber, isValidAmount } from '../utils/validation.utils';
import { isValidDate } from '../utils/date.utils';
import { showMainMenu } from './main.menu';

export async function showAddLoanMenu(): Promise<void> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'lenderName',
      message: 'Enter lender’s first name:',
      validate: (input: string) => input.trim().length > 0 || 'Name cannot be empty',
    },
    {
      type: 'input',
      name: 'phoneNumber',
      message: 'Enter lender’s phone number:',
      validate: (input: string) => isValidPhoneNumber(input) || 'Invalid phone number',
    },
    {
      type: 'number',
      name: 'amount',
      message: 'Enter loan amount (in Naira):',
      validate: (input: number) => isValidAmount(input) || 'Amount must be greater than 0',
    },
    {
      type: 'input',
      name: 'repaymentDate',
      message: 'Enter repayment date (YYYY-MM-DD):',
      validate: (input: string) => isValidDate(input) || 'Invalid date or date must be in the future',
    },
    {
      type: 'confirm',
      name: 'hasInterest',
      message: 'Does this loan have interest?',
    },
    {
      type: 'number',
      name: 'interestRate',
      message: 'Enter interest rate (%):',
      when: (answers: any) => answers.hasInterest,
      validate: (input: number) => input >= 0 || 'Interest rate cannot be negative',
    },
  ]);

  const loanData = {
    lenderName: answers.lenderName,
    phoneNumber: answers.phoneNumber,
    amount: answers.amount,
    repaymentDate: answers.repaymentDate,
    interestRate: answers.hasInterest ? answers.interestRate : undefined,
  };

  const loanService = new LoanService();
  await loanService.addLoan(loanData);
  console.log('Loan added successfully!');
  await showMainMenu();
}
