import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from './logger';

export interface DisplaySettings {
  theme: string;
  tableStyle: string;
  dateFormat: string;
  showColors: boolean;
  animationSpeed: string;
}

export interface CurrencySettings {
  currency: string;
  symbol: string;
  position: string;
  decimalPlaces: number;
  thousandsSeparator: string;
}

export interface NotificationSettings {
  dueDateReminders: boolean;
  reminderDays: number;
  overdueAlerts: boolean;
  soundNotifications: boolean;
  emailNotifications: boolean;
  emailAddress?: string;
}

export interface StorageSettings {
  dataDirectory: string;
  autoSave: boolean;
  backupDirectory: string;
  maxFileSize: string;
  compression: boolean;
}

export interface SecuritySettings {
  dataEncryption: boolean;
  passwordProtection: boolean;
  sessionTimeout: string;
  auditLogging: boolean;
  autoLock: boolean;
  passwordHash?: string;
}

export interface LocaleSettings {
  language: string;
  region: string;
  timezone: string;
  firstDayOfWeek: string;
  numberFormat: string;
}

export interface AppConfig {
  display: DisplaySettings;
  currency: CurrencySettings;
  notifications: NotificationSettings;
  storage: StorageSettings;
  security: SecuritySettings;
  locale: LocaleSettings;
  version: string;
  lastUpdated: string;
}

export class ConfigManager {
  private logger: Logger;
  private configPath: string;
  private config: AppConfig;

  constructor() {
    this.logger = new Logger();
    this.configPath = path.join(__dirname, '../../data/config.json');
    this.config = this.getDefaultConfig();
  }

  async initialize(): Promise<void> {
    try {
      await this.ensureConfigDirectory();
      await this.loadConfig();
      this.logger.info('Configuration manager initialized successfully');
    } catch (error) {
      this.logger.error(
        'Failed to initialize configuration manager',
        error as Error
      );
      throw error;
    }
  }

  private async ensureConfigDirectory(): Promise<void> {
    const configDir = path.dirname(this.configPath);
    try {
      await fs.mkdir(configDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create config directory', error as Error);
      throw error;
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const loadedConfig = JSON.parse(configData) as AppConfig;

      // Merge with defaults to ensure all properties exist
      this.config = this.mergeWithDefaults(loadedConfig);

      this.logger.info('Configuration loaded successfully');
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // Config file doesn't exist, create with defaults
        await this.saveConfig();
        this.logger.info('Created new configuration file with defaults');
      } else {
        this.logger.error('Failed to load configuration', error as Error);
        throw error;
      }
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      this.config.lastUpdated = new Date().toISOString();
      const configData = JSON.stringify(this.config, null, 2);
      await fs.writeFile(this.configPath, configData, 'utf-8');
      this.logger.info('Configuration saved successfully');
    } catch (error) {
      this.logger.error('Failed to save configuration', error as Error);
      throw error;
    }
  }

  private getDefaultConfig(): AppConfig {
    return {
      display: {
        theme: 'rainbow',
        tableStyle: 'grid',
        dateFormat: 'uk',
        showColors: true,
        animationSpeed: 'normal',
      },
      currency: {
        currency: 'NGN',
        symbol: '₦',
        position: 'before',
        decimalPlaces: 2,
        thousandsSeparator: ',',
      },
      notifications: {
        dueDateReminders: true,
        reminderDays: 3,
        overdueAlerts: true,
        soundNotifications: false,
        emailNotifications: false,
      },
      storage: {
        dataDirectory: path.join(__dirname, '../../data'),
        autoSave: true,
        backupDirectory: path.join(__dirname, '../../backups'),
        maxFileSize: '10MB',
        compression: true,
      },
      security: {
        dataEncryption: false,
        passwordProtection: false,
        sessionTimeout: '1h',
        auditLogging: false,
        autoLock: false,
      },
      locale: {
        language: 'en-NG',
        region: 'Africa/Lagos',
        timezone: 'WAT',
        firstDayOfWeek: 'monday',
        numberFormat: 'uk',
      },
      version: '2.0.0',
      lastUpdated: new Date().toISOString(),
    };
  }

