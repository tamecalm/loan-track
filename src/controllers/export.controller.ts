import chalk from 'chalk';
import inquirer from 'inquirer';
import boxen from 'boxen';
import { createSpinner } from 'nanospinner';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../core/logger';
import { ExportService } from '../services/export.service';
import { LoanService } from '../services/loan.service';
import { AnalyticsService } from '../services/analytics.service';
import { formatCurrency } from '../utils/format.utils';

export class ExportController {
  private logger: Logger;
  private exportService: ExportService;
  private loanService: LoanService;
  private analyticsService: AnalyticsService;

  constructor() {
    this.logger = new Logger();
    this.exportService = new ExportService();
    this.loanService = new LoanService();
    this.analyticsService = new AnalyticsService();
  }

  async showExportMenu(): Promise<void> {
    try {
      console.clear();
      this.displayExportHeader();

      const choice = await this.getExportMenuChoice();

      if (choice === 'back') {
        return;
      }

      await this.handleExportChoice(choice);
    } catch (error) {
      this.logger.error('Error in export menu', error as Error);
      console.error(chalk.red('❌ Failed to load export menu'));
    }
  }

  private displayExportHeader(): void {
    const header = boxen(
      chalk.magenta.bold('📤 DATA EXPORT CENTER') +
        '\n' +
        chalk.gray('Export Your Loan Data in Multiple Formats'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'magenta',
        textAlignment: 'center',
      }
    );

    console.log(header);
  }

  private async getExportMenuChoice(): Promise<string> {
    const loans = await this.loanService.getLoans();
    const loanCount = loans.length;
    const totalDebt = this.loanService.getTotalDebt(loans);

    // Show quick stats
    console.log(
      boxen(
        chalk.cyan('📊 Export Overview') +
          '\n\n' +
          chalk.white('Total Loans: ') +
          chalk.yellow(loanCount.toString()) +
          '\n' +
          chalk.white('Total Debt: ') +
          chalk.green(formatCurrency(totalDebt)) +
          '\n' +
          chalk.white('Ready for Export: ') +
          (loanCount > 0 ? chalk.green('Yes') : chalk.red('No')),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
          textAlignment: 'left',
        }
      )
    );

