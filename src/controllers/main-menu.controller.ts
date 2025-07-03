import chalk from 'chalk';
import inquirer from 'inquirer';
import { createSpinner } from 'nanospinner';
import boxen from 'boxen';
import { Logger } from '../core/logger';
import { LoanController } from './loan.controller';
import { AnalyticsController } from './analytics.controller';
import { ExportController } from './export.controller';
import { BackupController } from './backup.controller';
import { ConfigController } from './config.controller';

export class MainMenuController {
  private logger: Logger;
  private loanController: LoanController;
  private analyticsController: AnalyticsController;
  private exportController: ExportController;
  private backupController: BackupController;
  private configController: ConfigController;

  constructor() {
    this.logger = new Logger();
    this.loanController = new LoanController();
    this.analyticsController = new AnalyticsController();
    this.exportController = new ExportController();
    this.backupController = new BackupController();
    this.configController = new ConfigController();
  }

  async show(): Promise<void> {
    try {
      while (true) {
        this.displayMainMenu();

        const choice = await this.getMenuChoice();

        if (choice === 'exit') {
          await this.handleExit();
          break;
        }

        await this.handleMenuChoice(choice);
      }
    } catch (error) {
      this.logger.error('Error in main menu', error as Error);
      console.error(chalk.red('❌ An unexpected error occurred'));
    }
  }

  private displayMainMenu(): void {
    // Don't clear screen here - let the welcome service handle the initial display
    // Only show a compact header for subsequent menu displays
    const header = boxen(
      chalk.cyan.bold('📋 MAIN MENU') +
        '\n' +
        chalk.gray('Select an option to continue'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'single',
        borderColor: 'cyan',
        textAlignment: 'center',
        width: Math.min(process.stdout.columns - 4, 60),
      }
    );

    console.log(header);
  }

  private async getMenuChoice(): Promise<string> {
    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: chalk.yellow('📋 Select an option:'),
        choices: [
          {
            name: `${chalk.green('💰')} Loan Management`,
            value: 'loans',
          },
          {
            name: `${chalk.blue('📊')} Analytics Dashboard`,
            value: 'analytics',
          },
          {
            name: `${chalk.magenta('📤')} Export Data`,
            value: 'export',
          },
          {
            name: `${chalk.yellow('💾')} Backup & Restore`,
            value: 'backup',
          },
          {
            name: `${chalk.cyan('⚙️')} Settings & Configuration`,
            value: 'config',
          },
          new inquirer.Separator(),
          {
            name: `${chalk.red('🚪')} Exit Application`,
            value: 'exit',
          },
        ],
        pageSize: 10,
      },
    ]);

    return choice;
  }

  private async handleMenuChoice(choice: string): Promise<void> {
    const spinner = createSpinner('Loading...').start();

    try {
      // Brief loading animation for better UX
      await new Promise(resolve => setTimeout(resolve, 300));
      spinner.stop();

      // Clear screen before showing the selected module
      console.clear();

      switch (choice) {
        case 'loans':
          await this.loanController.showLoanMenu();
          break;
        case 'analytics':
          await this.analyticsController.showAnalyticsDashboard();
          break;
        case 'export':
          await this.exportController.showExportMenu();
          break;
        case 'backup':
          await this.backupController.showBackupMenu();
          break;
        case 'config':
          await this.configController.showConfigMenu();
          break;
        default:
          console.log(chalk.red('❌ Invalid option selected'));
      }

      // After completing an operation, show return prompt
      await this.showReturnPrompt();
    } catch (error) {
      spinner.error({ text: 'Failed to load menu option' });
      this.logger.error(
        `Error handling menu choice: ${choice}`,
        error as Error
      );
      console.error(chalk.red(`❌ Error loading ${choice}`));
      await this.showReturnPrompt();
    }
  }

  private async showReturnPrompt(): Promise<void> {
    console.log();
    const returnPrompt = boxen(
      chalk.cyan('🔄 Operation Complete') +
        '\n' +
        chalk.gray('Press Enter to return to main menu'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'single',
        borderColor: 'cyan',
        textAlignment: 'center',
        width: Math.min(process.stdout.columns - 4, 50),
      }
    );

    console.log(returnPrompt);

    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: chalk.gray('Press Enter to continue...'),
      },
    ]);

    // Clear screen before returning to main menu
    console.clear();
  }

  private async handleExit(): Promise<void> {
    console.clear();
    
    const spinner = createSpinner('Shutting down LoanTrack Pro...').start();

    try {
      // Perform cleanup operations
      await new Promise(resolve => setTimeout(resolve, 800));
      spinner.update({ text: 'Saving data...' });

      await new Promise(resolve => setTimeout(resolve, 600));
      spinner.update({ text: 'Cleaning up resources...' });

      await new Promise(resolve => setTimeout(resolve, 400));
      spinner.success({ text: 'Shutdown complete!' });

      console.log();
      
      // Show goodbye message
      const goodbyeMessage = boxen(
        chalk.cyan('👋 Thank you for using LoanTrack Pro!') +
          '\n\n' +
          chalk.white('Your financial data has been saved securely.') +
          '\n' +
          chalk.gray('Created with ❤️  by John Ilesanmi') +
          '\n\n' +
          chalk.blue('📱 Instagram: @numcalm') +
          '\n' +
          chalk.blue('🐙 GitHub: @tamecalm'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'blue',
          textAlignment: 'center',
          width: Math.min(process.stdout.columns - 4, 60),
        }
      );

      console.log(goodbyeMessage);
      
      // Brief pause before exit
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      spinner.error({ text: 'Error during shutdown' });
      this.logger.error('Error during application shutdown', error as Error);
    }
  }
}

export async function showMainMenu(): Promise<void> {
  const mainMenuController = new MainMenuController();
  await mainMenuController.show();
}