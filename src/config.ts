import * as path from 'path';

// Data directory paths
export const DATA_DIR = path.join(process.cwd(), 'data');
export const LOAN_DATA_PATH = path.join(DATA_DIR, 'loans.json');
export const BACKUP_DIR = path.join(DATA_DIR, 'backups');
export const EXPORT_DIR = path.join(DATA_DIR, 'exports');
export const LOG_DIR = path.join(DATA_DIR, 'logs');

// Application configuration
export const APP_CONFIG = {
  name: 'LoanTrack Pro',
  version: '2.0.0',
  description: 'Professional Loan Management Toolkit',
  author: {
    name: 'John Ilesanmi',
    instagram: '@numcalm',
    github: '@tamecalm'
  },
  startDate: '27th July 2025'
};

// Default settings
export const DEFAULT_SETTINGS = {
  currency: {
    code: 'NGN',
    symbol: '₦',
    decimals: 0
  },
  dateFormat: 'YYYY-MM-DD',
  reminderDays: [7, 3, 1],
  autoBackup: true,
  backupRetentionDays: 30,
  exportRetentionDays: 30
};

// Validation rules
export const VALIDATION_RULES = {
  lenderName: {
    minLength: 2,
    maxLength: 50,
    required: true
  },
  phoneNumber: {
    minLength: 10,
    maxLength: 15,
    required: true
  },
  amount: {
    min: 100,
    max: 10000000,
    required: true
  },
  interestRate: {
    min: 0,
    max: 100,
    required: false
  }
};
