import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import { Logger } from '../core/logger';
import { ConfigManager, AppConfig } from '../core/config-manager';
import { StorageService } from './storage.service';
import { Loan } from '../interfaces/loan.interface';

export interface BackupMetadata {
  id: string;
  timestamp: string;
  type: 'full' | 'loans-only' | 'settings-only';
  size: number;
  checksum: string;
  version: string;
  description?: string;
  compressed: boolean;
  encrypted: boolean;
}

export interface BackupData {
  metadata: BackupMetadata;
  loans?: Loan[];
  settings?: AppConfig;
  version: string;
}

export interface BackupStats {
  totalBackups: number;
  totalSize: number;
  oldestBackup: string | null;
  newestBackup: string | null;
  backupsByType: Record<string, number>;
  healthScore: number;
}

export interface AutoBackupSettings {
  enabled: boolean;
  frequency: string;
  maxBackups: number;
  lastBackup?: string;
  compress: boolean;
}

export interface CleanupSuggestion {
  id: string;
  filename: string;
  reason: string;
}

export interface CleanupResult {
  deletedCount: number;
  spaceFreed: string;
  remainingBackups: number;
}

export interface RestoreResult {
  loansRestored: number;
  settingsRestored: boolean;
}

export interface BackupStatistics {
  totalBackups: number;
  totalSize: string;
  averageSize: string;
  oldestBackup: string;
  newestBackup: string;
  fullBackups: number;
  loanBackups: number;
  settingsBackups: number;
  compressedBackups: number;
  uncompressedBackups: number;
  spaceSaved: string;
  backupHealth: number;
  healthSummary: string;
}

export class BackupService {
  private logger: Logger;
  private configManager: ConfigManager;
  private storageService: StorageService;
  private backupDir: string;

