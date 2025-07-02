import chalk from 'chalk';
import inquirer from 'inquirer';
import boxen from 'boxen';
import Table from 'cli-table3';
import { createSpinner } from 'nanospinner';
import { Logger } from '../core/logger';
import { LoanService } from '../services/loan.service';
import { formatCurrency } from '../utils/format.utils';
import { formatDate, isValidDate } from '../utils/date.utils';
import { isValidPhoneNumber, isValidAmount } from '../utils/validation.utils';
import { LoanModel } from '../models/loan.model';

export class LoanController {
  private logger: Logger;
  private loanService: LoanService;

  constructor() {
    this.logger = new Logger();
    this.loanService = new LoanService();
  }

  async showLoanMenu(): Promise<void> {
    try {
      console.clear();
      this.displayLoanHeader();

      const choice = await this.getLoanMenuChoice();

      if (choice === 'back') {
        return;
      }

      await this.handleLoanChoice(choice);
    } catch (error) {
      this.logger.error('Error in loan menu', error as Error);
      console.error(chalk.red('❌ Failed to load loan menu'));
    }
  }

  private displayLoanHeader(): void {
    const header = boxen(
      chalk.green.bold('💰 LOAN MANAGEMENT') +
        '\n' +
        chalk.gray('Add, View, Edit & Manage Your Loans'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'green',
        textAlignment: 'center',
      }
    );

    console.log(header);
  }