  private mergeWithDefaults(loadedConfig: Partial<AppConfig>): AppConfig {
    const defaults = this.getDefaultConfig();

    return {
      display: { ...defaults.display, ...loadedConfig.display },
      currency: { ...defaults.currency, ...loadedConfig.currency },
      notifications: {
        ...defaults.notifications,
        ...loadedConfig.notifications,
      },
      storage: { ...defaults.storage, ...loadedConfig.storage },
      security: { ...defaults.security, ...loadedConfig.security },
      locale: { ...defaults.locale, ...loadedConfig.locale },
      version: loadedConfig.version || defaults.version,
      lastUpdated: loadedConfig.lastUpdated || defaults.lastUpdated,
    };
  }

  // Display Settings Methods
  async getDisplaySettings(): Promise<DisplaySettings> {
    return { ...this.config.display };
  }

  async updateDisplaySettings(
    settings: Partial<DisplaySettings>
  ): Promise<void> {
    this.config.display = { ...this.config.display, ...settings };
    await this.saveConfig();
    this.logger.info('Display settings updated', settings);
  }

  // Currency Settings Methods
  async getCurrencySettings(): Promise<CurrencySettings> {
    return { ...this.config.currency };
  }

  async updateCurrencySettings(
    settings: Partial<CurrencySettings>
  ): Promise<void> {
    this.config.currency = { ...this.config.currency, ...settings };
    await this.saveConfig();
    this.logger.info('Currency settings updated', settings);
  }

  // Notification Settings Methods
  async getNotificationSettings(): Promise<NotificationSettings> {
    return { ...this.config.notifications };
  }

  async updateNotificationSettings(
    settings: Partial<NotificationSettings>
  ): Promise<void> {
    this.config.notifications = { ...this.config.notifications, ...settings };
    await this.saveConfig();
    this.logger.info('Notification settings updated', settings);
  }

  // Storage Settings Methods
  async getStorageSettings(): Promise<StorageSettings> {
    return { ...this.config.storage };
  }

  async updateStorageSettings(
    settings: Partial<StorageSettings>
  ): Promise<void> {
    this.config.storage = { ...this.config.storage, ...settings };
    await this.saveConfig();
    this.logger.info('Storage settings updated', settings);
  }

  // Security Settings Methods
  async getSecuritySettings(): Promise<SecuritySettings> {
    return { ...this.config.security };
  }

  async updateSecuritySettings(
    settings: Partial<SecuritySettings>
  ): Promise<void> {
    this.config.security = { ...this.config.security, ...settings };
    await this.saveConfig();
    this.logger.info('Security settings updated', settings);
  }

  // Locale Settings Methods
  async getLocaleSettings(): Promise<LocaleSettings> {
    return { ...this.config.locale };
  }

  async updateLocaleSettings(settings: Partial<LocaleSettings>): Promise<void> {
    this.config.locale = { ...this.config.locale, ...settings };
    await this.saveConfig();
    this.logger.info('Locale settings updated', settings);
  }

  // General Configuration Methods
  async getFullConfig(): Promise<AppConfig> {
    return { ...this.config };
  }

  async resetToDefaults(): Promise<void> {
    this.config = this.getDefaultConfig();
    await this.saveConfig();
    this.logger.info('Configuration reset to defaults');
  }

