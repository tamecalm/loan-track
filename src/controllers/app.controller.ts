import chalk from 'chalk';
import { Logger } from '../core/logger';
import { ErrorHandler } from '../core/error-handler';
import { ConfigManager } from '../core/config-manager';
import { WelcomeService } from '../services/welcome.service';
import { MainMenuController } from './main-menu.controller';
import { StorageService } from '../services/storage.service';
import * as fs from 'fs/promises';
import * as path from 'path';

export class AppController {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private configManager: ConfigManager;
  private welcomeService: WelcomeService;
  private mainMenuController: MainMenuController;
  private storageService: StorageService;

  constructor() {
    this.logger = new Logger();
    this.errorHandler = new ErrorHandler();
    this.configManager = new ConfigManager();
    this.welcomeService = new WelcomeService();
    this.mainMenuController = new MainMenuController();
    this.storageService = new StorageService();
  }

  async initialize(): Promise<void> {
    try {
      // Setup error handling first
      this.errorHandler.setup();

      // Initialize core services
      await this.initializeServices();

      // Show welcome screen with loading animation
      await this.welcomeService.showWelcome();

      // Start main application loop
      await this.startApplication();
    } catch (error) {
      await this.handleInitializationError(error as Error);
    }
  }

  private async initializeServices(): Promise<void> {
    try {
      // Ensure data directories exist
      await this.ensureDataDirectories();

      // Initialize configuration manager
      await this.configManager.initialize();

      // Initialize welcome service
      await this.welcomeService.initialize();

      this.logger.info('All services initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize services', error as Error);
      throw error;
    }
  }

  private async ensureDataDirectories(): Promise<void> {
    const directories = [
      path.join(process.cwd(), 'data'),
      path.join(process.cwd(), 'data', 'backups'),
      path.join(process.cwd(), 'data', 'exports'),
      path.join(process.cwd(), 'data', 'logs'),
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        this.logger.warn(`Failed to create directory: ${dir}`, error as Error);
      }
    }
  }

  private async startApplication(): Promise<void> {
    try {
      // Start the main menu controller
      await this.mainMenuController.show();
      
      // NO goodbye message here - main menu controller handles it
    } catch (error) {
      await this.errorHandler.handleError(
        'APPLICATION_ERROR',
        error as Error,
        { operation: 'main_application_loop' },
        'critical'
      );
      throw error;
    }
  }

  private async handleInitializationError(error: Error): Promise<void> {
    // Try to show a basic error message even if logging fails
    console.error(
      chalk.red('❌ Failed to initialize LoanTrack Pro:'),
      error.message
    );

    // Try to log the error if possible
    try {
      await this.errorHandler.handleCriticalError(
        'INITIALIZATION_ERROR',
        error,
        { operation: 'app_initialization' }
      );
    } catch (loggingError) {
      console.error(chalk.red('❌ Additional error during error handling:'), loggingError);
    }

    // Show fallback interface
    this.showFallbackInterface();
  }

  private showFallbackInterface(): void {
    console.log();
    console.log(
      chalk.yellow('⚠️  LoanTrack Pro encountered an initialization error.')
    );
    console.log(chalk.gray('Please check the following:'));
    console.log(chalk.gray('  • Ensure you have proper file permissions'));
    console.log(chalk.gray('  • Check available disk space'));
    console.log(chalk.gray('  • Verify Node.js version compatibility'));
    console.log();
    console.log(chalk.cyan('For support, contact:'));
    console.log(chalk.blue('  Instagram: @numcalm'));
    console.log(chalk.blue('  GitHub: @tamecalm'));
    console.log();
  }

  // Graceful shutdown handler
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Application shutdown initiated');

      // Perform cleanup operations
      await this.performCleanup();

      this.logger.info('Application shutdown completed successfully');
    } catch (error) {
      this.logger.error('Error during application shutdown', error as Error);
    }
  }

  private async performCleanup(): Promise<void> {
    try {
      // Flush any pending logs
      await this.logger.flush();

      // Save any pending configuration changes
      // (ConfigManager handles its own cleanup)

      // Clean up temporary files if any
      await this.cleanupTempFiles();

      this.logger.info('Cleanup operations completed');
    } catch (error) {
      this.logger.error('Error during cleanup', error as Error);
    }
  }

  private async cleanupTempFiles(): Promise<void> {
    try {
      const tempDir = path.join(process.cwd(), 'data', 'temp');
      
      // Check if temp directory exists
      try {
        await fs.access(tempDir);
        // If it exists, clean it up
        const files = await fs.readdir(tempDir);
        for (const file of files) {
          await fs.unlink(path.join(tempDir, file));
        }
        this.logger.info('Temporary files cleaned up');
      } catch (error) {
        // Temp directory doesn't exist or is empty, which is fine
      }
    } catch (error) {
      this.logger.warn('Failed to cleanup temporary files', error as Error);
    }
  }

  // Health check method
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, boolean>;
    errors: string[];
  }> {
    const health: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      services: Record<string, boolean>;
      errors: string[];
    } = {
      status: 'healthy',
      services: {},
      errors: [],
    };

    try {
      // Check error handler
      health.services.errorHandler = this.errorHandler.isInitialized();

      // Check data directory access
      try {
        await fs.access(path.join(process.cwd(), 'data'));
        health.services.dataDirectory = true;
      } catch {
        health.services.dataDirectory = false;
        health.errors.push('Data directory not accessible');
      }

      // Check storage service
      try {
        await this.storageService.readLoans();
        health.services.storage = true;
      } catch (error) {
        health.services.storage = false;
        health.errors.push(`Storage error: ${(error as Error).message}`);
      }

      // Determine overall health status
      const serviceStatuses = Object.values(health.services);
      const healthyServices = serviceStatuses.filter(status => status).length;
      const totalServices = serviceStatuses.length;

      if (healthyServices === totalServices) {
        health.status = 'healthy';
      } else if (healthyServices >= totalServices * 0.7) {
        health.status = 'degraded';
      } else {
        health.status = 'unhealthy';
      }

      return health;
    } catch (error) {
      health.status = 'unhealthy';
      health.errors.push(`Health check failed: ${(error as Error).message}`);
      return health;
    }
  }

  // Version information
  getVersion(): {
    version: string;
    buildDate: string;
    author: string;
    description: string;
  } {
    return {
      version: '2.0.0',
      buildDate: '27th July 2025',
      author: 'John Ilesanmi (@numcalm)',
      description: 'Professional Loan Management Toolkit for Termux',
    };
  }

  // System information
  async getSystemInfo(): Promise<{
    nodeVersion: string;
    platform: string;
    architecture: string;
    memory: {
      used: string;
      total: string;
      free: string;
    };
    uptime: string;
  }> {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const freeMem = require('os').freemem();

    return {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      memory: {
        used: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
        total: `${Math.round(totalMem / 1024 / 1024)} MB`,
        free: `${Math.round(freeMem / 1024 / 1024)} MB`,
      },
      uptime: `${Math.round(process.uptime() / 60)} minutes`,
    };
  }
}