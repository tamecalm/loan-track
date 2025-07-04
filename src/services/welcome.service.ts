import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import boxen from 'boxen';
import { createSpinner } from 'nanospinner';
import cliProgress from 'cli-progress';
import { Logger } from '../core/logger';
import { ConfigManager } from '../core/config-manager';
import { StorageService } from './storage.service';
import { LoanService } from './loan.service';
import { formatCurrency } from '../utils/format.utils';

export interface WelcomeStats {
  totalLoans: number;
  totalAmount: number;
  overdueLoans: number;
  paidLoans: number;
  pendingLoans: number;
  nextDueDate: string | null;
  lastActivity: string | null;
}

export interface WelcomeMessage {
  type: 'first-time' | 'returning' | 'reminder' | 'celebration';
  title: string;
  message: string;
  action?: string;
}

export interface UserPreferences {
  showWelcomeAnimation: boolean;
  showDailyStats: boolean;
  showReminders: boolean;
  preferredGreeting: 'formal' | 'casual' | 'professional';
  theme: 'default' | 'minimal' | 'colorful';
}

export class WelcomeService {
  private logger: Logger;
  private configManager: ConfigManager;
  private storageService: StorageService;
  private loanService: LoanService;

  constructor() {
    this.logger = new Logger();
    this.configManager = new ConfigManager();
    this.storageService = new StorageService();
    this.loanService = new LoanService();
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Welcome service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize welcome service', error as Error);
      throw error;
    }
  }

  // ==================== MAIN WELCOME DISPLAY ====================

  async showWelcome(): Promise<void> {
    try {
      console.clear();
      
      // Show standalone LoanTrack Pro message
      await this.showStandaloneBanner();
      
      // Show loading animation
      await this.showLoadingAnimation();
      
      // Clear and show sequential messages
      console.clear();
      await this.showSequentialMessages();
      
    } catch (error) {
      this.logger.error('Error showing welcome screen', error as Error);
      this.showFallbackWelcome();
    }
  }

  private async showStandaloneBanner(): Promise<void> {
    // Get terminal width for responsive design
    const terminalWidth = process.stdout.columns || 80;
    const maxWidth = Math.min(terminalWidth - 4, 70);

    const standaloneBanner = boxen(
      chalk.cyan.bold('🏦 LOANTRACK PRO') +
        '\n' +
        chalk.white('Professional Loan Management Toolkit') +
        '\n' +
        chalk.gray('Version 2.0.0 - Professional Edition') +
        '\n\n' +
        chalk.white('👨‍💻 Developer: ') +
        chalk.cyan('John Ilesanmi') +
        '\n' +
        chalk.white('📱 Instagram: ') +
        chalk.magenta('@numcalm') +
        '\n' +
        chalk.white('🐙 GitHub: ') +
        chalk.blue('@tamecalm') +
        '\n' +
        chalk.white('📅 Start Date: ') +
        chalk.yellow('27th July 2025'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        textAlignment: 'center',
        width: maxWidth,
      }
    );

    console.log(standaloneBanner);
    
    // Wait for user to read the banner
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  private async showLoadingAnimation(): Promise<void> {
    console.log();
    console.log(chalk.cyan('🚀 Initializing LoanTrack Pro...'));
    console.log();

    // Create progress bar
    const progressBar = new cliProgress.SingleBar({
      format: chalk.cyan('Loading') + ' |{bar}| {percentage}% | {value}/{total}',
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true,
      clearOnComplete: false,
      stopOnComplete: true,
    }, cliProgress.Presets.shades_classic);

    progressBar.start(100, 0);

    // Simulate loading from 1 to 100
    for (let i = 1; i <= 100; i++) {
      await new Promise(resolve => setTimeout(resolve, 30)); // 30ms per step = 3 seconds total
      progressBar.update(i);
    }

    progressBar.stop();
    console.log();
    console.log(chalk.green('✅ LoanTrack Pro loaded successfully!'));
    
    // Brief pause before continuing
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async showSequentialMessages(): Promise<void> {
    const preferences = await this.getUserPreferences();

    // Show messages one by one with delays
    if (preferences.showDailyStats) {
      await this.showDailyStatsSequential();
      await this.clearAndWait(3000); // 3 seconds to read
    }

    const welcomeMessage = await this.generateWelcomeMessage();
    await this.displayWelcomeMessageSequential(welcomeMessage);
    await this.clearAndWait(3000); // 3 seconds to read

    if (preferences.showReminders) {
      await this.showRemindersSequential();
      await this.clearAndWait(3000); // 3 seconds to read
    }

    await this.showQuickActionsSequential();
    await this.clearAndWait(3000); // 3 seconds to read

    // Final clear before main menu
    console.clear();
  }

  private async clearAndWait(delay: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, delay));
    console.clear();
  }

  private async showDailyStatsSequential(): Promise<void> {
    try {
      const stats = await this.getWelcomeStats();

      const statsDisplay = boxen(
        chalk.yellow.bold("📊 TODAY'S OVERVIEW") +
          '\n\n' +
          `${chalk.cyan('💰')} Total Loans: ${chalk.white.bold(stats.totalLoans.toString())}` +
          '\n' +
          `${chalk.green('💵')} Total Amount: ${chalk.white.bold(formatCurrency(stats.totalAmount))}` +
          '\n' +
          `${chalk.red('⚠️')} Overdue: ${chalk.white.bold(stats.overdueLoans.toString())}` +
          '\n' +
          `${chalk.blue('⏳')} Pending: ${chalk.white.bold(stats.pendingLoans.toString())}` +
          '\n' +
          `${chalk.green('✅')} Paid: ${chalk.white.bold(stats.paidLoans.toString())}` +
          (stats.nextDueDate
            ? '\n' +
              `${chalk.hex('#FFA500')('📅')} Next Due: ${chalk.white.bold(stats.nextDueDate)}`
            : ''),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'yellow',
          textAlignment: 'left',
        }
      );

      console.log(statsDisplay);
    } catch (error) {
      this.logger.error('Error showing daily stats', error as Error);
    }
  }

  private async displayWelcomeMessageSequential(message: WelcomeMessage): Promise<void> {
    let borderColor: string;
    let icon: string;

    switch (message.type) {
      case 'first-time':
        borderColor = 'green';
        icon = '🎉';
        break;
      case 'celebration':
        borderColor = 'magenta';
        icon = '🎊';
        break;
      case 'reminder':
        borderColor = 'red';
        icon = '⚠️';
        break;
      case 'returning':
      default:
        borderColor = 'blue';
        icon = '👋';
        break;
    }

    const messageBox = boxen(
      `${icon} ${chalk.bold(message.title)}` +
        '\n\n' +
        chalk.white(message.message) +
        (message.action
          ? '\n\n' + chalk.gray(`💡 Tip: ${message.action}`)
          : ''),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: borderColor,
        textAlignment: 'left',
      }
    );

    console.log(messageBox);
  }

  private async showRemindersSequential(): Promise<void> {
    try {
      const reminders = await this.getActiveReminders();

      if (reminders.length === 0) return;

      console.log(chalk.yellow.bold('🔔 REMINDERS'));
      console.log();

      reminders.forEach((reminder, index) => {
        const reminderBox = boxen(
          `${reminder.icon} ${chalk.bold(reminder.title)}` +
            '\n' +
            chalk.white(reminder.message),
          {
            padding: 0,
            margin: { top: 0, bottom: 1, left: 2, right: 2 },
            borderStyle: 'single',
            borderColor:
              reminder.priority === 'high'
                ? 'red'
                : reminder.priority === 'medium'
                  ? 'yellow'
                  : 'blue',
            textAlignment: 'left',
          }
        );

        console.log(reminderBox);
      });
    } catch (error) {
      this.logger.error('Error showing reminders', error as Error);
    }
  }

  private async showQuickActionsSequential(): Promise<void> {
    const quickActions = boxen(
      chalk.cyan.bold('⚡ QUICK ACTIONS') +
        '\n\n' +
        `${chalk.green('1.')} Add New Loan` +
        '\n' +
        `${chalk.blue('2.')} View All Loans` +
        '\n' +
        `${chalk.yellow('3.')} Check Overdue` +
        '\n' +
        `${chalk.magenta('4.')} Analytics Dashboard` +
        '\n' +
        `${chalk.gray('5.')} Settings & More`,
      {
        padding: 1,
        margin: 1,
        borderStyle: 'single',
        borderColor: 'cyan',
        textAlignment: 'left',
      }
    );

    console.log(quickActions);
  }

  // ==================== DATA GATHERING ====================

  private async getWelcomeStats(): Promise<WelcomeStats> {
    try {
      const loans = await this.loanService.getLoans();

      const totalLoans = loans.length;
      const totalAmount = loans.reduce(
        (sum, loan) => sum + loan.calculateTotalWithInterest(),
        0
      );
      const overdueLoans = loans.filter(loan => loan.isOverdue()).length;
      const paidLoans = loans.filter(loan => loan.isPaid).length;
      const pendingLoans = loans.filter(
        loan => !loan.isPaid && !loan.isOverdue()
      ).length;

      // Find next due date
      const upcomingLoans = loans
        .filter(loan => !loan.isPaid && !loan.isOverdue())
        .sort(
          (a, b) =>
            new Date(a.repaymentDate).getTime() -
            new Date(b.repaymentDate).getTime()
        );

      const nextDueDate =
        upcomingLoans.length > 0 ? upcomingLoans[0].repaymentDate : null;

      // Get last activity (simplified - would need activity tracking)
      const lastActivity =
        totalLoans > 0 ? 'Recent loan activity detected' : null;

      return {
        totalLoans,
        totalAmount,
        overdueLoans,
        paidLoans,
        pendingLoans,
        nextDueDate,
        lastActivity,
      };
    } catch (error) {
      this.logger.error('Error getting welcome stats', error as Error);
      return {
        totalLoans: 0,
        totalAmount: 0,
        overdueLoans: 0,
        paidLoans: 0,
        pendingLoans: 0,
        nextDueDate: null,
        lastActivity: null,
      };
    }
  }

  private async getActiveReminders(): Promise<
    Array<{
      title: string;
      message: string;
      priority: 'high' | 'medium' | 'low';
      icon: string;
    }>
  > {
    const reminders = [];

    try {
      const loans = await this.loanService.getLoans();

      // Overdue reminders
      const overdueLoans = loans.filter(loan => loan.isOverdue());
      if (overdueLoans.length > 0) {
        reminders.push({
          title: 'Overdue Loans',
          message: `${overdueLoans.length} loan${overdueLoans.length > 1 ? 's' : ''} past due date`,
          priority: 'high' as const,
          icon: '🚨',
        });
      }

      // Due soon reminders
      const dueSoonLoans = loans.filter(loan => {
        if (loan.isPaid || loan.isOverdue()) return false;
        const dueDate = new Date(loan.repaymentDate);
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        return dueDate <= threeDaysFromNow;
      });

      if (dueSoonLoans.length > 0) {
        reminders.push({
          title: 'Due Soon',
          message: `${dueSoonLoans.length} loan${dueSoonLoans.length > 1 ? 's' : ''} due within 3 days`,
          priority: 'medium' as const,
          icon: '⏰',
        });
      }

      // Large amount reminders
      const largeLoans = loans.filter(
        loan => !loan.isPaid && loan.calculateTotalWithInterest() > 100000
      );

      if (largeLoans.length > 0) {
        reminders.push({
          title: 'High Value Loans',
          message: `${largeLoans.length} loan${largeLoans.length > 1 ? 's' : ''} over ₦100,000`,
          priority: 'low' as const,
          icon: '💰',
        });
      }
    } catch (error) {
      this.logger.error('Error getting active reminders', error as Error);
    }

    return reminders;
  }

  private async generateWelcomeMessage(): Promise<WelcomeMessage> {
    try {
      const stats = await this.getWelcomeStats();
      const isFirstTime = stats.totalLoans === 0;
      const hasOverdue = stats.overdueLoans > 0;
      const hasRecentPayment = await this.checkRecentPayments();

      if (isFirstTime) {
        return {
          type: 'first-time',
          title: 'Welcome to LoanTrack Pro!',
          message:
            'Get started by adding your first loan to begin tracking your financial commitments.',
          action: 'Add your first loan',
        };
      }

      if (hasRecentPayment) {
        return {
          type: 'celebration',
          title: 'Great Progress!',
          message:
            "You've recently marked loans as paid. Keep up the excellent financial management!",
          action: 'View recent activity',
        };
      }

      if (hasOverdue) {
        return {
          type: 'reminder',
          title: 'Attention Required',
          message: `You have ${stats.overdueLoans} overdue loan${stats.overdueLoans > 1 ? 's' : ''} that need immediate attention.`,
          action: 'Review overdue loans',
        };
      }

      return {
        type: 'returning',
        title: 'Welcome Back!',
        message: this.getPersonalizedGreeting(stats),
        action: 'View dashboard',
      };
    } catch (error) {
      this.logger.error('Error generating welcome message', error as Error);
      return {
        type: 'returning',
        title: 'Welcome Back!',
        message: 'Ready to manage your loans efficiently.',
        action: 'Continue',
      };
    }
  }

  private async checkRecentPayments(): Promise<boolean> {
    // This would require activity tracking - simplified for now
    try {
      const loans = await this.loanService.getLoans();
      const paidLoans = loans.filter(loan => loan.isPaid);
      return paidLoans.length > 0;
    } catch (error) {
      return false;
    }
  }

  private getPersonalizedGreeting(stats: WelcomeStats): string {
    const hour = new Date().getHours();
    let timeGreeting: string;

    if (hour < 12) {
      timeGreeting = 'Good morning';
    } else if (hour < 17) {
      timeGreeting = 'Good afternoon';
    } else {
      timeGreeting = 'Good evening';
    }

    if (stats.totalLoans === 0) {
      return `${timeGreeting}! Ready to start tracking your loans?`;
    }

    if (stats.overdueLoans > 0) {
      return `${timeGreeting}! You have some loans that need attention.`;
    }

    if (stats.pendingLoans === 0 && stats.paidLoans > 0) {
      return `${timeGreeting}! Excellent work - all loans are paid!`;
    }

    return `${timeGreeting}! You're managing ${stats.totalLoans} loan${stats.totalLoans > 1 ? 's' : ''} worth ${formatCurrency(stats.totalAmount)}.`;
  }

  // ==================== USER PREFERENCES ====================

  private async getUserPreferences(): Promise<UserPreferences> {
    try {
      // This would integrate with ConfigManager - simplified for now
      return {
        showWelcomeAnimation: true,
        showDailyStats: true,
        showReminders: true,
        preferredGreeting: 'professional',
        theme: 'default',
      };
    } catch (error) {
      this.logger.error('Error getting user preferences', error as Error);
      return {
        showWelcomeAnimation: false,
        showDailyStats: true,
        showReminders: true,
        preferredGreeting: 'professional',
        theme: 'default',
      };
    }
  }

  async updateUserPreferences(
    preferences: Partial<UserPreferences>
  ): Promise<void> {
    try {
      // This would save to ConfigManager
      this.logger.info('User preferences updated', preferences);
    } catch (error) {
      this.logger.error('Error updating user preferences', error as Error);
      throw error;
    }
  }

  // ==================== SPECIAL OCCASIONS ====================

  async showSpecialOccasion(): Promise<void> {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // New Year
    if (month === 1 && day === 1) {
      this.showSpecialMessage(
        '🎊 Happy New Year!',
        'Start the year with better financial management!'
      );
    }
    // Christmas
    else if (month === 12 && day === 25) {
      this.showSpecialMessage(
        '🎄 Merry Christmas!',
        'Wishing you financial peace this holiday season!'
      );
    }
    // App anniversary (July 27th)
    else if (month === 7 && day === 27) {
      this.showSpecialMessage(
        '🎂 LoanTrack Anniversary!',
        'Thank you for using LoanTrack Pro!'
      );
    }
  }

  private showSpecialMessage(title: string, message: string): void {
    const specialBox = boxen(
      gradient.rainbow(title) + '\n\n' + chalk.white(message),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'magenta',
        textAlignment: 'center',
      }
    );

    console.log(specialBox);
  }

  // ==================== FALLBACK & ERROR HANDLING ====================

  private showFallbackWelcome(): void {
    console.clear();

    const fallbackBanner = boxen(
      chalk.cyan.bold('🏦 LoanTrack Pro') +
        '\n' +
        chalk.white('Professional Loan Management') +
        '\n' +
        chalk.gray('Version 2.0.0'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'single',
        borderColor: 'cyan',
        textAlignment: 'center',
      }
    );

    console.log(fallbackBanner);
    console.log(chalk.yellow('⚠️ Welcome screen loaded in safe mode'));
    console.log();
  }

  async showGoodbye(): Promise<void> {
    console.log();

    const goodbyeMessage = boxen(
      chalk.cyan('👋 Thank you for using LoanTrack Pro!') +
        '\n\n' +
        chalk.white('Your financial data has been saved securely.') +
        '\n' +
        chalk.gray('Created with ❤️ by John Ilesanmi') +
        '\n\n' +
        chalk.blue('Instagram: @numcalm') +
        '\n' +
        chalk.blue('GitHub: @tamecalm'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'blue',
        textAlignment: 'center',
      }
    );

    console.log(goodbyeMessage);

    // Brief pause for effect
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // ==================== TIPS & HELP ====================

  showDailyTip(): void {
    const tips = [
      'Set up reminders for loan due dates to avoid late payments',
      'Review your loan portfolio weekly to stay on top of payments',
      'Consider paying off high-interest loans first to save money',
      'Keep digital copies of loan agreements for your records',
      'Use the analytics dashboard to track your debt reduction progress',
      'Export your loan data regularly as a backup',
      'Set realistic repayment dates when adding new loans',
      'Monitor overdue loans closely to maintain good relationships',
    ];

    const randomTip = tips[Math.floor(Math.random() * tips.length)];

    const tipBox = boxen(
      chalk.yellow.bold('💡 TIP OF THE DAY') + '\n\n' + chalk.white(randomTip),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'single',
        borderColor: 'yellow',
        textAlignment: 'left',
      }
    );

    console.log(tipBox);
  }

  showFirstTimeHelp(): void {
    const helpBox = boxen(
      chalk.green.bold('🚀 GETTING STARTED') +
        '\n\n' +
        chalk.white('1. Add your first loan with lender details') +
        '\n' +
        chalk.white('2. Set accurate repayment dates') +
        '\n' +
        chalk.white('3. Include interest rates if applicable') +
        '\n' +
        chalk.white('4. Use the dashboard to monitor progress') +
        '\n' +
        chalk.white('5. Mark loans as paid when completed') +
        '\n\n' +
        chalk.gray('Need help? Check the settings menu for more options.'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'green',
        textAlignment: 'left',
      }
    );

    console.log(helpBox);
  }
}