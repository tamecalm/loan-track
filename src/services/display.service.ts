import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import boxen from 'boxen';
import cliTable3 from 'cli-table3';
import { createSpinner } from 'nanospinner';
import cliProgress from 'cli-progress';
import terminalLink from 'terminal-link';
import { Logger } from '../core/logger';
import { LoanModel } from '../models/loan.model';
import { formatCurrency, formatDate } from '../utils/format.utils';

export interface DisplayOptions {
  color?: boolean;
  borders?: boolean;
  padding?: number;
  margin?: number;
  width?: number;
  alignment?: 'left' | 'center' | 'right';
}

export interface TableColumn {
  header: string;
  key: string;
  width?: number;
  alignment?: 'left' | 'center' | 'right';
  formatter?: (value: any) => string;
}

export interface NotificationOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
}

export interface ProgressBarOptions {
  title?: string;
  total: number;
  current?: number;
  format?: string;
  barCompleteChar?: string;
  barIncompleteChar?: string;
  hideCursor?: boolean;
}

export class DisplayService {
  private logger: Logger;
  private defaultOptions: DisplayOptions;

  constructor() {
    this.logger = new Logger();
    this.defaultOptions = {
      color: true,
      borders: true,
      padding: 1,
      margin: 1,
      alignment: 'left'
    };
  }

  // ==================== HEADERS & BANNERS ====================

  showWelcomeBanner(): void {
    console.clear();
    
    const title = figlet.textSync('TRACKER', {
      font: 'Big',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    });
    
    console.log(gradient.rainbow(title));
    console.log();
    
    const authorBox = boxen(
      chalk.cyan.bold('🏦 PROFESSIONAL LOAN MANAGEMENT TOOLKIT') + '\n\n' +
      chalk.white('👨‍💻 Developer: ') + chalk.cyan('John Ilesanmi') + '\n' +
      chalk.white('📱 Instagram: ') + chalk.magenta('@numcalm') + '\n' +
      chalk.white('🐙 GitHub: ') + chalk.blue('@tamecalm') + '\n' +
      chalk.white('📅 Start Date: ') + chalk.yellow('27th July 2025') + '\n' +
      chalk.white('🚀 Version: ') + chalk.green('2.0.0') + ' - Professional Edition',
      {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'cyan',
        textAlignment: 'center'
      }
    );
    
    console.log(authorBox);
    console.log();
  }

  showSectionHeader(title: string, subtitle?: string, icon?: string): void {
    console.clear();
    
    const headerContent = 
      (icon ? `${icon} ` : '🏦 ') + 
      chalk.cyan.bold(title.toUpperCase()) +
      (subtitle ? '\n' + chalk.gray(subtitle) : '');
    
    const header = boxen(headerContent, {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'cyan',
      textAlignment: 'center'
    });
    
    console.log(header);
    console.log();
  }

  showSubHeader(text: string, color: string = 'yellow'): void {
    const subHeader = boxen(
      this.getChalkColor(color)(text),
      {
        padding: 0,
        margin: { top: 0, bottom: 1, left: 2, right: 2 },
        borderStyle: 'single',
        borderColor: color,
        textAlignment: 'center'
      }
    );
    
    console.log(subHeader);
  }

  // ==================== TABLES ====================

  createTable(columns: TableColumn[], options?: DisplayOptions): cliTable3.Table {
    const opts = { ...this.defaultOptions, ...options };
    
    const tableConfig: any = {
      head: columns.map(col => chalk.cyan.bold(col.header)),
      style: {
        head: [],
        border: opts.color ? ['cyan'] : [],
        compact: false
      }
    };

    // Set column widths if specified
    if (columns.some(col => col.width)) {
      tableConfig.colWidths = columns.map(col => col.width || undefined);
    }

    // Set column alignments
    if (columns.some(col => col.alignment)) {
      tableConfig.colAligns = columns.map(col => col.alignment || 'left');
    }

    return new cliTable3(tableConfig);
  }

