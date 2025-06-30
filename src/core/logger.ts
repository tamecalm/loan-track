import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  error?: Error;
  context?: any;
  sessionId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  logDirectory: string;
  maxFileSize: number; // in MB
  maxFiles: number;
  dateFormat: string;
  includeStackTrace: boolean;
  colorize: boolean;
}

export class Logger {
  private config: LoggerConfig;
  private logFilePath: string;
  private sessionId: string;
  private logBuffer: LogEntry[] = [];
  private isInitialized: boolean = false;

  constructor(config?: Partial<LoggerConfig>) {
    this.sessionId = this.generateSessionId();
    this.config = {
      level: 'info',
      enableConsole: true,
      enableFile: true,
      logDirectory: path.join(__dirname, '../../logs'),
      maxFileSize: 10, // 10MB
      maxFiles: 5,
      dateFormat: 'ISO',
      includeStackTrace: true,
      colorize: true,
      ...config
    };

    this.logFilePath = path.join(
      this.config.logDirectory,
      `loantrack-${new Date().toISOString().split('T')[0]}.log`
    );

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await this.ensureLogDirectory();
      await this.rotateLogsIfNeeded();
      this.isInitialized = true;
      
      // Log initialization
      this.info('Logger initialized successfully', {
        sessionId: this.sessionId,
        logFile: this.logFilePath,
        config: this.config
      });
    } catch (error) {
      console.error(chalk.red('Failed to initialize logger:'), error);
    }
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.logDirectory, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create log directory: ${error}`);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getLogLevelPriority(level: LogLevel): number {
    const priorities = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      fatal: 4
    };
    return priorities[level];
  }

  private shouldLog(level: LogLevel): boolean {
    return this.getLogLevelPriority(level) >= this.getLogLevelPriority(this.config.level);
  }

  private formatTimestamp(): string {
    const now = new Date();
    
    switch (this.config.dateFormat) {
      case 'ISO':
        return now.toISOString();
      case 'local':
        return now.toLocaleString();
      case 'timestamp':
        return now.getTime().toString();
      default:
        return now.toISOString();
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, message, error, context } = entry;
    
    let logLine = `[${timestamp}] [${level.toUpperCase()}] [${this.sessionId}] ${message}`;
    
    if (context && Object.keys(context).length > 0) {
      logLine += ` | Context: ${JSON.stringify(context)}`;
    }
    
    if (error) {
      logLine += ` | Error: ${error.message}`;
      if (this.config.includeStackTrace && error.stack) {
        logLine += ` | Stack: ${error.stack}`;
      }
    }
    
    return logLine;
  }

  private getConsoleColor(level: LogLevel): string {
    if (!this.config.colorize) return 'white';
    
    const colors = {
      debug: 'gray',
      info: 'cyan',
      warn: 'yellow',
      error: 'red',
      fatal: 'magenta'
    };
    
    return colors[level];
  }

  private getConsoleIcon(level: LogLevel): string {
    const icons = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      fatal: '💥'
    };
    
    return icons[level];
  }

  private async writeToConsole(entry: LogEntry): Promise<void> {
    if (!this.config.enableConsole) return;
    
    const color = this.getConsoleColor(entry.level) as keyof typeof chalk;
    const icon = this.getConsoleIcon(entry.level);
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    
    let consoleMessage = `${icon} ${chalk.gray(timestamp)} ${(chalk as any)[color](entry.level.toUpperCase())} ${entry.message}`;
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      consoleMessage += chalk.gray(` | ${JSON.stringify(entry.context)}`);
    }
    
    if (entry.error) {
      consoleMessage += chalk.red(` | ${entry.error.message}`);
    }
    
    console.log(consoleMessage);
    
    // Show stack trace for errors if enabled
    if (entry.error && this.config.includeStackTrace && entry.error.stack && entry.level === 'error') {
      console.log(chalk.gray(entry.error.stack));
    }
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    if (!this.config.enableFile || !this.isInitialized) {
      // Buffer the log entry if file logging is not ready
      this.logBuffer.push(entry);
      return;
    }
    
    try {
      // Write buffered entries first
      if (this.logBuffer.length > 0) {
        for (const bufferedEntry of this.logBuffer) {
          const logLine = this.formatLogEntry(bufferedEntry) + '\n';
          await fs.appendFile(this.logFilePath, logLine, 'utf-8');
        }
        this.logBuffer = [];
      }
      
      // Write current entry
      const logLine = this.formatLogEntry(entry) + '\n';
      await fs.appendFile(this.logFilePath, logLine, 'utf-8');
      
      // Check if log rotation is needed
      await this.rotateLogsIfNeeded();
    } catch (error) {
      console.error(chalk.red('Failed to write to log file:'), error);
    }
  }

  private async rotateLogsIfNeeded(): Promise<void> {
    try {
      const stats = await fs.stat(this.logFilePath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      
      if (fileSizeInMB >= this.config.maxFileSize) {
        await this.rotateLogs();
      }
    } catch (error) {
      // File doesn't exist yet, no rotation needed
      if ((error as any).code !== 'ENOENT') {
        console.error(chalk.red('Error checking log file size:'), error);
      }
    }
  }

  private async rotateLogs(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFileName = `loantrack-${timestamp}.log`;
      const rotatedFilePath = path.join(this.config.logDirectory, rotatedFileName);
      
      // Move current log file to rotated name
      await fs.rename(this.logFilePath, rotatedFilePath);
      
      // Clean up old log files
      await this.cleanupOldLogs();
      
      this.info('Log file rotated', { 
        oldFile: this.logFilePath, 
        newFile: rotatedFilePath 
      });
    } catch (error) {
      console.error(chalk.red('Failed to rotate logs:'), error);
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.logDirectory);
      const logFiles = files
        .filter(file => file.startsWith('loantrack-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.config.logDirectory, file)
        }));
      
      if (logFiles.length > this.config.maxFiles) {
        // Sort by creation time and remove oldest files
        const filesWithStats = await Promise.all(
          logFiles.map(async file => ({
            ...file,
            stats: await fs.stat(file.path)
          }))
        );
        
        filesWithStats
          .sort((a, b) => a.stats.mtime.getTime() - b.stats.mtime.getTime())
          .slice(0, filesWithStats.length - this.config.maxFiles)
          .forEach(async file => {
            try {
              await fs.unlink(file.path);
              this.debug('Deleted old log file', { file: file.name });
            } catch (error) {
              console.error(chalk.red(`Failed to delete old log file ${file.name}:`), error);
            }
          });
      }
    } catch (error) {
      console.error(chalk.red('Failed to cleanup old logs:'), error);
    }
  }

  private async log(level: LogLevel, message: string, error?: Error, context?: any): Promise<void> {
    if (!this.shouldLog(level)) return;
    
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      message,
      error,
      context,
      sessionId: this.sessionId
    };
    
    // Write to console and file concurrently
    await Promise.all([
      this.writeToConsole(entry),
      this.writeToFile(entry)
    ]);
  }

  // Public logging methods
  async debug(message: string, context?: any): Promise<void> {
    await this.log('debug', message, undefined, context);
  }

  async info(message: string, context?: any): Promise<void> {
    await this.log('info', message, undefined, context);
  }

  async warn(message: string, context?: any): Promise<void> {
    await this.log('warn', message, undefined, context);
  }

  async error(message: string, error?: Error, context?: any): Promise<void> {
    await this.log('error', message, error, context);
  }

  async fatal(message: string, error?: Error, context?: any): Promise<void> {
    await this.log('fatal', message, error, context);
  }

  // Utility methods
  async setLogLevel(level: LogLevel): Promise<void> {
    const oldLevel = this.config.level;
    this.config.level = level;
    await this.info('Log level changed', { 
      from: oldLevel, 
      to: level 
    });
  }

  getLogLevel(): LogLevel {
    return this.config.level;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  async enableConsoleLogging(enable: boolean): Promise<void> {
    this.config.enableConsole = enable;
    await this.info('Console logging toggled', { enabled: enable });
  }

  async enableFileLogging(enable: boolean): Promise<void> {
    this.config.enableFile = enable;
    await this.info('File logging toggled', { enabled: enable });
  }

  async getLogStats(): Promise<{
    currentLogFile: string;
    logFileSize: string;
    totalLogFiles: number;
    sessionId: string;
    logLevel: LogLevel;
    logsToday: number;
  }> {
    try {
      const stats = await fs.stat(this.logFilePath);
      const fileSizeInKB = (stats.size / 1024).toFixed(2);
      
      const files = await fs.readdir(this.config.logDirectory);
      const logFiles = files.filter(file => 
        file.startsWith('loantrack-') && file.endsWith('.log')
      );
      
      // Count logs for today (approximate)
      const today = new Date().toISOString().split('T')[0];
      const todayLogFile = `loantrack-${today}.log`;
      let logsToday = 0;
      
      try {
        const todayLogPath = path.join(this.config.logDirectory, todayLogFile);
        const todayLogContent = await fs.readFile(todayLogPath, 'utf-8');
        logsToday = (todayLogContent.match(/\n/g) || []).length;
      } catch {
        // File doesn't exist or can't be read
      }
      
      return {
        currentLogFile: path.basename(this.logFilePath),
        logFileSize: `${fileSizeInKB} KB`,
        totalLogFiles: logFiles.length,
        sessionId: this.sessionId,
        logLevel: this.config.level,
        logsToday
      };
    } catch (error) {
      throw new Error(`Failed to get log stats: ${error}`);
    }
  }

  async exportLogs(outputPath: string, options?: {
    startDate?: Date;
    endDate?: Date;
    levels?: LogLevel[];
    includeContext?: boolean;
  }): Promise<void> {
    try {
      const files = await fs.readdir(this.config.logDirectory);
      const logFiles = files
        .filter(file => file.startsWith('loantrack-') && file.endsWith('.log'))
        .map(file => path.join(this.config.logDirectory, file));
      
      let allLogs = '';
      
      for (const logFile of logFiles) {
        try {
          const content = await fs.readFile(logFile, 'utf-8');
          allLogs += content;
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Could not read log file ${logFile}`));
        }
      }
      
      // Filter logs based on options
      if (options) {
        const lines = allLogs.split('\n').filter(line => line.trim());
        const filteredLines = lines.filter(line => {
          // Parse log line to check filters
          const timestampMatch = line.match(/\[(.*?)\]/);
          const levelMatch = line.match(/\[(\w+)\]/g);
          
          if (!timestampMatch || !levelMatch || levelMatch.length < 2) return true;
          
          const timestamp = new Date(timestampMatch[1]);
          const level = levelMatch[1].replace(/[\[\]]/g, '').toLowerCase() as LogLevel;
          
          // Date filter
          if (options.startDate && timestamp < options.startDate) return false;
          if (options.endDate && timestamp > options.endDate) return false;
          
          // Level filter
          if (options.levels && !options.levels.includes(level)) return false;
          
          // Context filter
          if (options.includeContext === false && line.includes('Context:')) {
            return line.replace(/\| Context:.*?(?=\||\s*$)/, '');
          }
          
          return true;
        });
        
        allLogs = filteredLines.join('\n');
      }
      
      await fs.writeFile(outputPath, allLogs, 'utf-8');
      await this.info('Logs exported successfully', { 
        outputPath, 
        options 
      });
    } catch (error) {
      await this.error('Failed to export logs', error as Error, { outputPath });
      throw error;
    }
  }

  async clearLogs(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.logDirectory);
      const logFiles = files
        .filter(file => file.startsWith('loantrack-') && file.endsWith('.log'))
        .map(file => path.join(this.config.logDirectory, file));
      
      for (const logFile of logFiles) {
        await fs.unlink(logFile);
      }
      
      await this.info('All log files cleared');
    } catch (error) {
      console.error(chalk.red('Failed to clear logs:'), error);
      throw error;
    }
  }

  async searchLogs(query: string, options?: {
    caseSensitive?: boolean;
    regex?: boolean;
    level?: LogLevel;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Array<{
    file: string;
    line: number;
    content: string;
    timestamp: string;
    level: LogLevel;
  }>> {
    try {
      const files = await fs.readdir(this.config.logDirectory);
      const logFiles = files
        .filter(file => file.startsWith('loantrack-') && file.endsWith('.log'))
        .map(file => path.join(this.config.logDirectory, file));
      
      const results: Array<{
        file: string;
        line: number;
        content: string;
        timestamp: string;
        level: LogLevel;
      }> = [];
      
      for (const logFile of logFiles) {
        try {
          const content = await fs.readFile(logFile, 'utf-8');
          const lines = content.split('\n');
          
          lines.forEach((line, index) => {
            if (!line.trim()) return;
            
            // Parse log line
            const timestampMatch = line.match(/\[(.*?)\]/);
            const levelMatch = line.match(/\[(\w+)\]/g);
            
            if (!timestampMatch || !levelMatch || levelMatch.length < 2) return;
            
            const timestamp = timestampMatch[1];
            const level = levelMatch[1].replace(/[\[\]]/g, '').toLowerCase() as LogLevel;
            const logDate = new Date(timestamp);
            
            // Apply filters
            if (options?.level && level !== options.level) return;
            if (options?.startDate && logDate < options.startDate) return;
            if (options?.endDate && logDate > options.endDate) return;
            
            // Search in content
            let searchText = line;
            let searchQuery = query;
            
            if (!options?.caseSensitive) {
              searchText = searchText.toLowerCase();
              searchQuery = searchQuery.toLowerCase();
            }
            
            let matches = false;
            if (options?.regex) {
              try {
                const regex = new RegExp(searchQuery, options.caseSensitive ? 'g' : 'gi');
                matches = regex.test(searchText);
              } catch {
                // Invalid regex, fall back to string search
                matches = searchText.includes(searchQuery);
              }
            } else {
              matches = searchText.includes(searchQuery);
            }
            
            if (matches) {
              results.push({
                file: path.basename(logFile),
                line: index + 1,
                content: line,
                timestamp,
                level
              });
            }
          });
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Could not search in log file ${logFile}`));
        }
      }
      
      return results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (error) {
      await this.error('Failed to search logs', error as Error, { query, options });
      throw error;
    }
  }

  // Performance monitoring
  async startTimer(label: string): Promise<() => Promise<void>> {
    const startTime = process.hrtime.bigint();
    await this.debug(`Timer started: ${label}`);
    
    return async () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      await this.info(`Timer completed: ${label}`, { 
        duration: `${duration.toFixed(2)}ms` 
      });
    };
  }

  async logPerformance(operation: string, duration: number, context?: any): Promise<void> {
    await this.info(`Performance: ${operation}`, {
      duration: `${duration.toFixed(2)}ms`,
      ...context
    });
  }

  // Memory and system monitoring
  async logSystemInfo(): Promise<void> {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    await this.info('System information', {
      memory: {
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`
      },
      uptime: `${(uptime / 60).toFixed(2)} minutes`,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    });
  }

  // Structured logging for specific events
  async logUserAction(action: string, userId?: string, details?: any): Promise<void> {
    await this.info(`User action: ${action}`, {
      userId: userId || 'anonymous',
      action,
      details,
      timestamp: new Date().toISOString()
    });
  }

  async logDatabaseOperation(operation: string, table: string, duration?: number, error?: Error): Promise<void> {
    const level = error ? 'error' : 'info';
    const message = `Database ${operation}: ${table}`;
    
    const context = {
      operation,
      table,
      duration: duration ? `${duration.toFixed(2)}ms` : undefined,
      success: !error
    };
    
    if (level === 'error') {
      await this.error(message, error, context);
    } else {
      await this.info(message, context);
    }
  }

  async logApiRequest(method: string, endpoint: string, statusCode?: number, duration?: number): Promise<void> {
    await this.info(`API ${method} ${endpoint}`, {
      method,
      endpoint,
      statusCode,
      duration: duration ? `${duration.toFixed(2)}ms` : undefined
    });
  }

  // Cleanup and shutdown
  async flush(): Promise<void> {
    // Write any buffered entries
    if (this.logBuffer.length > 0) {
      for (const entry of this.logBuffer) {
        await this.writeToFile(entry);
      }
      this.logBuffer = [];
    }
  }

  async shutdown(): Promise<void> {
    await this.info('Logger shutting down');
    await this.flush();
  }
}
