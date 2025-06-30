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
        console.clear();
        this.displayHeader();
        
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

  private displayHeader(): void {
    const header = boxen(
      chalk.cyan.bold('🏦 LOANTRACK PRO - MAIN MENU') + '\n' +
      chalk.gray('Professional Loan Management Toolkit'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'cyan',
        textAlignment: 'center'
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
            value: 'loans'
          },
          {
            name: `${chalk.blue('📊')} Analytics Dashboard`,
            value: 'analytics'
          },
          {
            name: `${chalk.magenta('📤')} Export Data`,
            value: 'export'
          },
          {
            name: `${chalk.yellow('💾')} Backup & Restore`,
            value: 'backup'
          },
          {
            name: `${chalk.cyan('⚙️')} Settings & Configuration`,
            value: 'config'
          },
          new inquirer.Separator(),
          {
            name: `${chalk.red('🚪')} Exit Application`,
            value: 'exit'
          }
        ],
        pageSize: 10
      }
    ]);

    return choice;
  }

  private async handleMenuChoice(choice: string): Promise<void> {
    const spinner = createSpinner('Loading...').start();
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief loading animation
      spinner.stop();

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

      // Pause before returning to menu
      await this.pauseForUser();
      
    } catch (error) {
      spinner.error({ text: 'Failed to load menu option' });
      this.logger.error(`Error handling menu choice: ${choice}`, error as Error);
      console.error(chalk.red(`❌ Error loading ${choice}`));
      await this.pauseForUser();
    }
  }

  private async handleExit(): Promise<void> {
    const spinner = createSpinner('Shutting down LoanTrack Pro...').start();
    
    try {
      // Perform cleanup operations
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      spinner.success({ text: 'Shutdown complete!' });
      
      console.log();
      console.log(boxen(
        chalk.cyan('👋 Thank you for using LoanTrack Pro!') + '\n' +
        chalk.gray('Created with ❤️  by John Ilesanmi') + '\n' +
        chalk.blue('Instagram: @numcalm | GitHub: @tamecalm'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'blue',
          textAlignment: 'center'
        }
      ));
      
    } catch (error) {
      spinner.error({ text: 'Error during shutdown' });
      this.logger.error('Error during application shutdown', error as Error);
    }
  }

  private async pauseForUser(): Promise<void> {
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: chalk.gray('Press Enter to continue...'),
      }
    ]);
  }
}

export async function showMainMenu(): Promise<void> {
  const mainMenuController = new MainMenuController();
  await mainMenuController.show();
}