  private async getLoanMenuChoice(): Promise<string> {
    // Show quick loan statistics
    await this.displayQuickStats();

    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: chalk.yellow('💰 Select loan operation:'),
        choices: [
          {
            name: `${chalk.green('➕')} Add New Loan`,
            value: 'add',
          },
          {
            name: `${chalk.blue('👁️')} View All Loans`,
            value: 'view',
          },
          {
            name: `${chalk.cyan('🔍')} Search Loans`,
            value: 'search',
          },
          {
            name: `${chalk.yellow('✏️')} Edit Loan`,
            value: 'edit',
          },
          {
            name: `${chalk.magenta('✅')} Mark as Paid`,
            value: 'markPaid',
          },
          {
            name: `${chalk.yellow('📋')} Loan Details`,
            value: 'details',
          },
          {
            name: `${chalk.red('🗑️')} Delete Loan`,
            value: 'delete',
          },
          {
            name: `${chalk.magenta('📊')} Loan Summary`,
            value: 'summary',
          },
          new inquirer.Separator(),
          {
            name: `${chalk.gray('🔙')} Back to Main Menu`,
            value: 'back',
          },
        ],
        pageSize: 12,
      },
    ]);

    return choice;
  }

  private async displayQuickStats(): Promise<void> {
    const spinner = createSpinner('Loading loan statistics...').start();

    try {
      const loans = await this.loanService.getLoans();
      spinner.stop();

      const totalLoans = loans.length;
      const totalDebt = this.loanService.getTotalDebt(loans);
      const paidLoans = loans.filter(loan => loan.isPaid).length;
      const overdueLoans = loans.filter(loan => loan.isOverdue()).length;

      console.log(
        boxen(
          chalk.cyan('📊 Quick Statistics') +
            '\n\n' +
            chalk.white('Total Loans: ') +
            chalk.yellow(totalLoans.toString()) +
            '\n' +
            chalk.white('Total Debt: ') +
            chalk.green(formatCurrency(totalDebt)) +
            '\n' +
            chalk.white('Paid Loans: ') +
            chalk.blue(paidLoans.toString()) +
            '\n' +
            chalk.white('Overdue Loans: ') +
            (overdueLoans > 0
              ? chalk.red(overdueLoans.toString())
              : chalk.green('0')),
          {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'cyan',
            textAlignment: 'left',
          }
        )
      );
    } catch (error) {
      spinner.error({ text: 'Failed to load statistics' });
      throw error;
    }
  }

  private async handleLoanChoice(choice: string): Promise<void> {
    try {
      switch (choice) {
        case 'add':
          await this.addNewLoan();
          break;
        case 'view':
          await this.viewAllLoans();
          break;
        case 'search':
          await this.searchLoans();
          break;
        case 'edit':
          await this.editLoan();
          break;
        case 'markPaid':
          await this.markLoanAsPaid();
          break;
        case 'details':
          await this.viewLoanDetails();
          break;
        case 'delete':
          await this.deleteLoan();
          break;
        case 'summary':
          await this.showLoanSummary();
          break;
      }

      // Ask if user wants to perform another loan operation
      const { continueLoan } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueLoan',
          message: 'Would you like to perform another loan operation?',
          default: false,
        },
      ]);

      if (continueLoan) {
        await this.showLoanMenu();
      }
    } catch (error) {
      this.logger.error(
        `Error handling loan choice: ${choice}`,
        error as Error
      );
      console.error(chalk.red(`❌ Failed to execute ${choice} operation`));
    }
  }

  private async addNewLoan(): Promise<void> {
    console.log('\n' + chalk.bold('➕ Add New Loan'));

    const loanData = await inquirer.prompt([
      {
        type: 'input',
        name: 'lenderName',
        message: "Enter lender's name:",
        validate: (input: string) =>
          input.trim().length > 0 || 'Name cannot be empty',
      },
      {
        type: 'input',
        name: 'phoneNumber',
        message: "Enter lender's phone number:",
        validate: (input: string) =>
          isValidPhoneNumber(input) || 'Invalid phone number format',
      },
      {
        type: 'number',
        name: 'amount',
        message: 'Enter loan amount:',
        validate: (input: number) =>
          isValidAmount(input) || 'Amount must be greater than 0',
      },
      {
        type: 'input',
        name: 'repaymentDate',
        message: 'Enter repayment date (YYYY-MM-DD):',
        validate: (input: string) =>
          isValidDate(input) || 'Invalid date or date must be in the future',
      },
      {
        type: 'confirm',
        name: 'hasInterest',
        message: 'Does this loan have interest?',
        default: false,
      },
      {
        type: 'number',
        name: 'interestRate',
        message: 'Enter interest rate (%):',
        when: (answers: any) => answers.hasInterest,
        validate: (input: number) =>
          input >= 0 || 'Interest rate cannot be negative',
        default: 0,
      },
      {
        type: 'input',
        name: 'description',
        message: 'Enter loan description (optional):',
        default: '',
      },
    ]);

    const spinner = createSpinner('Adding new loan...').start();

    try {
      const newLoan = await this.loanService.addLoan({
        lenderName: loanData.lenderName,
        phoneNumber: loanData.phoneNumber,
        amount: loanData.amount,
        repaymentDate: loanData.repaymentDate,
        interestRate: loanData.hasInterest ? loanData.interestRate : undefined,
      });

      spinner.success({ text: 'Loan added successfully!' });

      console.log(
        boxen(
          chalk.green('✅ Loan Added Successfully!') +
            '\n\n' +
            chalk.cyan('Loan ID: ') +
            chalk.white(newLoan.id.slice(0, 8)) +
            '\n' +
            chalk.cyan('Lender: ') +
            chalk.white(newLoan.lenderName) +
            '\n' +
            chalk.cyan('Amount: ') +
            chalk.white(formatCurrency(newLoan.amount)) +
            '\n' +
            chalk.cyan('Total with Interest: ') +
            chalk.white(formatCurrency(newLoan.calculateTotalWithInterest())) +
            '\n' +
            chalk.cyan('Due Date: ') +
            chalk.white(formatDate(newLoan.repaymentDate)),
          {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'green',
            textAlignment: 'left',
          }
        )
      );
    } catch (error) {
      spinner.error({ text: 'Failed to add loan' });
      throw error;
    }
  }

  private async viewAllLoans(): Promise<void> {
    console.log('\n' + chalk.bold('👁️ View All Loans'));

    const spinner = createSpinner('Loading loans...').start();

    try {
      const loans = await this.loanService.getLoans();
      spinner.stop();

      if (loans.length === 0) {
        console.log(
          boxen(
            chalk.yellow(
              '📂 No loans found.\nAdd your first loan to get started!'
            ),
            {
              padding: 1,
              margin: 1,
              borderStyle: 'round',
              borderColor: 'yellow',
              textAlignment: 'center',
            }
          )
        );
        return;
      }

      // Filter options
      const { filter, sortBy } = await inquirer.prompt([
        {
          type: 'list',
          name: 'filter',
          message: 'Filter loans by status:',
          choices: [
            { name: 'All Loans', value: 'all' },
            { name: 'Pending Loans', value: 'pending' },
            { name: 'Paid Loans', value: 'paid' },
            { name: 'Overdue Loans', value: 'overdue' },
            { name: 'Due This Week', value: 'thisWeek' },
            { name: 'Due This Month', value: 'thisMonth' },
          ],
        },
        {
          type: 'list',
          name: 'sortBy',
          message: 'Sort loans by:',
          choices: [
            { name: 'Due Date (Earliest First)', value: 'dueDate' },
            { name: 'Amount (Highest First)', value: 'amountDesc' },
            { name: 'Amount (Lowest First)', value: 'amountAsc' },
            { name: 'Lender Name (A-Z)', value: 'lenderName' },
            { name: 'Status', value: 'status' },
          ],
        },
      ]);

      const filteredLoans = this.filterLoans(loans, filter);
      const sortedLoans = this.sortLoans(filteredLoans, sortBy);

      this.displayLoansTable(sortedLoans);

      // Show summary
      const totalAmount = sortedLoans.reduce(
        (sum: number, loan: LoanModel) =>
          sum + loan.calculateTotalWithInterest(),
        0
      );
      console.log(
        chalk.cyan(
          `\n📊 Showing ${sortedLoans.length} of ${loans.length} loans`
        )
      );
      console.log(
        chalk.cyan(`💰 Total Amount: ${formatCurrency(totalAmount)}`)
      );
    } catch (error) {
      spinner.error({ text: 'Failed to load loans' });
      throw error;
    }
  }

  private async searchLoans(): Promise<void> {
    console.log('\n' + chalk.bold('🔍 Search Loans'));

    const searchCriteria = await inquirer.prompt([
      {
        type: 'list',
        name: 'searchType',
        message: 'Search by:',
        choices: [
          { name: 'Lender Name', value: 'lenderName' },
          { name: 'Phone Number', value: 'phoneNumber' },
          { name: 'Amount Range', value: 'amountRange' },
          { name: 'Date Range', value: 'dateRange' },
          { name: 'Status', value: 'status' },
        ],
      },
    ]);

    let searchParams: any = {};

    switch (searchCriteria.searchType) {
      case 'lenderName':
        const nameSearch = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Enter lender name (partial match):',
            validate: input =>
              input.trim().length > 0 || 'Search term cannot be empty',
          },
        ]);
        searchParams = { type: 'lenderName', value: nameSearch.name };
        break;

      case 'phoneNumber':
        const phoneSearch = await inquirer.prompt([
          {
            type: 'input',
            name: 'phone',
            message: 'Enter phone number:',
            validate: input =>
              input.trim().length > 0 || 'Phone number cannot be empty',
          },
        ]);
        searchParams = { type: 'phoneNumber', value: phoneSearch.phone };
        break;

      case 'amountRange':
        const amountSearch = await inquirer.prompt([
          {
            type: 'number',
            name: 'minAmount',
            message: 'Enter minimum amount:',
            default: 0,
          },
          {
            type: 'number',
            name: 'maxAmount',
            message: 'Enter maximum amount:',
            validate: (input, answers) =>
              input >= answers.minAmount ||
              'Maximum must be greater than minimum',
          },
        ]);
        searchParams = {
          type: 'amountRange',
          min: amountSearch.minAmount,
          max: amountSearch.maxAmount,
        };
        break;

      case 'dateRange':
        const dateSearch = await inquirer.prompt([
          {
            type: 'input',
            name: 'startDate',
            message: 'Enter start date (YYYY-MM-DD):',
            validate: input =>
              !isNaN(Date.parse(input)) || 'Invalid date format',
          },
          {
            type: 'input',
            name: 'endDate',
            message: 'Enter end date (YYYY-MM-DD):',
            validate: input =>
              !isNaN(Date.parse(input)) || 'Invalid date format',
          },
        ]);
        searchParams = {
          type: 'dateRange',
          start: dateSearch.startDate,
          end: dateSearch.endDate,
        };
        break;

      case 'status':
        const statusSearch = await inquirer.prompt([
          {
            type: 'list',
            name: 'status',
            message: 'Select status:',
            choices: [
              { name: 'Paid', value: 'paid' },
              { name: 'Pending', value: 'pending' },
              { name: 'Overdue', value: 'overdue' },
            ],
          },
        ]);
        searchParams = { type: 'status', value: statusSearch.status };
        break;
    }

    const spinner = createSpinner('Searching loans...').start();

    try {
      const loans = await this.loanService.getLoans();
      const searchResults = this.searchLoansWithCriteria(loans, searchParams);

      spinner.success({ text: `Found ${searchResults.length} matching loans` });

      if (searchResults.length === 0) {
        console.log(
          boxen(
            chalk.yellow(
              '🔍 No loans found matching your search criteria.\nTry adjusting your search parameters.'
            ),
            {
              padding: 1,
              margin: 1,
              borderStyle: 'round',
              borderColor: 'yellow',
              textAlignment: 'center',
            }
          )
        );
        return;
      }

      this.displayLoansTable(searchResults);
    } catch (error) {
      spinner.error({ text: 'Search failed' });
      throw error;
    }
  }

  private async editLoan(): Promise<void> {
    console.log('\n' + chalk.bold('✏️ Edit Loan'));

    const loans = await this.loanService.getLoans();

    if (loans.length === 0) {
      console.log(
        boxen(
          chalk.yellow('📂 No loans available to edit.\nAdd some loans first!'),
          {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'yellow',
            textAlignment: 'center',
          }
        )
      );
      return;
    }

    const loanChoices = loans.map(loan => ({
      name: `${loan.lenderName} - ${formatCurrency(loan.calculateTotalWithInterest())} - ${formatDate(loan.repaymentDate)} - ${loan.isPaid ? 'Paid' : loan.isOverdue() ? 'Overdue' : 'Pending'}`,
      value: loan.id,
    }));

    const { loanId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'loanId',
        message: 'Select loan to edit:',
        choices: [
          ...loanChoices,
          new inquirer.Separator(),
          { name: chalk.gray('Cancel'), value: 'cancel' },
        ],
        pageSize: 10,
      },
    ]);

    if (loanId === 'cancel') {
      console.log(chalk.yellow('Edit operation cancelled.'));
      return;
    }

    const loan = loans.find(l => l.id === loanId);
    if (!loan) {
      console.log(chalk.red('❌ Loan not found.'));
      return;
    }

    console.log(
      boxen(
        chalk.cyan('Current Loan Details:') +
          '\n\n' +
          chalk.white('Lender: ') +
          chalk.yellow(loan.lenderName) +
          '\n' +
          chalk.white('Phone: ') +
          chalk.yellow(loan.phoneNumber) +
          '\n' +
          chalk.white('Amount: ') +
          chalk.yellow(formatCurrency(loan.amount)) +
          '\n' +
          chalk.white('Interest: ') +
          chalk.yellow(loan.interestRate ? `${loan.interestRate}%` : 'None') +
          '\n' +
          chalk.white('Due Date: ') +
          chalk.yellow(formatDate(loan.repaymentDate)) +
          '\n' +
          chalk.white('Status: ') +
          (loan.isPaid
            ? chalk.green('Paid')
            : loan.isOverdue()
              ? chalk.red('Overdue')
              : chalk.yellow('Pending')),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
        }
      )
    );

    const updates = await inquirer.prompt([
      {
        type: 'input',
        name: 'lenderName',
        message: 'Enter new lender name:',
        default: loan.lenderName,
        validate: (input: string) =>
          input.trim().length > 0 || 'Name cannot be empty',
      },
      {
        type: 'input',
        name: 'phoneNumber',
        message: 'Enter new phone number:',
        default: loan.phoneNumber,
        validate: (input: string) =>
          isValidPhoneNumber(input) || 'Invalid phone number format',
      },
      {
        type: 'number',
        name: 'amount',
        message: 'Enter new loan amount:',
        default: loan.amount,
        validate: (input: number) =>
          isValidAmount(input) || 'Amount must be greater than 0',
      },
      {
        type: 'input',
        name: 'repaymentDate',
        message: 'Enter new repayment date (YYYY-MM-DD):',
        default: loan.repaymentDate,
        validate: (input: string) =>
          !isNaN(Date.parse(input)) || 'Invalid date format',
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
        default: loan.interestRate || 0,
        when: (answers: any) => answers.hasInterest,
        validate: (input: number) =>
          input >= 0 || 'Interest rate cannot be negative',
      },
    ]);

    const spinner = createSpinner('Updating loan...').start();

    try {
      const updatedLoan = await this.loanService.updateLoan(loanId, {
        lenderName: updates.lenderName,
        phoneNumber: updates.phoneNumber,
        amount: updates.amount,
        repaymentDate: updates.repaymentDate,
        interestRate: updates.hasInterest ? updates.interestRate : undefined,
      });

      spinner.success({ text: 'Loan updated successfully!' });

      if (updatedLoan) {
        console.log(
          boxen(
            chalk.green('✅ Loan Updated Successfully!') +
              '\n\n' +
              chalk.cyan('Updated Details:') +
              '\n' +
              chalk.white('Lender: ') +
              chalk.yellow(updatedLoan.lenderName) +
              '\n' +
              chalk.white('Amount: ') +
              chalk.yellow(
                formatCurrency(updatedLoan.calculateTotalWithInterest())
              ) +
              '\n' +
              chalk.white('Due Date: ') +
              chalk.yellow(formatDate(updatedLoan.repaymentDate)),
            {
              padding: 1,
              margin: 1,
              borderStyle: 'round',
              borderColor: 'green',
              textAlignment: 'left',
            }
          )
        );
      }
    } catch (error) {
      spinner.error({ text: 'Failed to update loan' });
      throw error;
    }
  }

  private async markLoanAsPaid(): Promise<void> {
    console.log('\n' + chalk.bold('✅ Mark Loan as Paid'));

    const loans = await this.loanService.getLoans();
    const unpaidLoans = loans.filter(loan => !loan.isPaid);

    if (unpaidLoans.length === 0) {
      console.log(
        boxen(
          chalk.green(
            '🎉 All loans are already paid!\nGreat job managing your finances!'
          ),
          {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'green',
            textAlignment: 'center',
          }
        )
      );
      return;
    }

    const loanChoices = unpaidLoans.map(loan => ({
      name: `${loan.lenderName} - ${formatCurrency(loan.calculateTotalWithInterest())} - ${formatDate(loan.repaymentDate)} - ${loan.isOverdue() ? chalk.red('Overdue') : chalk.yellow('Pending')}`,
      value: loan.id,
    }));

    const { loanId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'loanId',
        message: 'Select loan to mark as paid:',
        choices: [
          ...loanChoices,
          new inquirer.Separator(),
          { name: chalk.gray('Cancel'), value: 'cancel' },
        ],
        pageSize: 10,
      },
    ]);

    if (loanId === 'cancel') {
      console.log(chalk.yellow('Operation cancelled.'));
      return;
    }

    const loan = unpaidLoans.find(l => l.id === loanId);
    if (!loan) {
      console.log(chalk.red('❌ Loan not found.'));
      return;
    }

    // Confirm payment
    const { confirmPayment } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmPayment',
        message: `Mark loan from ${loan.lenderName} (${formatCurrency(loan.calculateTotalWithInterest())}) as paid?`,
        default: true,
      },
    ]);

    if (!confirmPayment) {
      console.log(chalk.yellow('Payment marking cancelled.'));
      return;
    }

    const spinner = createSpinner('Marking loan as paid...').start();

    try {
      const updatedLoan = await this.loanService.markLoanAsPaid(loanId);
      spinner.success({ text: 'Loan marked as paid successfully!' });

      if (updatedLoan) {
        console.log(
          boxen(
            chalk.green('✅ Loan Marked as Paid!') +
              '\n\n' +
              chalk.cyan('Lender: ') +
              chalk.white(updatedLoan.lenderName) +
              '\n' +
              chalk.cyan('Amount Paid: ') +
              chalk.white(
                formatCurrency(updatedLoan.calculateTotalWithInterest())
              ) +
              '\n' +
              chalk.cyan('Payment Date: ') +
              chalk.yellow(formatDate(new Date().toISOString().split('T')[0])),
            {
              padding: 1,
              margin: 1,
              borderStyle: 'round',
              borderColor: 'green',
              textAlignment: 'left',
            }
          )
        );
      }
    } catch (error) {
      spinner.error({ text: 'Failed to mark loan as paid' });
      throw error;
    }
  }

  private async viewLoanDetails(): Promise<void> {
    console.log('\n' + chalk.bold('📋 View Loan Details'));

    const loans = await this.loanService.getLoans();

    if (loans.length === 0) {
      console.log(
        boxen(
          chalk.yellow('📂 No loans available to view.\nAdd some loans first!'),
          {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'yellow',
            textAlignment: 'center',
          }
        )
      );
      return;
    }

    const loanChoices = loans.map(loan => ({
      name: `${loan.lenderName} - ${formatCurrency(loan.calculateTotalWithInterest())} - ${loan.isPaid ? 'Paid' : loan.isOverdue() ? 'Overdue' : 'Pending'}`,
      value: loan.id,
    }));

    const { loanId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'loanId',
        message: 'Select loan to view details:',
        choices: [
          ...loanChoices,
          new inquirer.Separator(),
          { name: chalk.gray('Cancel'), value: 'cancel' },
        ],
        pageSize: 10,
      },
    ]);

    if (loanId === 'cancel') {
      return;
    }

    const loan = loans.find(l => l.id === loanId);
    if (!loan) {
      console.log(chalk.red('❌ Loan not found.'));
      return;
    }

    console.log(
      boxen(
        chalk.cyan.bold('📋 LOAN DETAILS') +
          '\n\n' +
          chalk.white('Loan ID: ') +
          chalk.gray(loan.id) +
          '\n' +
          chalk.white('Lender Name: ') +
          chalk.yellow(loan.lenderName) +
          '\n' +
          chalk.white('Phone Number: ') +
          chalk.yellow(loan.phoneNumber) +
          '\n' +
          chalk.white('Principal Amount: ') +
          chalk.green(formatCurrency(loan.amount)) +
          '\n' +
          chalk.white('Interest Rate: ') +
          chalk.yellow(
            loan.interestRate ? `${loan.interestRate}%` : 'No Interest'
          ) +
          '\n' +
          chalk.white('Total Amount: ') +
          chalk.green(formatCurrency(loan.calculateTotalWithInterest())) +
          '\n' +
          chalk.white('Due Date: ') +
          chalk.yellow(formatDate(loan.repaymentDate)) +
          '\n' +
          chalk.white('Status: ') +
          (loan.isPaid
            ? chalk.green('✅ PAID')
            : loan.isOverdue()
              ? chalk.red('⚠️ OVERDUE')
              : chalk.yellow('⏳ PENDING')),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'double',
          borderColor: 'cyan',
          textAlignment: 'left',
        }
      )
    );
  }

  private async deleteLoan(): Promise<void> {
    console.log('\n' + chalk.bold('🗑️ Delete Loan'));

    const loans = await this.loanService.getLoans();

    if (loans.length === 0) {
      console.log(
        boxen(
          chalk.yellow(
            '📂 No loans available to delete.\nAdd some loans first!'
          ),
          {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'yellow',
            textAlignment: 'center',
          }
        )
      );
      return;
    }

    const loanChoices = loans.map(loan => ({
      name: `${loan.lenderName} - ${formatCurrency(loan.calculateTotalWithInterest())} - ${loan.isPaid ? 'Paid' : loan.isOverdue() ? 'Overdue' : 'Pending'}`,
      value: loan.id,
    }));

    const { loanId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'loanId',
        message: 'Select loan to delete:',
        choices: [
          ...loanChoices,
          new inquirer.Separator(),
          { name: chalk.gray('Cancel'), value: 'cancel' },
        ],
        pageSize: 10,
      },
    ]);

    if (loanId === 'cancel') {
      console.log(chalk.yellow('Delete operation cancelled.'));
      return;
    }

    const loan = loans.find(l => l.id === loanId);
    if (!loan) {
      console.log(chalk.red('❌ Loan not found.'));
      return;
    }

    // Confirm deletion
    const { confirmDelete } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmDelete',
        message: chalk.red(
          `Are you sure you want to delete the loan from ${loan.lenderName}? This action cannot be undone.`
        ),
        default: false,
      },
    ]);

    if (!confirmDelete) {
      console.log(chalk.yellow('Delete operation cancelled.'));
      return;
    }

    const spinner = createSpinner('Deleting loan...').start();

    try {
      const deleted = await this.loanService.deleteLoan(loanId);

      if (deleted) {
        spinner.success({ text: 'Loan deleted successfully!' });
        console.log(
          boxen(
            chalk.green('✅ Loan Deleted Successfully!') +
              '\n\n' +
              chalk.gray(
                'The loan has been permanently removed from your records.'
              ),
            {
              padding: 1,
              margin: 1,
              borderStyle: 'round',
              borderColor: 'green',
              textAlignment: 'center',
            }
          )
        );
      } else {
        spinner.error({ text: 'Failed to delete loan' });
        console.log(chalk.red('❌ Loan could not be deleted.'));
      }
    } catch (error) {
      spinner.error({ text: 'Failed to delete loan' });
      throw error;
    }
  }

  private async showLoanSummary(): Promise<void> {
    console.log('\n' + chalk.bold('📊 Loan Summary'));

    const spinner = createSpinner('Generating loan summary...').start();

    try {
      const loans = await this.loanService.getLoans();
      spinner.stop();

      if (loans.length === 0) {
        console.log(
          boxen(
            chalk.yellow(
              '📂 No loans found.\nAdd some loans to see your summary!'
            ),
            {
              padding: 1,
              margin: 1,
              borderStyle: 'round',
              borderColor: 'yellow',
              textAlignment: 'center',
            }
          )
        );
        return;
      }

      const totalLoans = loans.length;
      const paidLoans = loans.filter(loan => loan.isPaid);
      const unpaidLoans = loans.filter(loan => !loan.isPaid);
      const overdueLoans = loans.filter(loan => loan.isOverdue());

      const totalAmount = loans.reduce(
        (sum, loan) => sum + loan.calculateTotalWithInterest(),
        0
      );
      const paidAmount = paidLoans.reduce(
        (sum, loan) => sum + loan.calculateTotalWithInterest(),
        0
      );
      const unpaidAmount = unpaidLoans.reduce(
        (sum, loan) => sum + loan.calculateTotalWithInterest(),
        0
      );
      const overdueAmount = overdueLoans.reduce(
        (sum, loan) => sum + loan.calculateTotalWithInterest(),
        0
      );

      console.log(
        boxen(
          chalk.cyan.bold('📊 LOAN SUMMARY REPORT') +
            '\n\n' +
            chalk.white('═══ OVERVIEW ═══') +
            '\n' +
            chalk.white('Total Loans: ') +
            chalk.yellow(totalLoans.toString()) +
            '\n' +
            chalk.white('Paid Loans: ') +
            chalk.green(paidLoans.length.toString()) +
            '\n' +
            chalk.white('Unpaid Loans: ') +
            chalk.yellow(unpaidLoans.length.toString()) +
            '\n' +
            chalk.white('Overdue Loans: ') +
            chalk.red(overdueLoans.length.toString()) +
            '\n\n' +
            chalk.white('═══ FINANCIAL SUMMARY ═══') +
            '\n' +
            chalk.white('Total Amount: ') +
            chalk.cyan(formatCurrency(totalAmount)) +
            '\n' +
            chalk.white('Paid Amount: ') +
            chalk.green(formatCurrency(paidAmount)) +
            '\n' +
            chalk.white('Outstanding: ') +
            chalk.yellow(formatCurrency(unpaidAmount)) +
            '\n' +
            chalk.white('Overdue Amount: ') +
            chalk.red(formatCurrency(overdueAmount)) +
            '\n\n' +
            chalk.white('═══ COMPLETION RATE ═══') +
            '\n' +
            chalk.white('Payment Rate: ') +
            chalk.cyan(`${Math.round((paidLoans.length / totalLoans) * 100)}%`),
          {
            padding: 1,
            margin: 1,
            borderStyle: 'double',
            borderColor: 'cyan',
            textAlignment: 'left',
          }
        )
      );
    } catch (error) {
      spinner.error({ text: 'Failed to generate summary' });
      throw error;
    }
  }

  // Helper methods
  private filterLoans(loans: LoanModel[], filter: string): LoanModel[] {
    const now = new Date();
    const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    switch (filter) {
      case 'paid':
        return loans.filter(loan => loan.isPaid);
      case 'pending':
        return loans.filter(loan => !loan.isPaid && !loan.isOverdue());
      case 'overdue':
        return loans.filter(loan => loan.isOverdue());
      case 'thisWeek':
        return loans.filter(loan => {
          const dueDate = new Date(loan.repaymentDate);
          return dueDate <= oneWeek && dueDate >= now && !loan.isPaid;
        });
      case 'thisMonth':
        return loans.filter(loan => {
          const dueDate = new Date(loan.repaymentDate);
          return dueDate <= oneMonth && dueDate >= now && !loan.isPaid;
        });
      default:
        return loans;
    }
  }

  private sortLoans(loans: LoanModel[], sortBy: string): LoanModel[] {
    switch (sortBy) {
      case 'dueDate':
        return loans.sort(
          (a, b) =>
            new Date(a.repaymentDate).getTime() -
            new Date(b.repaymentDate).getTime()
        );
      case 'amountDesc':
        return loans.sort(
          (a, b) =>
            b.calculateTotalWithInterest() - a.calculateTotalWithInterest()
        );
      case 'amountAsc':
        return loans.sort(
          (a, b) =>
            a.calculateTotalWithInterest() - b.calculateTotalWithInterest()
        );
      case 'lenderName':
        return loans.sort((a, b) => a.lenderName.localeCompare(b.lenderName));
      case 'status':
        return loans.sort((a, b) => {
          const statusA = a.isPaid
            ? 'paid'
            : a.isOverdue()
              ? 'overdue'
              : 'pending';
          const statusB = b.isPaid
            ? 'paid'
            : b.isOverdue()
              ? 'overdue'
              : 'pending';
          return statusA.localeCompare(statusB);
        });
      default:
        return loans;
    }
  }

  private searchLoansWithCriteria(
    loans: LoanModel[],
    searchParams: any
  ): LoanModel[] {
    switch (searchParams.type) {
      case 'lenderName':
        return loans.filter(loan =>
          loan.lenderName
            .toLowerCase()
            .includes(searchParams.value.toLowerCase())
        );
      case 'phoneNumber':
        return loans.filter(loan =>
          loan.phoneNumber.includes(searchParams.value)
        );
      case 'amountRange':
        return loans.filter(loan => {
          const amount = loan.calculateTotalWithInterest();
          return amount >= searchParams.min && amount <= searchParams.max;
        });
      case 'dateRange':
        return loans.filter(loan => {
          const dueDate = new Date(loan.repaymentDate);
          const startDate = new Date(searchParams.start);
          const endDate = new Date(searchParams.end);
          return dueDate >= startDate && dueDate <= endDate;
        });
      case 'status':
        if (searchParams.value === 'paid') {
          return loans.filter(loan => loan.isPaid);
        } else if (searchParams.value === 'overdue') {
          return loans.filter(loan => loan.isOverdue());
        } else if (searchParams.value === 'pending') {
          return loans.filter(loan => !loan.isPaid && !loan.isOverdue());
        }
        return loans;
      default:
        return loans;
    }
  }

  private displayLoansTable(loans: LoanModel[]): void {
    const table = new Table({
      head: [
        chalk.cyan('Lender'),
        chalk.cyan('Phone'),
        chalk.cyan('Amount'),
        chalk.cyan('Due Date'),
        chalk.cyan('Status'),
      ],
      colWidths: [20, 15, 15, 12, 12],
    });

    loans.forEach(loan => {
      const status = loan.isPaid
        ? chalk.green('Paid')
        : loan.isOverdue()
          ? chalk.red('Overdue')
          : chalk.yellow('Pending');

      table.push([
        loan.lenderName,
        loan.phoneNumber,
        formatCurrency(loan.calculateTotalWithInterest()),
        formatDate(loan.repaymentDate),
        status,
      ]);
    });

    console.log(table.toString());
  }
}
