import chalk from 'chalk';
import boxen from 'boxen';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from './logger';

export interface ErrorContext {
  operation?: string;
  userId?: string;
  timestamp?: string;
  stackTrace?: string;
  additionalData?: any;
}

export interface ErrorReport {
  id: string;
  type: string;
  message: string;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  resolved: boolean;
}

export class ErrorHandler {
  private logger: Logger;
  private errorLogPath: string;
  private errorReports: ErrorReport[] = [];
  private initialized: boolean = false;

  constructor() {
    this.logger = new Logger();
    this.errorLogPath = path.join(__dirname, '../../data/error-reports.json');
  }

  setup(): void {
    try {
      // Setup global error handlers
      this.setupProcessErrorHandlers();
      this.setupPromiseRejectionHandlers();

      // Initialize error reporting system
      this.initializeErrorReporting();

      this.initialized = true;
      this.logger.info('Error handler setup completed successfully');
    } catch (error) {
      console.error(chalk.red('❌ Failed to setup error handler:'), error);
    }
  }

  private setupProcessErrorHandlers(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      this.handleCriticalError('UNCAUGHT_EXCEPTION', error, {
        operation: 'process_execution',
        additionalData: { pid: process.pid },
      });
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      this.handleGracefulShutdown('SIGINT');
    });

    // Handle SIGTERM
    process.on('SIGTERM', () => {
      this.handleGracefulShutdown('SIGTERM');
    });

    // Handle exit
    process.on('exit', code => {
      if (code !== 0) {
        this.logger.error(`Process exiting with code: ${code}`);
      }
    });
  }

  private setupPromiseRejectionHandlers(): void {
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      const error =
        reason instanceof Error ? reason : new Error(String(reason));

      this.handleCriticalError('UNHANDLED_REJECTION', error, {
        operation: 'promise_execution',
        additionalData: {
          reason: String(reason),
          promiseState: 'rejected',
        },
      });
    });

    // Handle warning events
    process.on('warning', warning => {
      this.handleWarning(warning);
    });
  }

  private async initializeErrorReporting(): Promise<void> {
    try {
      await this.ensureErrorLogDirectory();
      await this.loadExistingErrorReports();
    } catch (error) {
      console.error(chalk.red('Failed to initialize error reporting:'), error);
    }
  }

  private async ensureErrorLogDirectory(): Promise<void> {
    const errorLogDir = path.dirname(this.errorLogPath);
    try {
      await fs.mkdir(errorLogDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create error log directory: ${error}`);
    }
  }

  private async loadExistingErrorReports(): Promise<void> {
    try {
      const data = await fs.readFile(this.errorLogPath, 'utf-8');
      this.errorReports = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty array
      this.errorReports = [];
      await this.saveErrorReports();
    }
  }

  private async saveErrorReports(): Promise<void> {
    try {
      const data = JSON.stringify(this.errorReports, null, 2);
      await fs.writeFile(this.errorLogPath, data, 'utf-8');
    } catch (error) {
      console.error(chalk.red('Failed to save error reports:'), error);
    }
  }

  // Public error handling methods
  async handleError(
    type: string,
    error: Error,
    context: ErrorContext = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<string> {
    try {
      const errorReport = this.createErrorReport(
        type,
        error,
        context,
        severity
      );

      // Log the error
      this.logger.error(`${type}: ${error.message}`, error);

      // Add to error reports
      this.errorReports.push(errorReport);
      await this.saveErrorReports();

      // Display user-friendly error message
      this.displayErrorToUser(errorReport);

      // Handle based on severity
      await this.handleBySeverity(errorReport);

      return errorReport.id;
    } catch (handlingError) {
      console.error(chalk.red('Error in error handler:'), handlingError);
      return 'error-handler-failed';
    }
  }

  async handleCriticalError(
    type: string,
    error: Error,
    context: ErrorContext = {}
  ): Promise<void> {
    const errorId = await this.handleError(type, error, context, 'critical');

    console.log(
      boxen(
        chalk.red.bold('💥 CRITICAL ERROR DETECTED') +
          '\n\n' +
          chalk.white('Error ID: ') +
          chalk.yellow(errorId) +
          '\n' +
          chalk.white('Type: ') +
          chalk.red(type) +
          '\n' +
          chalk.white('Message: ') +
          chalk.white(error.message) +
          '\n\n' +
          chalk.gray('The application will attempt to recover gracefully.\n') +
          chalk.gray('Error details have been logged for investigation.'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'double',
          borderColor: 'red',
          textAlignment: 'left',
        }
      )
    );

    // For critical errors, we might want to exit gracefully
    if (type === 'UNCAUGHT_EXCEPTION') {
      setTimeout(() => {
        console.log(chalk.red('Exiting due to critical error...'));
        process.exit(1);
      }, 1000);
    }
  }

  async handleValidationError(
    field: string,
    value: any,
    expectedType: string
  ): Promise<string> {
    const error = new Error(
      `Invalid ${field}: expected ${expectedType}, got ${typeof value}`
    );

    return await this.handleError(
      'VALIDATION_ERROR',
      error,
      {
        operation: 'data_validation',
        additionalData: { field, value, expectedType },
      },
      'low'
    );
  }

  async handleFileSystemError(
    operation: string,
    filePath: string,
    error: Error
  ): Promise<string> {
    return await this.handleError(
      'FILESYSTEM_ERROR',
      error,
      {
        operation: `filesystem_${operation}`,
        additionalData: { filePath, operation },
      },
      'medium'
    );
  }

  async handleDatabaseError(
    operation: string,
    error: Error,
    query?: string
  ): Promise<string> {
    return await this.handleError(
      'DATABASE_ERROR',
      error,
      {
        operation: `database_${operation}`,
        additionalData: { query },
      },
      'high'
    );
  }

  async handleNetworkError(url: string, error: Error): Promise<string> {
    return await this.handleError(
      'NETWORK_ERROR',
      error,
      {
        operation: 'network_request',
        additionalData: { url },
      },
      'medium'
    );
  }

  async handleUserInputError(
    input: string,
    expectedFormat: string
  ): Promise<string> {
    const error = new Error(`Invalid user input: expected ${expectedFormat}`);

    return await this.handleError(
      'USER_INPUT_ERROR',
      error,
      {
        operation: 'user_input_validation',
        additionalData: { input, expectedFormat },
      },
      'low'
    );
  }

  private handleWarning(warning: Error): void {
    this.logger.warn(`Process warning: ${warning.message}`, warning);

    // Display warning to user if it's important
    if (
      warning.name === 'DeprecationWarning' ||
      warning.name === 'ExperimentalWarning'
    ) {
      console.log(chalk.yellow(`⚠️  ${warning.name}: ${warning.message}`));
    }
  }

  private handleGracefulShutdown(signal: string): void {
    console.log(
      boxen(
        chalk.cyan.bold('🛑 GRACEFUL SHUTDOWN INITIATED') +
          '\n\n' +
          chalk.white('Signal: ') +
          chalk.yellow(signal) +
          '\n' +
          chalk.white('Saving data and cleaning up...') +
          '\n\n' +
          chalk.gray('Thank you for using LoanTrack Pro!'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
          textAlignment: 'center',
        }
      )
    );

    // Perform cleanup operations
    this.performCleanup()
      .then(() => {
        console.log(chalk.green('✅ Cleanup completed successfully'));
        process.exit(0);
      })
      .catch(error => {
        console.error(chalk.red('❌ Error during cleanup:'), error);
        process.exit(1);
      });
  }

  private async performCleanup(): Promise<void> {
    try {
      // Save any pending error reports
      await this.saveErrorReports();

      // Log shutdown
      this.logger.info('Application shutdown completed');

      // Give time for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  private createErrorReport(
    type: string,
    error: Error,
    context: ErrorContext,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): ErrorReport {
    const timestamp = new Date().toISOString();
    const id = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id,
      type,
      message: error.message,
      context: {
        ...context,
        timestamp,
        stackTrace: error.stack,
      },
      severity,
      timestamp,
      resolved: false,
    };
  }

  private displayErrorToUser(errorReport: ErrorReport): void {
    const severityColors = {
      low: 'yellow',
      medium: 'magenta',
      high: 'red',
      critical: 'red',
    } as const;

    const severityIcons = {
      low: '⚠️',
      medium: '🔶',
      high: '🔴',
      critical: '💥',
    };

    const colorName = severityColors[errorReport.severity];
    const icon = severityIcons[errorReport.severity];

    // Only show user-friendly errors for non-critical issues
    if (errorReport.severity !== 'critical') {
      const coloredTitle = this.getChalkColor(colorName)(
        `${icon} ${errorReport.type.replace(/_/g, ' ')}`
      );

      console.log(
        boxen(
          coloredTitle +
            '\n\n' +
            chalk.white(this.getUserFriendlyMessage(errorReport)) +
            '\n\n' +
            chalk.gray(`Error ID: ${errorReport.id}`),
          {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: colorName,
            textAlignment: 'left',
          }
        )
      );
    }
  }

  private getChalkColor(
    colorName: 'yellow' | 'magenta' | 'red'
  ): (text: string) => string {
    switch (colorName) {
      case 'yellow':
        return chalk.yellow;
      case 'magenta':
        return chalk.magenta;
      case 'red':
        return chalk.red;
      default:
        return chalk.white;
    }
  }

  private getUserFriendlyMessage(errorReport: ErrorReport): string {
    switch (errorReport.type) {
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';
      case 'FILESYSTEM_ERROR':
        return 'There was an issue accessing a file. Please check file permissions.';
      case 'DATABASE_ERROR':
        return 'There was an issue with data storage. Your data may not have been saved.';
      case 'NETWORK_ERROR':
        return 'Network connection failed. Please check your internet connection.';
      case 'USER_INPUT_ERROR':
        return 'Invalid input format. Please follow the expected format.';
      default:
        return 'An unexpected error occurred. The application will continue running.';
    }
  }

  private async handleBySeverity(errorReport: ErrorReport): Promise<void> {
    switch (errorReport.severity) {
      case 'low':
        // Log only, no special action needed
        break;
      case 'medium':
        // Log and potentially notify user
        break;
      case 'high':
        // Log, notify user, and consider recovery actions
        await this.attemptRecovery(errorReport);
        break;
      case 'critical':
        // Log, notify user, attempt recovery, and consider shutdown
        await this.attemptRecovery(errorReport);
        break;
    }
  }

  private async attemptRecovery(errorReport: ErrorReport): Promise<void> {
    try {
      switch (errorReport.type) {
        case 'FILESYSTEM_ERROR':
          await this.recoverFromFileSystemError(errorReport);
          break;
        case 'DATABASE_ERROR':
          await this.recoverFromDatabaseError(errorReport);
          break;
        default:
          // Generic recovery attempt
          this.logger.info(
            `Attempting generic recovery for ${errorReport.type}`
          );
      }
    } catch (recoveryError) {
      this.logger.error('Recovery attempt failed', recoveryError as Error);
    }
  }

  private async recoverFromFileSystemError(
    errorReport: ErrorReport
  ): Promise<void> {
    const filePath = errorReport.context.additionalData?.filePath;

    if (filePath) {
      try {
        // Attempt to create directory if it doesn't exist
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });

        this.logger.info(`Created missing directory: ${dir}`);
        errorReport.resolved = true;
        await this.saveErrorReports();
      } catch (error) {
        this.logger.error(
          'Failed to recover from filesystem error',
          error as Error
        );
      }
    }
  }

  private async recoverFromDatabaseError(
    errorReport: ErrorReport
  ): Promise<void> {
    try {
      // Attempt to recreate data directory
      const dataDir = path.join(__dirname, '../../data');
      await fs.mkdir(dataDir, { recursive: true });

      this.logger.info('Recreated data directory for database recovery');
      errorReport.resolved = true;
      await this.saveErrorReports();
    } catch (error) {
      this.logger.error(
        'Failed to recover from database error',
        error as Error
      );
    }
  }

  // Error reporting and analysis methods
  async getErrorReports(filter?: {
    severity?: string;
    type?: string;
    resolved?: boolean;
    since?: Date;
  }): Promise<ErrorReport[]> {
    let reports = [...this.errorReports];

    if (filter) {
      if (filter.severity) {
        reports = reports.filter(r => r.severity === filter.severity);
      }
      if (filter.type) {
        reports = reports.filter(r => r.type === filter.type);
      }
      if (filter.resolved !== undefined) {
        reports = reports.filter(r => r.resolved === filter.resolved);
      }
      if (filter.since) {
        reports = reports.filter(r => new Date(r.timestamp) >= filter.since!);
      }
    }

    return reports.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getErrorStatistics(): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    resolved: number;
    unresolved: number;
    recentErrors: number;
  }> {
    const total = this.errorReports.length;
    const resolved = this.errorReports.filter(r => r.resolved).length;
    const unresolved = total - resolved;

    // Errors in the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentErrors = this.errorReports.filter(
      r => new Date(r.timestamp) >= yesterday
    ).length;

    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};

    this.errorReports.forEach(report => {
      bySeverity[report.severity] = (bySeverity[report.severity] || 0) + 1;
      byType[report.type] = (byType[report.type] || 0) + 1;
    });

    return {
      total,
      bySeverity,
      byType,
      resolved,
      unresolved,
      recentErrors,
    };
  }

  async markErrorAsResolved(errorId: string): Promise<boolean> {
    const errorIndex = this.errorReports.findIndex(r => r.id === errorId);

    if (errorIndex !== -1) {
      this.errorReports[errorIndex].resolved = true;
      await this.saveErrorReports();
      return true;
    }

    return false;
  }

  async clearOldErrors(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date(
      Date.now() - olderThanDays * 24 * 60 * 60 * 1000
    );
    const initialCount = this.errorReports.length;

    this.errorReports = this.errorReports.filter(
      report => new Date(report.timestamp) >= cutoffDate || !report.resolved
    );

    await this.saveErrorReports();

    const removedCount = initialCount - this.errorReports.length;
    this.logger.info(`Cleared ${removedCount} old error reports`);

    return removedCount;
  }

  async exportErrorReports(filePath: string): Promise<void> {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        totalErrors: this.errorReports.length,
        statistics: await this.getErrorStatistics(),
        errors: this.errorReports,
      };

      const data = JSON.stringify(exportData, null, 2);
      await fs.writeFile(filePath, data, 'utf-8');

      this.logger.info(`Error reports exported to: ${filePath}`);
    } catch (error) {
      throw new Error(`Failed to export error reports: ${error}`);
    }
  }

  // Utility methods
  isInitialized(): boolean {
    return this.initialized;
  }

  async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    errorCount: number;
    criticalErrors: number;
    recentErrors: number;
    lastError?: string;
  }> {
    const stats = await this.getErrorStatistics();
    const criticalErrors = stats.bySeverity.critical || 0;
    const recentErrors = stats.recentErrors;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (criticalErrors > 0) {
      status = 'critical';
    } else if (recentErrors > 5 || stats.unresolved > 10) {
      status = 'warning';
    }

    const lastError =
      this.errorReports.length > 0
        ? this.errorReports[this.errorReports.length - 1].message
        : undefined;

    return {
      status,
      errorCount: stats.total,
      criticalErrors,
      recentErrors,
      lastError,
    };
  }

  // Helper method for wrapping async operations with error handling
  async wrapAsync<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: ErrorContext = {}
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      await this.handleError('WRAPPED_OPERATION_ERROR', error as Error, {
        ...context,
        operation: operationName,
      });
      return null;
    }
  }

  // Helper method for wrapping sync operations with error handling
  wrapSync<T>(
    operation: () => T,
    operationName: string,
    context: ErrorContext = {}
  ): T | null {
    try {
      return operation();
    } catch (error) {
      this.handleError('WRAPPED_OPERATION_ERROR', error as Error, {
        ...context,
        operation: operationName,
      });
      return null;
    }
  }
}