  showLoanTable(loans: LoanModel[], options?: DisplayOptions): void {
    if (loans.length === 0) {
      this.showEmptyState('No loans found', '💰 Add your first loan to get started!');
      return;
    }

    const columns: TableColumn[] = [
      { header: 'ID', key: 'id', width: 10, formatter: (val) => val.slice(0, 8) },
      { header: 'Lender', key: 'lenderName', width: 15 },
      { header: 'Phone', key: 'phoneNumber', width: 15 },
      { header: 'Amount', key: 'amount', width: 12, alignment: 'right', formatter: formatCurrency },
      { header: 'Due Date', key: 'repaymentDate', width: 12, formatter: formatDate },
      { header: 'Interest', key: 'interestRate', width: 10, alignment: 'center', formatter: (val) => val ? `${val}%` : 'None' },
      { header: 'Status', key: 'status', width: 12, alignment: 'center' }
    ];

    const table = this.createTable(columns, options);

    loans.forEach(loan => {
      const status = loan.isPaid 
        ? chalk.green('✅ Paid')
        : loan.isOverdue() 
          ? chalk.red('⚠️ Overdue')
          : chalk.yellow('⏳ Pending');

      const totalAmount = loan.calculateTotalWithInterest();
      
      table.push([
        chalk.gray(loan.id.slice(0, 8)),
        chalk.white(loan.lenderName),
        chalk.blue(loan.phoneNumber),
        loan.isPaid ? chalk.green(formatCurrency(totalAmount)) : 
        loan.isOverdue() ? chalk.red(formatCurrency(totalAmount)) : 
        chalk.yellow(formatCurrency(totalAmount)),
        loan.isOverdue() ? chalk.red(formatDate(loan.repaymentDate)) : 
        chalk.white(formatDate(loan.repaymentDate)),
        loan.interestRate ? chalk.cyan(`${loan.interestRate}%`) : chalk.gray('None'),
        status
      ]);
    });

    console.log(table.toString());
    console.log();
  }

  showSummaryTable(data: Record<string, any>, title?: string): void {
    if (title) {
      console.log(chalk.cyan.bold(`📊 ${title}`));
      console.log();
    }

    const table = new cliTable3({
      style: {
        head: [],
        border: ['cyan']
      }
    });

    Object.entries(data).forEach(([key, value]) => {
      let formattedValue = value;
      
      if (typeof value === 'number' && key.toLowerCase().includes('amount')) {
        formattedValue = formatCurrency(value);
      } else if (typeof value === 'number') {
        formattedValue = value.toLocaleString();
      } else if (typeof value === 'boolean') {
        formattedValue = value ? chalk.green('Yes') : chalk.red('No');
      }

      table.push([
        chalk.cyan(key),
        chalk.white(formattedValue)
      ]);
    });

    console.log(table.toString());
    console.log();
  }

  // ==================== NOTIFICATIONS ====================

  showNotification(options: NotificationOptions): void {
    const { type, title, message, persistent = false } = options;
    
    let icon: string;
    let color: string;
    let borderColor: string;

    switch (type) {
      case 'success':
        icon = '✅';
        color = 'green';
        borderColor = 'green';
        break;
      case 'error':
        icon = '❌';
        color = 'red';
        borderColor = 'red';
        break;
      case 'warning':
        icon = '⚠️';
        color = 'yellow';
        borderColor = 'yellow';
        break;
      case 'info':
      default:
        icon = 'ℹ️';
        color = 'blue';
        borderColor = 'blue';
        break;
    }

    const content = 
      `${icon} ${title ? chalk.bold(title) : ''}` +
      (title ? '\n' : '') +
      this.getChalkColor(color)(message);

    const notification = boxen(content, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: borderColor,
      textAlignment: 'left'
    });

    console.log(notification);