  async backupCurrentSettings(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `config-backup-${timestamp}.json`;
      const backupPath = path.join(
        this.config.storage.backupDirectory,
        backupFilename
      );

      await fs.mkdir(path.dirname(backupPath), { recursive: true });
      await fs.writeFile(
        backupPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );

      this.logger.info('Configuration backup created', { backupPath });
      return backupPath;
    } catch (error) {
      this.logger.error('Failed to backup configuration', error as Error);
      throw error;
    }
  }

  async exportSettings(options: {
    filename: string;
    sections: string[];
    includeMetadata: boolean;
  }): Promise<{
    filename: string;
    path: string;
    size: string;
    sections: string[];
  }> {
    try {
      const exportData: any = {};

      if (options.includeMetadata) {
        exportData.metadata = {
          exportDate: new Date().toISOString(),
          version: this.config.version,
          exportedBy: 'LoanTrack Pro',
        };
      }

      // Include selected sections
      options.sections.forEach(section => {
        switch (section) {
          case 'display':
            exportData.display = this.config.display;
            break;
          case 'currency':
            exportData.currency = this.config.currency;
            break;
          case 'notifications':
            exportData.notifications = this.config.notifications;
            break;
          case 'storage':
            exportData.storage = this.config.storage;
            break;
          case 'security':
            // Exclude sensitive data like password hash
            const { passwordHash, ...securitySettings } = this.config.security;
            exportData.security = securitySettings;
            break;
          case 'locale':
            exportData.locale = this.config.locale;
            break;
        }
      });

      const exportPath = path.join(
        this.config.storage.dataDirectory,
        options.filename
      );
      const exportContent = JSON.stringify(exportData, null, 2);

      await fs.writeFile(exportPath, exportContent, 'utf-8');

      const stats = await fs.stat(exportPath);
      const sizeInKB = (stats.size / 1024).toFixed(2);

      this.logger.info('Settings exported successfully', {
        exportPath,
        sections: options.sections,
      });

      return {
        filename: options.filename,
        path: exportPath,
        size: `${sizeInKB} KB`,
        sections: options.sections,
      };
    } catch (error) {
      this.logger.error('Failed to export settings', error as Error);
      throw error;
    }
  }

  async importSettings(options: {
    filename: string;
    mode: 'merge' | 'replace' | 'preview';
    createBackup: boolean;
  }): Promise<{
    filename: string;
    valid: boolean;
    sections: string[];
    conflicts: number;
    importedSections?: string[];
    conflictsResolved?: number;
    backupCreated?: boolean;
    loansRestored?: number;
    settingsRestored?: boolean;
  }> {
    try {
      const importContent = await fs.readFile(options.filename, 'utf-8');
      const importData = JSON.parse(importContent);

      // Validate import data
      const sections = Object.keys(importData).filter(
        key => key !== 'metadata'
      );
      const conflicts = this.countConfigConflicts(importData);

      if (options.mode === 'preview') {
        return {
          filename: path.basename(options.filename),
          valid: true,
          sections,
          conflicts,
        };
      }

      // Create backup if requested
      let backupCreated = false;
      if (options.createBackup) {
        await this.backupCurrentSettings();
        backupCreated = true;
      }

      // Apply settings based on mode
      if (options.mode === 'replace') {
        this.config = this.mergeWithDefaults(importData);
      } else if (options.mode === 'merge') {
        this.config = this.mergeConfigs(this.config, importData);
      }

      await this.saveConfig();

      this.logger.info('Settings imported successfully', {
        filename: options.filename,
        mode: options.mode,
        sections,
      });

      return {
        filename: path.basename(options.filename),
        valid: true,
        sections,
        conflicts,
        importedSections: sections,
        conflictsResolved: conflicts,
        backupCreated,
        loansRestored: 0, // Config manager doesn't handle loans
        settingsRestored: true,
      };
    } catch (error) {
      this.logger.error('Failed to import settings', error as Error);
      throw error;
    }
  }

  private countConfigConflicts(importData: any): number {
    let conflicts = 0;

    Object.keys(importData).forEach(section => {
      if (section !== 'metadata' && this.config[section as keyof AppConfig]) {
        const currentSection = this.config[section as keyof AppConfig];
        const importSection = importData[section];

        if (
          typeof currentSection === 'object' &&
          typeof importSection === 'object'
        ) {
          Object.keys(importSection).forEach(key => {
            if (
              currentSection[key as keyof typeof currentSection] !==
              importSection[key]
            ) {
              conflicts++;
            }
          });
        }
      }
    });

    return conflicts;
  }

  private mergeConfigs(
    current: AppConfig,
    imported: Partial<AppConfig>
  ): AppConfig {
    const merged: AppConfig = { ...current };

    // Handle each section individually with proper type safety
    if (imported.display) {
      merged.display = { ...current.display, ...imported.display };
    }

    if (imported.currency) {
      merged.currency = { ...current.currency, ...imported.currency };
    }

    if (imported.notifications) {
      merged.notifications = {
        ...current.notifications,
        ...imported.notifications,
      };
    }

    if (imported.storage) {
      merged.storage = { ...current.storage, ...imported.storage };
    }

    if (imported.security) {
      merged.security = { ...current.security, ...imported.security };
    }

    if (imported.locale) {
      merged.locale = { ...current.locale, ...imported.locale };
    }

    // Handle string fields separately
    if (imported.version) {
      merged.version = imported.version;
    }
    if (imported.lastUpdated) {
      merged.lastUpdated = imported.lastUpdated;
    }

    return merged;
  }

  // Utility Methods
  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Validate display settings
      if (
        !['rainbow', 'blue', 'green', 'purple', 'mono'].includes(
          this.config.display.theme
        )
      ) {
        errors.push('Invalid display theme');
      }

      // Validate currency settings
      if (
        this.config.currency.decimalPlaces < 0 ||
        this.config.currency.decimalPlaces > 4
      ) {
        errors.push('Invalid decimal places for currency');
      }

      // Validate notification settings
      if (this.config.notifications.reminderDays < 0) {
        errors.push('Reminder days cannot be negative');
      }

      // Validate storage settings
      if (
        !this.config.storage.dataDirectory ||
        this.config.storage.dataDirectory.trim() === ''
      ) {
        errors.push('Data directory cannot be empty');
      }

      // Validate security settings
      if (
        !['15m', '30m', '1h', '2h', 'never'].includes(
          this.config.security.sessionTimeout
        )
      ) {
        errors.push('Invalid session timeout value');
      }

      // Validate locale settings
      if (
        !this.config.locale.language ||
        this.config.locale.language.trim() === ''
      ) {
        errors.push('Language setting cannot be empty');
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      this.logger.error('Error validating configuration', error as Error);
      return {
        valid: false,
        errors: ['Configuration validation failed'],
      };
    }
  }

  async getConfigSummary(): Promise<{
    totalSettings: number;
    lastUpdated: string;
    version: string;
    configSize: string;
    isValid: boolean;
  }> {
    try {
      const stats = await fs.stat(this.configPath);
      const sizeInKB = (stats.size / 1024).toFixed(2);
      const validation = await this.validateConfig();

      // Count total settings
      let totalSettings = 0;
      Object.values(this.config).forEach(section => {
        if (typeof section === 'object' && section !== null) {
          totalSettings += Object.keys(section).length;
        }
      });

      return {
        totalSettings,
        lastUpdated: this.config.lastUpdated,
        version: this.config.version,
        configSize: `${sizeInKB} KB`,
        isValid: validation.valid,
      };
    } catch (error) {
      this.logger.error('Failed to get config summary', error as Error);
      throw error;
    }
  }

  // Theme and formatting helpers
  getThemeColors(): { [key: string]: string } {
    const themes = {
      rainbow: {
        primary: 'cyan',
        secondary: 'magenta',
        success: 'green',
        warning: 'yellow',
        error: 'red',
      },
      blue: {
        primary: 'blue',
        secondary: 'cyan',
        success: 'green',
        warning: 'yellow',
        error: 'red',
      },
      green: {
        primary: 'green',
        secondary: 'cyan',
        success: 'green',
        warning: 'yellow',
        error: 'red',
      },
      purple: {
        primary: 'magenta',
        secondary: 'blue',
        success: 'green',
        warning: 'yellow',
        error: 'red',
      },
      mono: {
        primary: 'white',
        secondary: 'gray',
        success: 'white',
        warning: 'white',
        error: 'white',
      },
    };

    return (
      themes[this.config.display.theme as keyof typeof themes] || themes.rainbow
    );
  }

  formatCurrency(amount: number): string {
    const { symbol, position, decimalPlaces, thousandsSeparator } =
      this.config.currency;

    let formattedAmount = amount.toFixed(decimalPlaces);

    if (thousandsSeparator) {
      const parts = formattedAmount.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
      formattedAmount = parts.join('.');
    }

    return position === 'before'
      ? `${symbol}${formattedAmount}`
      : `${formattedAmount}${symbol}`;
  }

  formatDate(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    switch (this.config.display.dateFormat) {
      case 'uk':
        return dateObj.toLocaleDateString('en-GB');
      case 'us':
        return dateObj.toLocaleDateString('en-US');
      case 'iso':
        return dateObj.toISOString().split('T')[0];
      case 'verbose':
        return dateObj.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      default:
        return dateObj.toLocaleDateString('en-GB');
    }
  }
}