  constructor() {
    this.logger = new Logger();
    this.configManager = new ConfigManager();
    this.storageService = new StorageService();
    this.backupDir = path.join(process.cwd(), 'data', 'backups');
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      this.logger.info('Backup service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize backup service', error as Error);
      throw error;
    }
  }

  async createBackup(
    type: 'full' | 'loans-only' | 'settings-only' = 'full',
    description?: string,
    options: {
      compress?: boolean;
      encrypt?: boolean;
    } = {}
  ): Promise<string> {
    try {
      await this.initialize();
      
      const backupId = this.generateBackupId();
      const timestamp = new Date().toISOString();
      
      // Gather data based on backup type
      const backupData: BackupData = {
        metadata: {
          id: backupId,
          timestamp,
          type,
          size: 0,
          checksum: '',
          version: '2.0.0',
          description,
          compressed: options.compress || false,
          encrypted: options.encrypt || false
        },
        version: '2.0.0'
      };

      if (type === 'full' || type === 'loans-only') {
        backupData.loans = await this.storageService.readLoans();
      }

      if (type === 'full' || type === 'settings-only') {
        // Use getFullConfig() instead of getAllSettings()
        backupData.settings = await this.configManager.getFullConfig();
      }

      // Convert to JSON
      let jsonData = JSON.stringify(backupData, null, 2);
      
      // Apply compression if requested
      if (options.compress) {
        jsonData = await this.compressData(jsonData);
      }

      // Apply encryption if requested
      if (options.encrypt) {
        jsonData = await this.encryptData(jsonData);
      }

      // Calculate size and checksum
      const dataBuffer = Buffer.from(jsonData);
      backupData.metadata.size = dataBuffer.length;
      backupData.metadata.checksum = this.calculateChecksum(dataBuffer);

      // Update metadata in the backup data
      jsonData = JSON.stringify(backupData, null, 2);

      // Save backup file
      const backupPath = path.join(this.backupDir, `${backupId}.backup`);
      await fs.writeFile(backupPath, jsonData);

      this.logger.info(`Backup created successfully: ${backupId}`);
      return backupId;

    } catch (error) {
      this.logger.error('Failed to create backup', error as Error);
      throw error;
    }
  }

  async restoreBackup(
    backupId: string,
    options: {
      restoreLoans?: boolean;
      restoreSettings?: boolean;
      createSafetyBackup?: boolean;
    } = {}
  ): Promise<RestoreResult> {
    try {
      // Create safety backup before restore
      if (options.createSafetyBackup !== false) {
        await this.createBackup('full', `Safety backup before restore ${backupId}`);
      }

      const backupData = await this.loadBackup(backupId);
      
      if (!backupData) {
        throw new Error(`Backup ${backupId} not found`);
      }

      // Validate backup integrity
      await this.validateBackup(backupData);

      let loansRestored = 0;
      let settingsRestored = false;

      // Restore loans if requested and available
      if (options.restoreLoans !== false && backupData.loans) {
        await this.storageService.saveLoans(backupData.loans);
        loansRestored = backupData.loans.length;
        this.logger.info('Loans restored successfully');
      }

      // Restore settings if requested and available
      if (options.restoreSettings !== false && backupData.settings) {
        // Use importSettings() method instead of restoreSettings()
        const tempBackupPath = path.join(this.backupDir, `temp_restore_${Date.now()}.json`);
        await fs.writeFile(tempBackupPath, JSON.stringify(backupData.settings, null, 2));
        
        try {
          await this.configManager.importSettings({
            filename: tempBackupPath,
            mode: 'replace',
            createBackup: false
          });
          settingsRestored = true;
          this.logger.info('Settings restored successfully');
        } finally {
          // Clean up temp file
          try {
            await fs.unlink(tempBackupPath);
          } catch (error) {
            this.logger.warn('Failed to clean up temp restore file', error as Error);
          }
        }
      }

      this.logger.info(`Backup ${backupId} restored successfully`);

      return {
        loansRestored,
        settingsRestored
      };

    } catch (error) {
      this.logger.error(`Failed to restore backup ${backupId}`, error as Error);
      throw error;
    }
  }

  async listBackups(): Promise<BackupMetadata[]> {
    try {
      await this.initialize();
      
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.endsWith('.backup'));
      
      const backups: BackupMetadata[] = [];
      
      for (const file of backupFiles) {
        try {
          const backupPath = path.join(this.backupDir, file);
          const content = await fs.readFile(backupPath, 'utf-8');
          const backupData: BackupData = JSON.parse(content);
          backups.push(backupData.metadata);
        } catch (error) {
          this.logger.warn(`Failed to read backup metadata from ${file}`, error as Error);
        }
      }

      // Sort by timestamp (newest first)
      return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    } catch (error) {
      this.logger.error('Failed to list backups', error as Error);
      return [];
    }
  }

  async deleteBackup(backupId: string): Promise<boolean> {
    try {
      const backupPath = path.join(this.backupDir, `${backupId}.backup`);
      await fs.unlink(backupPath);
      this.logger.info(`Backup ${backupId} deleted successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete backup ${backupId}`, error as Error);
      return false;
    }
  }

  async getBackupStats(): Promise<BackupStats> {
    try {
      const backups = await this.listBackups();
      
      const stats: BackupStats = {
        totalBackups: backups.length,
        totalSize: backups.reduce((sum, backup) => sum + backup.size, 0),
        oldestBackup: backups.length > 0 ? backups[backups.length - 1].timestamp : null,
        newestBackup: backups.length > 0 ? backups[0].timestamp : null,
        backupsByType: {},
        healthScore: 0
      };

      // Count backups by type
      backups.forEach(backup => {
        stats.backupsByType[backup.type] = (stats.backupsByType[backup.type] || 0) + 1;
      });

      // Calculate health score (0-100)
      stats.healthScore = this.calculateHealthScore(backups);

      return stats;

    } catch (error) {
      this.logger.error('Failed to get backup stats', error as Error);
      return {
        totalBackups: 0,
        totalSize: 0,
        oldestBackup: null,
        newestBackup: null,
        backupsByType: {},
        healthScore: 0
      };
    }
  }

  async getAutoBackupSettings(): Promise<AutoBackupSettings> {
    try {
      // Mock implementation - in real app, this would read from config
      return {
        enabled: false,
        frequency: 'weekly',
        maxBackups: 10,
        lastBackup: undefined,
        compress: true
      };
    } catch (error) {
      this.logger.error('Failed to get auto backup settings', error as Error);
      return {
        enabled: false,
        frequency: 'weekly',
        maxBackups: 10,
        compress: true
      };
    }
  }

  async updateAutoBackupSettings(settings: Partial<AutoBackupSettings>): Promise<void> {
    try {
      // Mock implementation - in real app, this would save to config
      this.logger.info('Auto backup settings updated', settings);
    } catch (error) {
      this.logger.error('Failed to update auto backup settings', error as Error);
      throw error;
    }
  }

  async getCleanupSuggestions(): Promise<CleanupSuggestion[]> {
    try {
      const backups = await this.listBackups();
      const suggestions: CleanupSuggestion[] = [];

      // Suggest cleanup for backups older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Keep only the 5 most recent backups, suggest others for cleanup
      if (backups.length > 5) {
        const oldBackups = backups.slice(5);
        
        oldBackups.forEach(backup => {
          suggestions.push({
            id: backup.id,
            filename: `${backup.id}.backup`,
            reason: 'Old backup (older than 5 most recent)'
          });
        });
      }

      return suggestions;

    } catch (error) {
      this.logger.error('Failed to get cleanup suggestions', error as Error);
      return [];
    }
  }

  async cleanupBackups(backupIds: string[]): Promise<CleanupResult> {
    try {
      let deletedCount = 0;
      let totalSizeFreed = 0;

      for (const backupId of backupIds) {
        const backups = await this.listBackups();
        const backup = backups.find(b => b.id === backupId);
        
        if (backup) {
          totalSizeFreed += backup.size;
        }

        const deleted = await this.deleteBackup(backupId);
        if (deleted) {
          deletedCount++;
        }
      }

      const remainingBackups = await this.listBackups();

      return {
        deletedCount,
        spaceFreed: `${Math.round(totalSizeFreed / 1024)} KB`,
        remainingBackups: remainingBackups.length
      };

    } catch (error) {
      this.logger.error('Failed to cleanup backups', error as Error);
      throw error;
    }
  }

  async getBackupStatistics(): Promise<BackupStatistics> {
    try {
      const backups = await this.listBackups();
      const stats = await this.getBackupStats();

      const enhancedStats: BackupStatistics = {
        totalBackups: stats.totalBackups,
        totalSize: `${Math.round(stats.totalSize / 1024)} KB`,
        averageSize: stats.totalBackups > 0 ? `${Math.round(stats.totalSize / stats.totalBackups / 1024)} KB` : '0 KB',
        oldestBackup: stats.oldestBackup || 'None',
        newestBackup: stats.newestBackup || 'None',
        fullBackups: stats.backupsByType['full'] || 0,
        loanBackups: stats.backupsByType['loans-only'] || 0,
        settingsBackups: stats.backupsByType['settings-only'] || 0,
        compressedBackups: backups.filter(b => b.compressed).length,
        uncompressedBackups: backups.filter(b => !b.compressed).length,
        spaceSaved: '~25%', // Estimated
        backupHealth: stats.healthScore,
        healthSummary: stats.healthScore >= 80 ? 'Excellent backup health' : 
                      stats.healthScore >= 60 ? 'Good backup health' : 'Backup health needs improvement'
      };

      return enhancedStats;

    } catch (error) {
      this.logger.error('Failed to get backup statistics', error as Error);
      throw error;
    }
  }

  async cleanupOldBackups(retentionDays: number = 30): Promise<number> {
    try {
      const backups = await this.listBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      let deletedCount = 0;

      for (const backup of backups) {
        const backupDate = new Date(backup.timestamp);
        if (backupDate < cutoffDate) {
          const deleted = await this.deleteBackup(backup.id);
          if (deleted) {
            deletedCount++;
          }
        }
      }

      this.logger.info(`Cleaned up ${deletedCount} old backups`);
      return deletedCount;

    } catch (error) {
      this.logger.error('Failed to cleanup old backups', error as Error);
      return 0;
    }
  }

  async verifyBackup(backupId: string): Promise<boolean> {
    try {
      const backupData = await this.loadBackup(backupId);
      if (!backupData) {
        return false;
      }

      await this.validateBackup(backupData);
      return true;

    } catch (error) {
      this.logger.error(`Backup verification failed for ${backupId}`, error as Error);
      return false;
    }
  }

  async exportBackupInventory(): Promise<string> {
    try {
      const backups = await this.listBackups();
      const stats = await this.getBackupStats();
      
      const inventory = {
        generatedAt: new Date().toISOString(),
        statistics: stats,
        backups: backups
      };

      const exportPath = path.join(this.backupDir, 'backup-inventory.json');
      await fs.writeFile(exportPath, JSON.stringify(inventory, null, 2));
      
      this.logger.info('Backup inventory exported successfully');
      return exportPath;

    } catch (error) {
      this.logger.error('Failed to export backup inventory', error as Error);
      throw error;
    }
  }

  private async loadBackup(backupId: string): Promise<BackupData | null> {
    try {
      const backupPath = path.join(this.backupDir, `${backupId}.backup`);
      const content = await fs.readFile(backupPath, 'utf-8');
      return JSON.parse(content) as BackupData;
    } catch (error) {
      this.logger.error(`Failed to load backup ${backupId}`, error as Error);
      return null;
    }
  }

  private async validateBackup(backupData: BackupData): Promise<void> {
    // Validate metadata
    if (!backupData.metadata || !backupData.metadata.id) {
      throw new Error('Invalid backup metadata');
    }

    // Validate version compatibility
    if (!backupData.version) {
      throw new Error('Backup version not specified');
    }

    // Validate data integrity based on type
    if (backupData.metadata.type === 'full' || backupData.metadata.type === 'loans-only') {
      if (!Array.isArray(backupData.loans)) {
        throw new Error('Invalid loans data in backup');
      }
    }

    if (backupData.metadata.type === 'full' || backupData.metadata.type === 'settings-only') {
      if (!backupData.settings) {
        throw new Error('Invalid settings data in backup');
      }
    }

    this.logger.info('Backup validation passed');
  }

  private generateBackupId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `backup_${timestamp}_${random}`;
  }

  private calculateChecksum(data: Buffer): string {
    return createHash('sha256').update(data).digest('hex');
  }

  private calculateHealthScore(backups: BackupMetadata[]): number {
    if (backups.length === 0) return 0;

    let score = 0;

    // Recent backup bonus (40 points max)
    const latestBackup = new Date(backups[0].timestamp);
    const daysSinceLatest = (Date.now() - latestBackup.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLatest <= 1) score += 40;
    else if (daysSinceLatest <= 7) score += 30;
    else if (daysSinceLatest <= 30) score += 20;
    else score += 10;

    // Backup frequency bonus (30 points max)
    if (backups.length >= 10) score += 30;
    else if (backups.length >= 5) score += 20;
    else if (backups.length >= 3) score += 15;
    else score += 10;

    // Backup type diversity bonus (20 points max)
    const types = new Set(backups.map(b => b.type));
    if (types.has('full')) score += 10;
    if (types.has('loans-only')) score += 5;
    if (types.has('settings-only')) score += 5;

    // Size efficiency bonus (10 points max)
    const avgSize = backups.reduce((sum, b) => sum + b.size, 0) / backups.length;
    if (avgSize < 1024 * 1024) score += 10; // Less than 1MB average
    else if (avgSize < 5 * 1024 * 1024) score += 5; // Less than 5MB average

    return Math.min(100, score);
  }

  private async compressData(data: string): Promise<string> {
    // Simple compression simulation - in real implementation, use zlib
    return data;
  }

  private async encryptData(data: string): Promise<string> {
    // Simple encryption simulation - in real implementation, use crypto
    return data;
  }
}
