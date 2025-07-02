import chalk from 'chalk';
import inquirer from 'inquirer';
import boxen from 'boxen';
import { createSpinner } from 'nanospinner';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../core/logger';
import { ConfigManager } from '../core/config-manager';
import { formatCurrency } from '../utils/format.utils';

export class ConfigController {
  private logger: Logger;
  private configManager: ConfigManager;

  constructor() {
    this.logger = new Logger();
    this.configManager = new ConfigManager();
  }

  async showConfigMenu(): Promise<void> {
    try {
      console.clear();
      this.displayConfigHeader();

      const choice = await this.getConfigMenuChoice();

      if (choice === 'back') {
        return;
      }

      await this.handleConfigChoice(choice);
    } catch (error) {
      this.logger.error('Error in config menu', error as Error);
      console.error(chalk.red('❌ Failed to load configuration menu'));
    }
  }

  private displayConfigHeader(): void {
    const header = boxen(
      chalk.blue.bold('⚙️ CONFIGURATION CENTER') +
        '\n' +
        chalk.gray('Customize Your LoanTrack Pro Experience'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'blue',
        textAlignment: 'center',
      }
    );

    console.log(header);
  }

  private async getConfigMenuChoice(): Promise<string> {
    // Show current configuration summary
    await this.displayConfigSummary();

    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: chalk.yellow('⚙️ Select configuration category:'),
        choices: [
          {
            name: `${chalk.cyan('🎨')} Display & Theme Settings`,
            value: 'display',
          },
          {
            name: `${chalk.green('💰')} Currency & Format Settings`,
            value: 'currency',
          },
          {
            name: `${chalk.yellow('🔔')} Notification Settings`,
            value: 'notifications',
          },
          {
            name: `${chalk.magenta('📁')} Data Storage Settings`,
            value: 'storage',
          },
          {
            name: `${chalk.red('🔒')} Security Settings`,
            value: 'security',
          },
          {
            name: `${chalk.blue('🌍')} Locale & Language Settings`,
            value: 'locale',
          },
          new inquirer.Separator(),
          {
            name: `${chalk.cyan('📤')} Export Settings`,
            value: 'export',
          },
          {
            name: `${chalk.cyan('📥')} Import Settings`,
            value: 'import',
          },
          {
            name: `${chalk.yellow('🔄')} Reset to Defaults`,
            value: 'reset',
          },
          {
            name: `${chalk.magenta('📊')} Configuration Summary`,
            value: 'summary',
          },
          new inquirer.Separator(),
          {
            name: `${chalk.gray('🔙')} Back to Main Menu`,
            value: 'back',
          },
        ],
        pageSize: 15,
      },
    ]);

    return choice;
  }

  private async displayConfigSummary(): Promise<void> {
    const spinner = createSpinner('Loading configuration...').start();

    try {
      const summary = await this.configManager.getConfigSummary();
      spinner.stop();

      console.log(
        boxen(
          chalk.cyan('📊 Configuration Overview') +
            '\n\n' +
            chalk.white('Total Settings: ') +
            chalk.yellow(summary.totalSettings.toString()) +
            '\n' +
            chalk.white('Last Updated: ') +
            chalk.gray(new Date(summary.lastUpdated).toLocaleDateString()) +
            '\n' +
            chalk.white('Version: ') +
            chalk.blue(summary.version) +
            '\n' +
            chalk.white('Config Size: ') +
            chalk.green(summary.configSize) +
            '\n' +
            chalk.white('Status: ') +
            (summary.isValid ? chalk.green('Valid') : chalk.red('Invalid')),
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
      spinner.error({ text: 'Failed to load configuration summary' });
      throw error;
    }
  }

  private async handleConfigChoice(choice: string): Promise<void> {
    try {
      switch (choice) {
        case 'display':
          await this.configureDisplaySettings();
          break;
        case 'currency':
          await this.configureCurrencySettings();
          break;
        case 'notifications':
          await this.configureNotificationSettings();
          break;
        case 'storage':
          await this.configureStorageSettings();
          break;
        case 'security':
          await this.configureSecuritySettings();
          break;
        case 'locale':
          await this.configureLocaleSettings();
          break;
        case 'export':
          await this.exportSettings();
          break;
        case 'import':
          await this.importSettings();
          break;
        case 'reset':
          await this.resetToDefaults();
          break;
        case 'summary':
          await this.showDetailedSummary();
          break;
      }

      // Ask if user wants to configure another setting
      const { continueConfig } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueConfig',
          message: 'Would you like to configure another setting?',
          default: false,
        },
      ]);

      if (continueConfig) {
        await this.showConfigMenu();
      }
    } catch (error) {
      this.logger.error(
        `Error handling config choice: ${choice}`,
        error as Error
      );
      console.error(chalk.red(`❌ Failed to configure ${choice} settings`));
    }
  }

  private async configureDisplaySettings(): Promise<void> {
    console.log('\n' + chalk.bold('🎨 Display & Theme Settings'));

    const currentSettings = await this.configManager.getDisplaySettings();

    console.log(
      boxen(
        chalk.cyan('Current Display Settings:') +
          '\n\n' +
          chalk.white('Theme: ') +
          chalk.yellow(currentSettings.theme) +
          '\n' +
          chalk.white('Table Style: ') +
          chalk.yellow(currentSettings.tableStyle) +
          '\n' +
          chalk.white('Date Format: ') +
          chalk.yellow(currentSettings.dateFormat) +
          '\n' +
          chalk.white('Show Colors: ') +
          (currentSettings.showColors ? chalk.green('Yes') : chalk.red('No')) +
          '\n' +
          chalk.white('Animation Speed: ') +
          chalk.yellow(currentSettings.animationSpeed),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
        }
      )
    );

    const newSettings = await inquirer.prompt([
      {
        type: 'list',
        name: 'theme',
        message: 'Select color theme:',
        choices: [
          { name: '🌈 Rainbow (Colorful)', value: 'rainbow' },
          { name: '🔵 Blue Theme', value: 'blue' },
          { name: '🟢 Green Theme', value: 'green' },
          { name: '🟣 Purple Theme', value: 'purple' },
          { name: '⚫ Monochrome', value: 'mono' },
        ],
        default: currentSettings.theme,
      },
      {
        type: 'list',
        name: 'tableStyle',
        message: 'Select table style:',
        choices: [
          { name: 'Grid (with borders)', value: 'grid' },
          { name: 'Simple (minimal)', value: 'simple' },
          { name: 'Compact (dense)', value: 'compact' },
          { name: 'Elegant (styled)', value: 'elegant' },
        ],
        default: currentSettings.tableStyle,
      },
      {
        type: 'list',
        name: 'dateFormat',
        message: 'Select date format:',
        choices: [
          { name: 'UK Format (DD/MM/YYYY)', value: 'uk' },
          { name: 'US Format (MM/DD/YYYY)', value: 'us' },
          { name: 'ISO Format (YYYY-MM-DD)', value: 'iso' },
          { name: 'Verbose (01 Jan 2024)', value: 'verbose' },
        ],
        default: currentSettings.dateFormat,
      },
      {
        type: 'confirm',
        name: 'showColors',
        message: 'Enable colored output?',
        default: currentSettings.showColors,
      },
      {
        type: 'list',
        name: 'animationSpeed',
        message: 'Animation speed:',
        choices: [
          { name: 'Fast', value: 'fast' },
          { name: 'Normal', value: 'normal' },
          { name: 'Slow', value: 'slow' },
          { name: 'Disabled', value: 'none' },
        ],
        default: currentSettings.animationSpeed,
      },
    ]);

    const spinner = createSpinner('Updating display settings...').start();

    try {
      await this.configManager.updateDisplaySettings(newSettings);
      spinner.success({ text: 'Display settings updated successfully!' });

      console.log(
        boxen(
          chalk.green('✅ Display Settings Updated!') +
            '\n\n' +
            chalk.cyan('Theme: ') +
            chalk.white(newSettings.theme) +
            '\n' +
            chalk.cyan('Table Style: ') +
            chalk.white(newSettings.tableStyle) +
            '\n' +
            chalk.cyan('Date Format: ') +
            chalk.white(newSettings.dateFormat) +
            '\n' +
            chalk.cyan('Colors: ') +
            chalk.white(newSettings.showColors ? 'Enabled' : 'Disabled'),
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
      spinner.error({ text: 'Failed to update display settings' });
      throw error;
    }
  }

  private async configureCurrencySettings(): Promise<void> {
    console.log('\n' + chalk.bold('💰 Currency & Format Settings'));

    const currentSettings = await this.configManager.getCurrencySettings();

    console.log(
      boxen(
        chalk.cyan('Current Currency Settings:') +
          '\n\n' +
          chalk.white('Currency: ') +
          chalk.yellow(currentSettings.currency) +
          '\n' +
          chalk.white('Symbol: ') +
          chalk.yellow(currentSettings.symbol) +
          '\n' +
          chalk.white('Position: ') +
          chalk.yellow(currentSettings.position) +
          '\n' +
          chalk.white('Decimal Places: ') +
          chalk.yellow(currentSettings.decimalPlaces.toString()) +
          '\n' +
          chalk.white('Thousands Separator: ') +
          chalk.yellow(currentSettings.thousandsSeparator),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
        }
      )
    );

    const newSettings = await inquirer.prompt([
      {
        type: 'list',
        name: 'currency',
        message: 'Select currency:',
        choices: [
          { name: '🇳🇬 Nigerian Naira (NGN)', value: 'NGN' },
          { name: '🇺🇸 US Dollar (USD)', value: 'USD' },
          { name: '🇬🇧 British Pound (GBP)', value: 'GBP' },
          { name: '🇪🇺 Euro (EUR)', value: 'EUR' },
          { name: '🇯🇵 Japanese Yen (JPY)', value: 'JPY' },
          { name: '🇨🇦 Canadian Dollar (CAD)', value: 'CAD' },
          { name: '🇦🇺 Australian Dollar (AUD)', value: 'AUD' },
          { name: '🇨🇭 Swiss Franc (CHF)', value: 'CHF' },
          { name: '🇨🇳 Chinese Yuan (CNY)', value: 'CNY' },
          { name: '🇮🇳 Indian Rupee (INR)', value: 'INR' },
        ],
        default: currentSettings.currency,
      },
      {
        type: 'input',
        name: 'symbol',
        message: 'Enter currency symbol:',
        default: currentSettings.symbol,
        validate: input => input.trim().length > 0 || 'Symbol cannot be empty',
      },
      {
        type: 'list',
        name: 'position',
        message: 'Symbol position:',
        choices: [
          { name: 'Before amount (₦100)', value: 'before' },
          { name: 'After amount (100₦)', value: 'after' },
        ],
        default: currentSettings.position,
      },
      {
        type: 'list',
        name: 'decimalPlaces',
        message: 'Number of decimal places:',
        choices: [
          { name: '0 (100)', value: 0 },
          { name: '1 (100.0)', value: 1 },
          { name: '2 (100.00)', value: 2 },
          { name: '3 (100.000)', value: 3 },
          { name: '4 (100.0000)', value: 4 },
        ],
        default: currentSettings.decimalPlaces,
      },
      {
        type: 'list',
        name: 'thousandsSeparator',
        message: 'Thousands separator:',
        choices: [
          { name: 'Comma (1,000)', value: ',' },
          { name: 'Period (1.000)', value: '.' },
          { name: 'Space (1 000)', value: ' ' },
          { name: 'None (1000)', value: '' },
        ],
        default: currentSettings.thousandsSeparator,
      },
    ]);

    const spinner = createSpinner('Updating currency settings...').start();

    try {
      await this.configManager.updateCurrencySettings(newSettings);
      spinner.success({ text: 'Currency settings updated successfully!' });

      // Show preview of formatting
      const sampleAmount = 1234567.89;
      const formattedSample = this.configManager.formatCurrency(sampleAmount);

      console.log(
        boxen(
          chalk.green('✅ Currency Settings Updated!') +
            '\n\n' +
            chalk.cyan('Currency: ') +
            chalk.white(newSettings.currency) +
            '\n' +
            chalk.cyan('Symbol: ') +
            chalk.white(newSettings.symbol) +
            '\n' +
            chalk.cyan('Format Preview: ') +
            chalk.yellow(formattedSample),
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
      spinner.error({ text: 'Failed to update currency settings' });
      throw error;
    }
  }

  private async configureNotificationSettings(): Promise<void> {
    console.log('\n' + chalk.bold('🔔 Notification Settings'));

    const currentSettings = await this.configManager.getNotificationSettings();

    console.log(
      boxen(
        chalk.cyan('Current Notification Settings:') +
          '\n\n' +
          chalk.white('Due Date Reminders: ') +
          (currentSettings.dueDateReminders
            ? chalk.green('Enabled')
            : chalk.red('Disabled')) +
          '\n' +
          chalk.white('Reminder Days: ') +
          chalk.yellow(currentSettings.reminderDays.toString()) +
          '\n' +
          chalk.white('Overdue Alerts: ') +
          (currentSettings.overdueAlerts
            ? chalk.green('Enabled')
            : chalk.red('Disabled')) +
          '\n' +
          chalk.white('Sound Notifications: ') +
          (currentSettings.soundNotifications
            ? chalk.green('Enabled')
            : chalk.red('Disabled')) +
          '\n' +
          chalk.white('Email Notifications: ') +
          (currentSettings.emailNotifications
            ? chalk.green('Enabled')
            : chalk.red('Disabled')),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
        }
      )
    );

    const newSettings = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'dueDateReminders',
        message: 'Enable due date reminders?',
        default: currentSettings.dueDateReminders,
      },
      {
        type: 'number',
        name: 'reminderDays',
        message: 'Days before due date to show reminders:',
        default: currentSettings.reminderDays,
        validate: input => input >= 0 || 'Must be 0 or greater',
        when: answers => answers.dueDateReminders,
      },
      {
        type: 'confirm',
        name: 'overdueAlerts',
        message: 'Enable overdue alerts?',
        default: currentSettings.overdueAlerts,
      },
      {
        type: 'confirm',
        name: 'soundNotifications',
        message: 'Enable sound notifications?',
        default: currentSettings.soundNotifications,
      },
      {
        type: 'confirm',
        name: 'emailNotifications',
        message: 'Enable email notifications?',
        default: currentSettings.emailNotifications,
      },
      {
        type: 'input',
        name: 'emailAddress',
        message: 'Enter email address for notifications:',
        default: currentSettings.emailAddress || '',
        validate: input => {
          if (!input.trim()) return true; // Optional
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(input) || 'Invalid email format';
        },
        when: answers => answers.emailNotifications,
      },
    ]);

    const spinner = createSpinner('Updating notification settings...').start();

    try {
      await this.configManager.updateNotificationSettings(newSettings);
      spinner.success({ text: 'Notification settings updated successfully!' });

      console.log(
        boxen(
          chalk.green('✅ Notification Settings Updated!') +
            '\n\n' +
            chalk.cyan('Due Date Reminders: ') +
            chalk.white(newSettings.dueDateReminders ? 'Enabled' : 'Disabled') +
            '\n' +
            (newSettings.dueDateReminders
              ? chalk.cyan('Reminder Days: ') +
                chalk.white(newSettings.reminderDays?.toString() || '3') +
                '\n'
              : '') +
            chalk.cyan('Overdue Alerts: ') +
            chalk.white(newSettings.overdueAlerts ? 'Enabled' : 'Disabled') +
            '\n' +
            chalk.cyan('Email Notifications: ') +
            chalk.white(
              newSettings.emailNotifications ? 'Enabled' : 'Disabled'
            ),
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
      spinner.error({ text: 'Failed to update notification settings' });
      throw error;
    }
  }

  private async configureStorageSettings(): Promise<void> {
    console.log('\n' + chalk.bold('📁 Data Storage Settings'));

    const currentSettings = await this.configManager.getStorageSettings();

    console.log(
      boxen(
        chalk.cyan('Current Storage Settings:') +
          '\n\n' +
          chalk.white('Data Directory: ') +
          chalk.yellow(currentSettings.dataDirectory) +
          '\n' +
          chalk.white('Auto Save: ') +
          (currentSettings.autoSave
            ? chalk.green('Enabled')
            : chalk.red('Disabled')) +
          '\n' +
          chalk.white('Backup Directory: ') +
          chalk.yellow(currentSettings.backupDirectory) +
          '\n' +
          chalk.white('Max File Size: ') +
          chalk.yellow(currentSettings.maxFileSize) +
          '\n' +
          chalk.white('Compression: ') +
          (currentSettings.compression
            ? chalk.green('Enabled')
            : chalk.red('Disabled')),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
        }
      )
    );

    const newSettings = await inquirer.prompt([
      {
        type: 'input',
        name: 'dataDirectory',
        message: 'Data directory path:',
        default: currentSettings.dataDirectory,
        validate: input =>
          input.trim().length > 0 || 'Directory path cannot be empty',
      },
      {
        type: 'confirm',
        name: 'autoSave',
        message: 'Enable automatic saving?',
        default: currentSettings.autoSave,
      },
      {
        type: 'input',
        name: 'backupDirectory',
        message: 'Backup directory path:',
        default: currentSettings.backupDirectory,
        validate: input =>
          input.trim().length > 0 || 'Backup directory path cannot be empty',
      },
      {
        type: 'list',
        name: 'maxFileSize',
        message: 'Maximum file size:',
        choices: [
          { name: '1 MB', value: '1MB' },
          { name: '5 MB', value: '5MB' },
          { name: '10 MB', value: '10MB' },
          { name: '25 MB', value: '25MB' },
          { name: '50 MB', value: '50MB' },
          { name: '100 MB', value: '100MB' },
        ],
        default: currentSettings.maxFileSize,
      },
      {
        type: 'confirm',
        name: 'compression',
        message: 'Enable data compression?',
        default: currentSettings.compression,
      },
    ]);

    const spinner = createSpinner('Updating storage settings...').start();

    try {
      await this.configManager.updateStorageSettings(newSettings);
      spinner.success({ text: 'Storage settings updated successfully!' });

      console.log(
        boxen(
          chalk.green('✅ Storage Settings Updated!') +
            '\n\n' +
            chalk.cyan('Data Directory: ') +
            chalk.white(newSettings.dataDirectory) +
            '\n' +
            chalk.cyan('Auto Save: ') +
            chalk.white(newSettings.autoSave ? 'Enabled' : 'Disabled') +
            '\n' +
            chalk.cyan('Max File Size: ') +
            chalk.white(newSettings.maxFileSize) +
            '\n' +
            chalk.cyan('Compression: ') +
            chalk.white(newSettings.compression ? 'Enabled' : 'Disabled'),
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
      spinner.error({ text: 'Failed to update storage settings' });
      throw error;
    }
  }

  private async configureSecuritySettings(): Promise<void> {
    console.log('\n' + chalk.bold('🔒 Security Settings'));

    const currentSettings = await this.configManager.getSecuritySettings();

    console.log(
      boxen(
        chalk.cyan('Current Security Settings:') +
          '\n\n' +
          chalk.white('Data Encryption: ') +
          (currentSettings.dataEncryption
            ? chalk.green('Enabled')
            : chalk.red('Disabled')) +
          '\n' +
          chalk.white('Password Protection: ') +
          (currentSettings.passwordProtection
            ? chalk.green('Enabled')
            : chalk.red('Disabled')) +
          '\n' +
          chalk.white('Session Timeout: ') +
          chalk.yellow(currentSettings.sessionTimeout) +
          '\n' +
          chalk.white('Audit Logging: ') +
          (currentSettings.auditLogging
            ? chalk.green('Enabled')
            : chalk.red('Disabled')) +
          '\n' +
          chalk.white('Auto Lock: ') +
          (currentSettings.autoLock
            ? chalk.green('Enabled')
            : chalk.red('Disabled')),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
        }
      )
    );

    const newSettings = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'dataEncryption',
        message: 'Enable data encryption?',
        default: currentSettings.dataEncryption,
      },
      {
        type: 'confirm',
        name: 'passwordProtection',
        message: 'Enable password protection?',
        default: currentSettings.passwordProtection,
      },
      {
        type: 'password',
        name: 'password',
        message: 'Enter new password:',
        mask: '*',
        validate: input =>
          input.length >= 6 || 'Password must be at least 6 characters',
        when: answers =>
          answers.passwordProtection && !currentSettings.passwordProtection,
      },
      {
        type: 'password',
        name: 'confirmPassword',
        message: 'Confirm password:',
        mask: '*',
        validate: (input, answers) =>
          input === answers.password || 'Passwords do not match',
        when: answers => answers.password,
      },
      {
        type: 'list',
        name: 'sessionTimeout',
        message: 'Session timeout:',
        choices: [
          { name: '15 minutes', value: '15m' },
          { name: '30 minutes', value: '30m' },
          { name: '1 hour', value: '1h' },
          { name: '2 hours', value: '2h' },
          { name: 'Never', value: 'never' },
        ],
        default: currentSettings.sessionTimeout,
      },
      {
        type: 'confirm',
        name: 'auditLogging',
        message: 'Enable audit logging?',
        default: currentSettings.auditLogging,
      },
      {
        type: 'confirm',
        name: 'autoLock',
        message: 'Enable auto lock on inactivity?',
        default: currentSettings.autoLock,
      },
    ]);

    const spinner = createSpinner('Updating security settings...').start();

    try {
      // Remove password confirmation from settings
      const { confirmPassword, ...settingsToSave } = newSettings;

      await this.configManager.updateSecuritySettings(settingsToSave);
      spinner.success({ text: 'Security settings updated successfully!' });

      console.log(
        boxen(
          chalk.green('✅ Security Settings Updated!') +
            '\n\n' +
            chalk.cyan('Data Encryption: ') +
            chalk.white(newSettings.dataEncryption ? 'Enabled' : 'Disabled') +
            '\n' +
            chalk.cyan('Password Protection: ') +
            chalk.white(
              newSettings.passwordProtection ? 'Enabled' : 'Disabled'
            ) +
            '\n' +
            chalk.cyan('Session Timeout: ') +
            chalk.white(newSettings.sessionTimeout) +
            '\n' +
            chalk.cyan('Audit Logging: ') +
            chalk.white(newSettings.auditLogging ? 'Enabled' : 'Disabled'),
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
      spinner.error({ text: 'Failed to update security settings' });
      throw error;
    }
  }

  private async configureLocaleSettings(): Promise<void> {
    console.log('\n' + chalk.bold('🌍 Locale & Language Settings'));

    const currentSettings = await this.configManager.getLocaleSettings();

    console.log(
      boxen(
        chalk.cyan('Current Locale Settings:') +
          '\n\n' +
          chalk.white('Language: ') +
          chalk.yellow(currentSettings.language) +
          '\n' +
          chalk.white('Region: ') +
          chalk.yellow(currentSettings.region) +
          '\n' +
          chalk.white('Timezone: ') +
          chalk.yellow(currentSettings.timezone) +
          '\n' +
          chalk.white('First Day of Week: ') +
          chalk.yellow(currentSettings.firstDayOfWeek) +
          '\n' +
          chalk.white('Number Format: ') +
          chalk.yellow(currentSettings.numberFormat),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
        }
      )
    );

    const newSettings = await inquirer.prompt([
      {
        type: 'list',
        name: 'language',
        message: 'Select language:',
        choices: [
          { name: '🇬🇧 English (Nigeria)', value: 'en-NG' },
          { name: '🇺🇸 English (US)', value: 'en-US' },
          { name: '🇬🇧 English (UK)', value: 'en-GB' },
          { name: '🇫🇷 French', value: 'fr-FR' },
          { name: '🇪🇸 Spanish', value: 'es-ES' },
          { name: '🇩🇪 German', value: 'de-DE' },
          { name: '🇮🇹 Italian', value: 'it-IT' },
          { name: '🇵🇹 Portuguese', value: 'pt-PT' },
          { name: '🇷🇺 Russian', value: 'ru-RU' },
          { name: '🇨🇳 Chinese (Simplified)', value: 'zh-CN' },
          { name: '🇯🇵 Japanese', value: 'ja-JP' },
          { name: '🇰🇷 Korean', value: 'ko-KR' },
          { name: '🇦🇷 Arabic', value: 'ar-SA' },
          { name: '🇮🇳 Hindi', value: 'hi-IN' },
        ],
        default: currentSettings.language,
      },
      {
        type: 'list',
        name: 'region',
        message: 'Select region:',
        choices: [
          { name: '🌍 Africa/Lagos', value: 'Africa/Lagos' },
          { name: '🌍 America/New_York', value: 'America/New_York' },
          { name: '🌍 Europe/London', value: 'Europe/London' },
          { name: '🌍 Europe/Paris', value: 'Europe/Paris' },
          { name: '🌍 Asia/Tokyo', value: 'Asia/Tokyo' },
          { name: '🌍 Asia/Shanghai', value: 'Asia/Shanghai' },
          { name: '🌍 Asia/Dubai', value: 'Asia/Dubai' },
          { name: '🌍 Australia/Sydney', value: 'Australia/Sydney' },
        ],
        default: currentSettings.region,
      },
      {
        type: 'list',
        name: 'timezone',
        message: 'Select timezone:',
        choices: [
          { name: 'WAT (West Africa Time)', value: 'WAT' },
          { name: 'GMT (Greenwich Mean Time)', value: 'GMT' },
          { name: 'EST (Eastern Standard Time)', value: 'EST' },
          { name: 'PST (Pacific Standard Time)', value: 'PST' },
          { name: 'CET (Central European Time)', value: 'CET' },
          { name: 'JST (Japan Standard Time)', value: 'JST' },
          { name: 'CST (China Standard Time)', value: 'CST' },
          { name: 'IST (India Standard Time)', value: 'IST' },
        ],
        default: currentSettings.timezone,
      },
      {
        type: 'list',
        name: 'firstDayOfWeek',
        message: 'First day of week:',
        choices: [
          { name: 'Monday', value: 'monday' },
          { name: 'Sunday', value: 'sunday' },
          { name: 'Saturday', value: 'saturday' },
        ],
        default: currentSettings.firstDayOfWeek,
      },
      {
        type: 'list',
        name: 'numberFormat',
        message: 'Number format:',
        choices: [
          { name: 'UK Format (1,234.56)', value: 'uk' },
          { name: 'US Format (1,234.56)', value: 'us' },
          { name: 'European Format (1.234,56)', value: 'eu' },
          { name: 'Indian Format (1,23,456.78)', value: 'in' },
        ],
        default: currentSettings.numberFormat,
      },
    ]);

    const spinner = createSpinner('Updating locale settings...').start();

    try {
      await this.configManager.updateLocaleSettings(newSettings);
      spinner.success({ text: 'Locale settings updated successfully!' });

      console.log(
        boxen(
          chalk.green('✅ Locale Settings Updated!') +
            '\n\n' +
            chalk.cyan('Language: ') +
            chalk.white(newSettings.language) +
            '\n' +
            chalk.cyan('Region: ') +
            chalk.white(newSettings.region) +
            '\n' +
            chalk.cyan('Timezone: ') +
            chalk.white(newSettings.timezone) +
            '\n' +
            chalk.cyan('First Day of Week: ') +
            chalk.white(newSettings.firstDayOfWeek),
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
      spinner.error({ text: 'Failed to update locale settings' });
      throw error;
    }
  }

  private async exportSettings(): Promise<void> {
    console.log('\n' + chalk.bold('📤 Export Settings'));

    const exportOptions = await inquirer.prompt([
      {
        type: 'input',
        name: 'filename',
        message: 'Enter export filename:',
        default: `loantrack-settings-${new Date().toISOString().split('T')[0]}.json`,
        validate: input =>
          input.trim().length > 0 || 'Filename cannot be empty',
      },
      {
        type: 'checkbox',
        name: 'sections',
        message: 'Select sections to export:',
        choices: [
          { name: 'Display Settings', value: 'display', checked: true },
          { name: 'Currency Settings', value: 'currency', checked: true },
          {
            name: 'Notification Settings',
            value: 'notifications',
            checked: true,
          },
          { name: 'Storage Settings', value: 'storage', checked: true },
          { name: 'Security Settings', value: 'security', checked: false },
          { name: 'Locale Settings', value: 'locale', checked: true },
        ],
        validate: input => input.length > 0 || 'Select at least one section',
      },
      {
        type: 'confirm',
        name: 'includeMetadata',
        message: 'Include export metadata?',
        default: true,
      },
    ]);

    const spinner = createSpinner('Exporting settings...').start();

    try {
      const exportResult =
        await this.configManager.exportSettings(exportOptions);
      spinner.success({ text: 'Settings exported successfully!' });

      console.log(
        boxen(
          chalk.green('✅ Settings Export Complete!') +
            '\n\n' +
            chalk.cyan('📁 File: ') +
            chalk.white(exportResult.filename) +
            '\n' +
            chalk.cyan('📍 Location: ') +
            chalk.white(exportResult.path) +
            '\n' +
            chalk.cyan('📊 Sections: ') +
            chalk.white(exportResult.sections.join(', ')) +
            '\n' +
            chalk.cyan('📏 Size: ') +
            chalk.white(exportResult.size),
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
      spinner.error({ text: 'Failed to export settings' });
      throw error;
    }
  }

  private async importSettings(): Promise<void> {
    console.log('\n' + chalk.bold('📥 Import Settings'));

    const importOptions = await inquirer.prompt([
      {
        type: 'input',
        name: 'filename',
        message: 'Enter settings file path:',
        validate: async input => {
          if (!input.trim()) return 'Filename cannot be empty';
          try {
            await fs.access(input);
            return true;
          } catch {
            return 'File not found or not accessible';
          }
        },
      },
      {
        type: 'list',
        name: 'mode',
        message: 'Import mode:',
        choices: [
          { name: 'Preview (show what will be imported)', value: 'preview' },
          { name: 'Merge (combine with current settings)', value: 'merge' },
          { name: 'Replace (overwrite current settings)', value: 'replace' },
        ],
      },
      {
        type: 'confirm',
        name: 'createBackup',
        message: 'Create backup of current settings before import?',
        default: true,
        when: answers => answers.mode !== 'preview',
      },
    ]);

    const spinner = createSpinner('Processing import...').start();

    try {
      const importResult =
        await this.configManager.importSettings(importOptions);
      spinner.success({ text: 'Import completed successfully!' });

      if (importOptions.mode === 'preview') {
        console.log(
          boxen(
            chalk.cyan('📋 Import Preview') +
              '\n\n' +
              chalk.white('File: ') +
              chalk.yellow(importResult.filename) +
              '\n' +
              chalk.white('Valid: ') +
              (importResult.valid ? chalk.green('Yes') : chalk.red('No')) +
              '\n' +
              chalk.white('Sections: ') +
              chalk.white(importResult.sections.join(', ')) +
              '\n' +
              chalk.white('Conflicts: ') +
              chalk.yellow(importResult.conflicts.toString()),
            {
              padding: 1,
              margin: 1,
              borderStyle: 'round',
              borderColor: 'cyan',
              textAlignment: 'left',
            }
          )
        );
      } else {
        console.log(
          boxen(
            chalk.green('✅ Settings Import Complete!') +
              '\n\n' +
              chalk.cyan('File: ') +
              chalk.white(importResult.filename) +
              '\n' +
              chalk.cyan('Imported Sections: ') +
              chalk.white((importResult.importedSections || []).join(', ')) +
              '\n' +
              chalk.cyan('Conflicts Resolved: ') +
              chalk.white((importResult.conflictsResolved || 0).toString()) +
              '\n' +
              chalk.cyan('Backup Created: ') +
              chalk.white(importResult.backupCreated ? 'Yes' : 'No'),
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
      spinner.error({ text: 'Failed to import settings' });
      throw error;
    }
  }

  private async resetToDefaults(): Promise<void> {
    console.log('\n' + chalk.bold('🔄 Reset to Defaults'));

    console.log(
      boxen(
        chalk.yellow('⚠️  WARNING: Reset Configuration') +
          '\n\n' +
          'This will reset ALL settings to their default values.\n' +
          'Your current configuration will be lost unless you create a backup first.',
        {
          padding: 1,
          margin: 1,
          borderStyle: 'double',
          borderColor: 'yellow',
          textAlignment: 'left',
        }
      )
    );

    const { createBackup, confirmReset } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'createBackup',
        message: 'Create a backup of current settings before reset?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'confirmReset',
        message: 'Are you sure you want to reset all settings to defaults?',
        default: false,
      },
    ]);

    if (!confirmReset) {
      console.log(chalk.yellow('Reset operation cancelled.'));
      return;
    }

    const spinner = createSpinner('Resetting configuration...').start();

    try {
      if (createBackup) {
        await this.configManager.backupCurrentSettings();
      }

      await this.configManager.resetToDefaults();
      spinner.success({ text: 'Configuration reset to defaults!' });

      console.log(
        boxen(
          chalk.green('✅ Configuration Reset Complete!') +
            '\n\n' +
            chalk.cyan(
              'All settings have been restored to their default values.'
            ) +
            '\n' +
            (createBackup
              ? chalk.cyan(
                  'A backup of your previous settings has been created.'
                )
              : ''),
          {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'green',
            textAlignment: 'center',
          }
        )
      );
    } catch (error) {
      spinner.error({ text: 'Failed to reset configuration' });
      throw error;
    }
  }

  private async showDetailedSummary(): Promise<void> {
    console.log('\n' + chalk.bold('📊 Configuration Summary'));

    const spinner = createSpinner('Generating detailed summary...').start();

    try {
      const summary = await this.configManager.getConfigSummary();
      const validation = await this.configManager.validateConfig();
      const fullConfig = await this.configManager.getFullConfig();

      spinner.stop();

      console.log(
        boxen(
          chalk.cyan.bold('📊 DETAILED CONFIGURATION SUMMARY') +
            '\n\n' +
            chalk.white('═══ GENERAL INFORMATION ═══') +
            '\n' +
            chalk.white('Version: ') +
            chalk.yellow(summary.version) +
            '\n' +
            chalk.white('Last Updated: ') +
            chalk.gray(new Date(summary.lastUpdated).toLocaleString()) +
            '\n' +
            chalk.white('Total Settings: ') +
            chalk.yellow(summary.totalSettings.toString()) +
            '\n' +
            chalk.white('Config File Size: ') +
            chalk.green(summary.configSize) +
            '\n' +
            chalk.white('Validation Status: ') +
            (validation.valid ? chalk.green('Valid') : chalk.red('Invalid')) +
            '\n\n' +
            chalk.white('═══ CURRENT SETTINGS ═══') +
            '\n' +
            chalk.white('Theme: ') +
            chalk.cyan(fullConfig.display.theme) +
            '\n' +
            chalk.white('Currency: ') +
            chalk.green(fullConfig.currency.currency) +
            ' (' +
            fullConfig.currency.symbol +
            ')' +
            '\n' +
            chalk.white('Language: ') +
            chalk.blue(fullConfig.locale.language) +
            '\n' +
            chalk.white('Timezone: ') +
            chalk.magenta(fullConfig.locale.timezone) +
            '\n' +
            chalk.white('Auto Save: ') +
            (fullConfig.storage.autoSave
              ? chalk.green('Enabled')
              : chalk.red('Disabled')) +
            '\n' +
            chalk.white('Notifications: ') +
            (fullConfig.notifications.dueDateReminders
              ? chalk.green('Enabled')
              : chalk.red('Disabled')) +
            '\n' +
            chalk.white('Security: ') +
            (fullConfig.security.passwordProtection
              ? chalk.green('Protected')
              : chalk.yellow('Basic')),
          {
            padding: 1,
            margin: 1,
            borderStyle: 'double',
            borderColor: 'cyan',
            textAlignment: 'left',
          }
        )
      );

      if (!validation.valid && validation.errors.length > 0) {
        console.log(
          boxen(
            chalk.red.bold('⚠️  VALIDATION ERRORS') +
              '\n\n' +
              validation.errors
                .map(error => chalk.red('• ' + error))
                .join('\n'),
            {
              padding: 1,
              margin: 1,
              borderStyle: 'round',
              borderColor: 'red',
              textAlignment: 'left',
            }
          )
        );
      }
    } catch (error) {
      spinner.error({ text: 'Failed to generate summary' });
      throw error;
    }
  }
}