    if (loanCount === 0) {
      console.log(
        boxen(
          chalk.yellow(
            '📂 No data available for export.\nAdd some loans first to enable export features!'
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
      return 'back';
    }

    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: chalk.yellow('📤 Select export format:'),
        choices: [
          {
            name: `${chalk.green('📄')} PDF Report (Professional)`,
            value: 'pdf',
          },
          {
            name: `${chalk.blue('📊')} Excel Spreadsheet (.xlsx)`,
            value: 'excel',
          },
          {
            name: `${chalk.cyan('📋')} CSV File (Comma Separated)`,
            value: 'csv',
          },
          {
            name: `${chalk.yellow('📝')} Text Report (.txt)`,
            value: 'text',
          },
          {
            name: `${chalk.magenta('🔗')} JSON Data (.json)`,
            value: 'json',
          },
          {
            name: `${chalk.yellow('📈')} Analytics Report`,
            value: 'analytics',
          },
          {
            name: `${chalk.red('📧')} Email Report`,
            value: 'email',
          },
          {
            name: `${chalk.green('🎯')} Custom Export`,
            value: 'custom',
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

  private async handleExportChoice(choice: string): Promise<void> {
    try {
      switch (choice) {
        case 'pdf':
          await this.exportToPDF();
          break;
        case 'excel':
          await this.exportToExcel();
          break;
        case 'csv':
          await this.exportToCSV();
          break;
        case 'text':
          await this.exportToText();
          break;
        case 'json':
          await this.exportToJSON();
          break;
        case 'analytics':
          await this.exportAnalyticsReport();
          break;
        case 'email':
          await this.emailReport();
          break;
        case 'custom':
          await this.customExport();
          break;
      }

      // Ask if user wants to export in another format
      const { exportAnother } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'exportAnother',
          message: 'Would you like to export in another format?',
          default: false,
        },
      ]);

      if (exportAnother) {
        await this.showExportMenu();
      }
    } catch (error) {
      this.logger.error(
        `Error handling export choice: ${choice}`,
        error as Error
      );
      console.error(chalk.red(`❌ Failed to export as ${choice}`));
    }
  }

  private async exportToPDF(): Promise<void> {
    console.log('\n' + chalk.bold('📄 PDF Export'));

    const pdfOptions = await inquirer.prompt([
      {
        type: 'input',
        name: 'filename',
        message: 'Enter PDF filename:',
        default: `loan-report-${new Date().toISOString().split('T')[0]}.pdf`,
        validate: input =>
          input.trim().length > 0 || 'Filename cannot be empty',
      },
      {
        type: 'list',
        name: 'template',
        message: 'Select PDF template:',
        choices: [
          { name: '📊 Professional Report', value: 'professional' },
          { name: '📋 Simple List', value: 'simple' },
          { name: '📈 Analytics Summary', value: 'analytics' },
          { name: '💼 Business Format', value: 'business' },
        ],
      },
      {
        type: 'checkbox',
        name: 'sections',
        message: 'Include sections:',
        choices: [
          { name: 'Loan Summary', value: 'summary', checked: true },
          { name: 'Detailed Loan List', value: 'details', checked: true },
          { name: 'Payment Status', value: 'status', checked: true },
          { name: 'Overdue Analysis', value: 'overdue', checked: true },
          { name: 'Financial Analytics', value: 'analytics', checked: false },
          { name: 'Charts & Graphs', value: 'charts', checked: false },
        ],
        validate: input => input.length > 0 || 'Select at least one section',
      },
      {
        type: 'list',
        name: 'orientation',
        message: 'Page orientation:',
        choices: [
          { name: 'Portrait', value: 'portrait' },
          { name: 'Landscape', value: 'landscape' },
        ],
        default: 'portrait',
      },
      {
        type: 'confirm',
        name: 'includeCharts',
        message: 'Include visual charts and graphs?',
        default: true,
      },
    ]);

    const spinner = createSpinner('Generating PDF report...').start();

    try {
      const loans = await this.loanService.getLoans();
      const filePath = path.join(
        process.cwd(),
        'data',
        'exports',
        pdfOptions.filename
      );

      const fileSize = await this.exportService.exportToPdf(loans, filePath, {
        format: 'pdf',
        includeMetadata: true,
      });

      spinner.success({ text: 'PDF report generated successfully!' });

      console.log(
        boxen(
          chalk.green('✅ PDF Export Complete!') +
            '\n\n' +
            chalk.cyan('📁 File: ') +
            chalk.white(pdfOptions.filename) +
            '\n' +
            chalk.cyan('📍 Location: ') +
            chalk.white(filePath) +
            '\n' +
            chalk.cyan('📊 Records: ') +
            chalk.white(loans.length.toString()) +
            '\n' +
            chalk.cyan('📏 Size: ') +
            chalk.white(`${Math.round(fileSize / 1024)} KB`) +
            '\n' +
            chalk.cyan('🕒 Generated: ') +
            chalk.white(new Date().toLocaleString()),
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
      spinner.error({ text: 'Failed to generate PDF' });
      throw error;
    }
  }

  private async exportToExcel(): Promise<void> {
    console.log('\n' + chalk.bold('📊 Excel Export'));

    console.log(
      boxen(
        chalk.yellow('⚠️ Excel Export Not Available') +
          '\n\n' +
          chalk.white('Excel export functionality is not yet implemented.\n') +
          chalk.white(
            'Please use CSV export as an alternative for spreadsheet data.'
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
  }

  private async exportToCSV(): Promise<void> {
    console.log('\n' + chalk.bold('📋 CSV Export'));

    const csvOptions = await inquirer.prompt([
      {
        type: 'input',
        name: 'filename',
        message: 'Enter CSV filename:',
        default: `loan-data-${new Date().toISOString().split('T')[0]}.csv`,
        validate: input =>
          input.trim().length > 0 || 'Filename cannot be empty',
      },
      {
        type: 'list',
        name: 'delimiter',
        message: 'Field delimiter:',
        choices: [
          { name: 'Comma (,)', value: ',' },
          { name: 'Semicolon (;)', value: ';' },
          { name: 'Tab', value: '\t' },
          { name: 'Pipe (|)', value: '|' },
        ],
        default: ',',
      },
      {
        type: 'checkbox',
        name: 'fields',
        message: 'Include fields:',
        choices: [
          { name: 'Loan ID', value: 'id', checked: true },
          { name: 'Lender Name', value: 'lenderName', checked: true },
          { name: 'Phone Number', value: 'phoneNumber', checked: true },
          { name: 'Amount', value: 'amount', checked: true },
          { name: 'Interest Rate', value: 'interestRate', checked: true },
          {
            name: 'Total with Interest',
            value: 'totalWithInterest',
            checked: true,
          },
          { name: 'Repayment Date', value: 'repaymentDate', checked: true },
          { name: 'Status', value: 'status', checked: true },
          { name: 'Days Overdue', value: 'daysOverdue', checked: false },
          { name: 'Created Date', value: 'createdDate', checked: false },
        ],
        validate: input => input.length > 0 || 'Select at least one field',
      },
      {
        type: 'list',
        name: 'encoding',
        message: 'File encoding:',
        choices: [
          { name: 'UTF-8 (Recommended)', value: 'utf8' },
          { name: 'UTF-8 with BOM', value: 'utf8bom' },
          { name: 'ASCII', value: 'ascii' },
        ],
        default: 'utf8',
      },
      {
        type: 'confirm',
        name: 'includeHeaders',
        message: 'Include column headers?',
        default: true,
      },
    ]);

    const spinner = createSpinner('Generating CSV file...').start();

    try {
      const loans = await this.loanService.getLoans();
      const filePath = path.join(
        process.cwd(),
        'data',
        'exports',
        csvOptions.filename
      );

      const fileSize = await this.exportService.exportToCsv(loans, filePath, {
        format: 'csv',
        includeMetadata: csvOptions.includeHeaders,
      });

      spinner.success({ text: 'CSV file generated successfully!' });

      console.log(
        boxen(
          chalk.green('✅ CSV Export Complete!') +
            '\n\n' +
            chalk.cyan('📁 File: ') +
            chalk.white(csvOptions.filename) +
            '\n' +
            chalk.cyan('📍 Location: ') +
            chalk.white(filePath) +
            '\n' +
            chalk.cyan('📊 Records: ') +
            chalk.white(loans.length.toString()) +
            '\n' +
            chalk.cyan('📏 Size: ') +
            chalk.white(`${Math.round(fileSize / 1024)} KB`) +
            '\n' +
            chalk.cyan('🔤 Encoding: ') +
            chalk.white(csvOptions.encoding),
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
      spinner.error({ text: 'Failed to generate CSV file' });
      throw error;
    }
  }

  private async exportToText(): Promise<void> {
    console.log('\n' + chalk.bold('📝 Text Export'));

    const textOptions = await inquirer.prompt([
      {
        type: 'input',
        name: 'filename',
        message: 'Enter text filename:',
        default: `loan-report-${new Date().toISOString().split('T')[0]}.txt`,
        validate: input =>
          input.trim().length > 0 || 'Filename cannot be empty',
      },
      {
        type: 'list',
        name: 'format',
        message: 'Text format:',
        choices: [
          { name: '📋 Table Format', value: 'table' },
          { name: '📄 Report Format', value: 'report' },
          { name: '📝 List Format', value: 'list' },
          { name: '🔤 Plain Text', value: 'plain' },
        ],
      },
      {
        type: 'checkbox',
        name: 'sections',
        message: 'Include sections:',
        choices: [
          { name: 'Header Information', value: 'header', checked: true },
          { name: 'Loan Summary', value: 'summary', checked: true },
          { name: 'Detailed Loan List', value: 'details', checked: true },
          { name: 'Overdue Loans', value: 'overdue', checked: true },
          { name: 'Payment Statistics', value: 'stats', checked: false },
          { name: 'Footer Information', value: 'footer', checked: true },
        ],
        validate: input => input.length > 0 || 'Select at least one section',
      },
      {
        type: 'list',
        name: 'lineEnding',
        message: 'Line ending style:',
        choices: [
          { name: 'Unix/Linux (LF)', value: 'lf' },
          { name: 'Windows (CRLF)', value: 'crlf' },
          { name: 'Mac Classic (CR)', value: 'cr' },
        ],
        default: 'lf',
      },
    ]);

    const spinner = createSpinner('Generating text report...').start();

    try {
      const loans = await this.loanService.getLoans();
      const filePath = path.join(
        process.cwd(),
        'data',
        'exports',
        textOptions.filename
      );

      const fileSize = await this.exportService.exportToText(loans, filePath, {
        format: 'txt',
        includeMetadata: true,
      });

      spinner.success({ text: 'Text report generated successfully!' });

      console.log(
        boxen(
          chalk.green('✅ Text Export Complete!') +
            '\n\n' +
            chalk.cyan('📁 File: ') +
            chalk.white(textOptions.filename) +
            '\n' +
            chalk.cyan('📍 Location: ') +
            chalk.white(filePath) +
            '\n' +
            chalk.cyan('📊 Records: ') +
            chalk.white(loans.length.toString()) +
            '\n' +
            chalk.cyan('📏 Size: ') +
            chalk.white(`${Math.round(fileSize / 1024)} KB`) +
            '\n' +
            chalk.cyan('📝 Format: ') +
            chalk.white(textOptions.format),
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
      spinner.error({ text: 'Failed to generate text file' });
      throw error;
    }
  }

  private async exportToJSON(): Promise<void> {
    console.log('\n' + chalk.bold('🔗 JSON Export'));

    const jsonOptions = await inquirer.prompt([
      {
        type: 'input',
        name: 'filename',
        message: 'Enter JSON filename:',
        default: `loan-data-${new Date().toISOString().split('T')[0]}.json`,
        validate: input =>
          input.trim().length > 0 || 'Filename cannot be empty',
      },
      {
        type: 'list',
        name: 'structure',
        message: 'JSON structure:',
        choices: [
          { name: '📊 Structured (with metadata)', value: 'structured' },
          { name: '📋 Simple array', value: 'simple' },
          { name: '🎯 Compact (minified)', value: 'compact' },
          { name: '📈 With analytics', value: 'analytics' },
        ],
      },
      {
        type: 'confirm',
        name: 'prettyPrint',
        message: 'Format JSON for readability?',
        default: true,
        when: answers => answers.structure !== 'compact',
      },
      {
        type: 'checkbox',
        name: 'includeFields',
        message: 'Include additional fields:',
        choices: [
          { name: 'Calculated totals', value: 'totals', checked: true },
          { name: 'Status indicators', value: 'status', checked: true },
          { name: 'Export metadata', value: 'metadata', checked: true },
          { name: 'Validation info', value: 'validation', checked: false },
        ],
      },
    ]);

    const spinner = createSpinner('Generating JSON file...').start();

    try {
      const loans = await this.loanService.getLoans();
      const filePath = path.join(
        process.cwd(),
        'data',
        'exports',
        jsonOptions.filename
      );

      const fileSize = await this.exportService.exportToJson(loans, filePath, {
        format: 'json',
        includeMetadata: jsonOptions.prettyPrint,
      });

      spinner.success({ text: 'JSON file generated successfully!' });

      console.log(
        boxen(
          chalk.green('✅ JSON Export Complete!') +
            '\n\n' +
            chalk.cyan('📁 File: ') +
            chalk.white(jsonOptions.filename) +
            '\n' +
            chalk.cyan('📍 Location: ') +
            chalk.white(filePath) +
            '\n' +
            chalk.cyan('📊 Records: ') +
            chalk.white(loans.length.toString()) +
            '\n' +
            chalk.cyan('📏 Size: ') +
            chalk.white(`${Math.round(fileSize / 1024)} KB`) +
            '\n' +
            chalk.cyan('🎯 Structure: ') +
            chalk.white(jsonOptions.structure),
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
      spinner.error({ text: 'Failed to generate JSON file' });
      throw error;
    }
  }

  private async exportAnalyticsReport(): Promise<void> {
    console.log('\n' + chalk.bold('📈 Analytics Report Export'));

    console.log(
      boxen(
        chalk.yellow('⚠️ Analytics Report Not Available') +
          '\n\n' +
          chalk.white(
            'Advanced analytics reporting is not yet implemented.\n'
          ) +
          chalk.white(
            'Please use the basic export formats (PDF, CSV, JSON) for now.'
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
  }

  private async emailReport(): Promise<void> {
    console.log('\n' + chalk.bold('📧 Email Report'));

    console.log(
      boxen(
        chalk.yellow('⚠️ Email Feature Not Available') +
          '\n\n' +
          chalk.white('Email functionality is not yet implemented.\n') +
          chalk.white('Please export your data and send it manually.'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'yellow',
          textAlignment: 'center',
        }
      )
    );
  }

  private async customExport(): Promise<void> {
    console.log('\n' + chalk.bold('🎯 Custom Export'));

    const customOptions = await inquirer.prompt([
      {
        type: 'input',
        name: 'filename',
        message: 'Enter custom filename:',
        default: `custom-export-${new Date().toISOString().split('T')[0]}`,
        validate: input =>
          input.trim().length > 0 || 'Filename cannot be empty',
      },
      {
        type: 'list',
        name: 'format',
        message: 'Export format:',
        choices: [
          { name: 'JSON', value: 'json' },
          { name: 'CSV', value: 'csv' },
          { name: 'Text', value: 'txt' },
        ],
      },
      {
        type: 'checkbox',
        name: 'filters',
        message: 'Apply filters:',
        choices: [
          { name: 'Paid loans only', value: 'paid' },
          { name: 'Unpaid loans only', value: 'unpaid' },
          { name: 'Overdue loans only', value: 'overdue' },
          { name: 'Loans with interest', value: 'withInterest' },
          { name: 'Loans without interest', value: 'withoutInterest' },
          { name: 'Recent loans (last 30 days)', value: 'recent' },
        ],
      },
      {
        type: 'checkbox',
        name: 'customFields',
        message: 'Select fields to include:',
        choices: [
          { name: 'Loan ID', value: 'id', checked: true },
          { name: 'Lender Name', value: 'lenderName', checked: true },
          { name: 'Phone Number', value: 'phoneNumber', checked: false },
          { name: 'Amount', value: 'amount', checked: true },
          { name: 'Interest Rate', value: 'interestRate', checked: true },
          { name: 'Total Amount', value: 'totalAmount', checked: true },
          { name: 'Repayment Date', value: 'repaymentDate', checked: true },
          { name: 'Status', value: 'status', checked: true },
          { name: 'Days Overdue', value: 'daysOverdue', checked: false },
          { name: 'Created Date', value: 'createdDate', checked: false },
          { name: 'Last Modified', value: 'lastModified', checked: false },
        ],
        validate: input => input.length > 0 || 'Select at least one field',
      },
      {
        type: 'list',
        name: 'sortBy',
        message: 'Sort by:',
        choices: [
          { name: 'Lender Name', value: 'lenderName' },
          { name: 'Amount (High to Low)', value: 'amountDesc' },
          { name: 'Amount (Low to High)', value: 'amountAsc' },
          { name: 'Repayment Date', value: 'repaymentDate' },
          { name: 'Status', value: 'status' },
          { name: 'Created Date', value: 'createdDate' },
        ],
      },
      {
        type: 'confirm',
        name: 'includeMetadata',
        message: 'Include export metadata?',
        default: true,
      },
    ]);

    const spinner = createSpinner('Generating custom export...').start();

    try {
      const loans = await this.loanService.getLoans();
      let filteredLoans = [...loans];

      // Apply filters
      if (customOptions.filters.includes('paid')) {
        filteredLoans = filteredLoans.filter(loan => loan.isPaid);
      }
      if (customOptions.filters.includes('unpaid')) {
        filteredLoans = filteredLoans.filter(loan => !loan.isPaid);
      }
      if (customOptions.filters.includes('overdue')) {
        filteredLoans = filteredLoans.filter(loan => loan.isOverdue());
      }
      if (customOptions.filters.includes('withInterest')) {
        filteredLoans = filteredLoans.filter(
          loan => loan.interestRate && loan.interestRate > 0
        );
      }
      if (customOptions.filters.includes('withoutInterest')) {
        filteredLoans = filteredLoans.filter(
          loan => !loan.interestRate || loan.interestRate === 0
        );
      }
      if (customOptions.filters.includes('recent')) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filteredLoans = filteredLoans.filter(
          loan => new Date(loan.repaymentDate) >= thirtyDaysAgo
        );
      }

      const filename = `${customOptions.filename}.${customOptions.format}`;
      const filePath = path.join(process.cwd(), 'data', 'exports', filename);

      let fileSize = 0;

      switch (customOptions.format) {
        case 'json':
          fileSize = await this.exportService.exportToJson(
            filteredLoans,
            filePath,
            {
              format: 'json',
              includeMetadata: customOptions.includeMetadata,
            }
          );
          break;
        case 'csv':
          fileSize = await this.exportService.exportToCsv(
            filteredLoans,
            filePath,
            {
              format: 'csv',
              includeMetadata: customOptions.includeMetadata,
            }
          );
          break;
        case 'txt':
          fileSize = await this.exportService.exportToText(
            filteredLoans,
            filePath,
            {
              format: 'txt',
              includeMetadata: customOptions.includeMetadata,
            }
          );
          break;
      }

      spinner.success({ text: 'Custom export generated successfully!' });

      console.log(
        boxen(
          chalk.green('✅ Custom Export Complete!') +
            '\n\n' +
            chalk.cyan('📁 File: ') +
            chalk.white(filename) +
            '\n' +
            chalk.cyan('📍 Location: ') +
            chalk.white(filePath) +
            '\n' +
            chalk.cyan('📊 Records: ') +
            chalk.white(filteredLoans.length.toString()) +
            '\n' +
            chalk.cyan('🎯 Filters Applied: ') +
            chalk.white(customOptions.filters.join(', ') || 'None') +
            '\n' +
            chalk.cyan('📏 Size: ') +
            chalk.white(`${Math.round(fileSize / 1024)} KB`),
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
      spinner.error({ text: 'Failed to generate custom export' });
      throw error;
    }
  }
}
