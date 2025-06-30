import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import { createSpinner } from 'nanospinner';
import { Logger } from '../core/logger';
import { ConfigManager } from '../core/config-manager';
import { ErrorHandler } from '../core/error-handler';
import { showMainMenu } from './main-menu.controller';

export class AppController {
  private logger: Logger;
  private configManager: ConfigManager;
  private errorHandler: ErrorHandler;

  constructor() {
    this.logger = new Logger();
    this.configManager = new ConfigManager();
    this.errorHandler = new ErrorHandler();
  }

  async initialize(): Promise<void> {
    try {
      const spinner = createSpinner('Initializing LoanTrack Pro...').start();
      
      // Initialize configuration
      await this.configManager.initialize();
      
      // Setup error handling
      this.errorHandler.setup();
      
      spinner.success({ text: 'LoanTrack Pro initialized successfully!' });
      
      // Show welcome banner
      await this.showWelcomeBanner();
      
      // Start main application
      await showMainMenu();
      
    } catch (error) {
      this.logger.error('Failed to initialize application', error as Error);
      console.error(chalk.red('❌ Failed to start LoanTrack Pro'));
      process.exit(1);
    }
  }

  private async showWelcomeBanner(): Promise<void> {
    console.clear();
    
    // ASCII Art Title
    const title = figlet.textSync('LoanTrack Pro', {
      font: 'Big',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    });
    
    console.log(gradient.rainbow(title));
    console.log();
    
    // Author Information
    const authorBox = `
╔══════════════════════════════════════════════════════════════╗
║                        AUTHOR INFORMATION                     ║
╠══════════════════════════════════════════════════════════════╣
║  👨‍💻 Developer: ${chalk.cyan('John Ilesanmi')}                              ║
║  📱 Instagram: ${chalk.magenta('@numcalm')}                                ║
║  🐙 GitHub: ${chalk.blue('@tamecalm')}                                   ║
║  📅 Start Date: ${chalk.yellow('27th July 2025')}                          ║
║  🚀 Version: ${chalk.green('2.0.0')} - Professional Edition              ║
╚══════════════════════════════════════════════════════════════╝
    `;
    
    console.log(chalk.white(authorBox));
    console.log();
    
    // Welcome message
    console.log(chalk.green('🎉 Welcome to LoanTrack Pro - Your World-Class Loan Management Toolkit!'));
    console.log(chalk.gray('   Built specifically for Termux with professional-grade features'));
    console.log();
    
    // Brief pause for effect
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down LoanTrack Pro...');
      
      console.log();
      console.log(chalk.cyan('👋 Thank you for using LoanTrack Pro!'));
      console.log(chalk.gray('   Created with ❤️  by John Ilesanmi (@numcalm)'));
      console.log();
      
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during shutdown', error as Error);
      process.exit(1);
    }
  }
}