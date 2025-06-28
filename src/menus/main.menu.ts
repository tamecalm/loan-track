import inquirer from 'inquirer';
import { showAddLoanMenu } from './add-loan.menu';
import { showViewLoansMenu } from './view-loans.menu';
import { showManageLoansMenu } from './manage-loans.menu';
import { StorageService } from '../services/storage.service';

export async function showMainMenu(): Promise<void> {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Welcome to LoanTrack! What would you like to do?',
      choices: [
        'Add a new loan',
        'View all loans',
        'Manage loans',
        'Export loans to file',
        'Exit',
      ],
    },
  ]);

  switch (answers.action) {
    case 'Add a new loan':
      await showAddLoanMenu();
      break;
    case 'View all loans':
      await showViewLoansMenu();
      break;
    case 'Manage loans':
      await showManageLoansMenu();
      break;
    case 'Export loans to file':
      await new StorageService().exportLoans();
      console.log('Loans exported to loans_export.txt');
      await showMainMenu();
      break;
    case 'Exit':
      console.log('Goodbye!');
      process.exit(0);
  }
}