    if (!persistent && options.duration) {
      setTimeout(() => {
        // Clear notification after duration
        console.log('\x1b[2J\x1b[0f'); // Clear screen
      }, options.duration);
    }
  }

  showSuccess(message: string, title?: string): void {
    this.showNotification({ type: 'success', message, title });
  }

  showError(message: string, title?: string): void {
    this.showNotification({ type: 'error', message, title });
  }

  showWarning(message: string, title?: string): void {
    this.showNotification({ type: 'warning', message, title });
  }

  showInfo(message: string, title?: string): void {
    this.showNotification({ type: 'info', message, title });
  }

  // ==================== PROGRESS & LOADING ====================

  createSpinner(text: string): any {
    return createSpinner(text);
  }

  createProgressBar(options: ProgressBarOptions): cliProgress.SingleBar {
    const { title, total, format, barCompleteChar, barIncompleteChar, hideCursor } = options;
    
    const progressBar = new cliProgress.SingleBar({
      format: format || `${title || 'Progress'} |{bar}| {percentage}% | {value}/{total} | ETA: {eta}s`,
      barCompleteChar: barCompleteChar || '█',
      barIncompleteChar: barIncompleteChar || '░',
      hideCursor: hideCursor !== false,
      clearOnComplete: false,
      stopOnComplete: true
    }, cliProgress.Presets.shades_classic);

    progressBar.start(total, options.current || 0);
    return progressBar;
  }

  // ==================== SPECIAL DISPLAYS ====================

  showEmptyState(title: string, subtitle?: string, icon?: string): void {
    const content = 
      (icon || '📭') + ' ' + chalk.gray.bold(title) +
      (subtitle ? '\n' + chalk.gray(subtitle) : '');

    const emptyBox = boxen(content, {
      padding: 2,
      margin: 2,
      borderStyle: 'single',
      borderColor: 'gray',
      textAlignment: 'center'
    });

    console.log(emptyBox);
  }

  showStatCard(title: string, value: string | number, icon?: string, color?: string): void {
    const cardColor = color || 'cyan';
    const cardIcon = icon || '📊';
    
    let formattedValue = value.toString();
    if (typeof value === 'number' && title.toLowerCase().includes('amount')) {
      formattedValue = formatCurrency(value);
    }

    const content = 
      this.getChalkColor(cardColor).bold(`${cardIcon} ${title}`) + '\n' +
      chalk.white.bold(formattedValue);

    const card = boxen(content, {
      padding: 1,
      margin: { top: 0, bottom: 1, left: 1, right: 1 },
      borderStyle: 'single',
      borderColor: cardColor,
      textAlignment: 'center',
      width: 20
    });

    console.log(card);
  }

  showStatGrid(stats: Array<{ title: string; value: string | number; icon?: string; color?: string }>): void {
    const cardsPerRow = 3;
    const rows = Math.ceil(stats.length / cardsPerRow);

    for (let row = 0; row < rows; row++) {
      const rowStats = stats.slice(row * cardsPerRow, (row + 1) * cardsPerRow);
      
      // Create cards for this row
      const cards = rowStats.map(stat => {
        const cardColor = stat.color || 'cyan';
        const cardIcon = stat.icon || '📊';
        
        let formattedValue = stat.value.toString();
        if (typeof stat.value === 'number' && stat.title.toLowerCase().includes('amount')) {
          formattedValue = formatCurrency(stat.value);
        }

        return boxen(
          this.getChalkColor(cardColor).bold(`${cardIcon} ${stat.title}`) + '\n' +
          chalk.white.bold(formattedValue),
          {
            padding: 1,
            borderStyle: 'single',
            borderColor: cardColor,
            textAlignment: 'center',
            width: 22
          }
        );
      });

      // Display cards side by side
      const lines = cards.map(card => card.split('\n'));
      const maxLines = Math.max(...lines.map(l => l.length));

      for (let lineIndex = 0; lineIndex < maxLines; lineIndex++) {
        const line = lines.map(cardLines => 
          cardLines[lineIndex] || ' '.repeat(22)
        ).join('  ');
        console.log(line);
      }
      
      console.log(); // Space between rows
    }
  }

  showKeyValueList(data: Record<string, any>, title?: string): void {
    if (title) {
      console.log(chalk.cyan.bold(`📋 ${title}`));
      console.log();
    }

    Object.entries(data).forEach(([key, value]) => {
      let formattedValue = value;
      
      if (typeof value === 'number' && key.toLowerCase().includes('amount')) {
        formattedValue = chalk.green(formatCurrency(value));
      } else if (typeof value === 'number') {
        formattedValue = chalk.yellow(value.toLocaleString());
      } else if (typeof value === 'boolean') {
        formattedValue = value ? chalk.green('✓ Yes') : chalk.red('✗ No');
      } else if (typeof value === 'string' && value.startsWith('http')) {
        formattedValue = terminalLink(value, value);
      } else {
        formattedValue = chalk.white(value);
      }

      console.log(`  ${chalk.cyan('•')} ${chalk.gray(key)}: ${formattedValue}`);
    });
    
    console.log();
  }

  // ==================== UTILITY METHODS ====================

  clearScreen(): void {
    console.clear();
  }

  addSpacing(lines: number = 1): void {
    console.log('\n'.repeat(lines - 1));
  }

  showSeparator(char: string = '─', length: number = 60, color: string = 'gray'): void {
    console.log(this.getChalkColor(color)(char.repeat(length)));
  }

  showLink(text: string, url: string): void {
    console.log(terminalLink(text, url));
  }

  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  formatPercentage(value: number, total: number): string {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return `${percentage.toFixed(1)}%`;
  }

  // ==================== INTERACTIVE DISPLAYS ====================

  async showConfirmation(message: string, defaultValue: boolean = false): Promise<boolean> {
    const inquirer = await import('inquirer');
    const { confirmed } = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: chalk.yellow(`❓ ${message}`),
        default: defaultValue
      }
    ]);
    return confirmed;
  }

  async showPause(message: string = 'Press Enter to continue...'): Promise<void> {
    const inquirer = await import('inquirer');
    await inquirer.default.prompt([
      {
        type: 'input',
        name: 'continue',
        message: chalk.gray(message)
      }
    ]);
  }

  // ==================== ERROR DISPLAYS ====================

  showErrorDetails(error: Error, context?: string): void {
    const errorBox = boxen(
      chalk.red.bold('❌ ERROR DETAILS') + '\n\n' +
      (context ? chalk.yellow(`Context: ${context}`) + '\n' : '') +
      chalk.white(`Message: ${error.message}`) + '\n' +
      (error.stack ? chalk.gray(`Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`) : ''),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'single',
        borderColor: 'red',
        textAlignment: 'left'
      }
    );

    console.log(errorBox);
  }

  showValidationErrors(errors: string[]): void {
    console.log(chalk.red.bold('❌ Validation Errors:'));
    console.log();
    
    errors.forEach((error, index) => {
      console.log(`  ${chalk.red(`${index + 1}.`)} ${chalk.white(error)}`);
    });
    
    console.log();
  }

  // ==================== HELPER METHODS ====================

  private getChalkColor(colorName: string): typeof chalk.white {
    switch (colorName.toLowerCase()) {
      case 'red':
        return chalk.red;
      case 'green':
        return chalk.green;
      case 'blue':
        return chalk.blue;
      case 'yellow':
        return chalk.yellow;
      case 'magenta':
        return chalk.magenta;
      case 'cyan':
        return chalk.cyan;
      case 'white':
        return chalk.white;
      case 'gray':
      case 'grey':
        return chalk.gray;
      case 'black':
        return chalk.black;
      default:
        return chalk.white;
    }
  }
}