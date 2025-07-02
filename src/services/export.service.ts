import * as fs from 'fs/promises';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { createObjectCsvWriter } from 'csv-writer';
import { format } from 'date-fns';
import { Logger } from '../core/logger';
import { StorageService } from './storage.service';
import { LoanModel } from '../models/loan.model';
import { formatCurrency } from '../utils/format.utils';

export interface ExportOptions {
  format: 'txt' | 'csv' | 'json' | 'pdf' | 'html';
  includeMetadata?: boolean;
  filterPaid?: boolean;
  filterOverdue?: boolean;
  sortBy?: 'date' | 'amount' | 'lender' | 'status';
  sortOrder?: 'asc' | 'desc';
  customFields?: string[];
  outputPath?: string;
}

export interface ExportResult {
  success: boolean;
  filePath: string;
  fileSize: number;
  recordCount: number;
  format: string;
  timestamp: string;
  error?: string;
}

export interface ExportMetadata {
  exportedAt: string;
  exportedBy: string;
  version: string;
  totalRecords: number;
  filters: any;
  format: string;
}

export class ExportService {
  private logger: Logger;
  private storageService: StorageService;
  private exportDir: string;

  constructor() {
    this.logger = new Logger();
    this.storageService = new StorageService();
    this.exportDir = path.join(process.cwd(), 'data', 'exports');
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.exportDir, { recursive: true });
      this.logger.info('Export service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize export service', error as Error);
      throw error;
    }
  }

  async exportLoans(options: ExportOptions): Promise<ExportResult> {
    try {
      await this.initialize();

      // Load and filter loans
      const allLoans = await this.storageService.readLoans();
      const loanModels = allLoans.map(loan => new LoanModel(loan));
      const filteredLoans = this.filterLoans(loanModels, options);
      const sortedLoans = this.sortLoans(filteredLoans, options);

      // Generate filename
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const filename = `loans_export_${timestamp}.${options.format}`;
      const filePath =
        options.outputPath || path.join(this.exportDir, filename);

      // Export based on format
      let fileSize = 0;
      switch (options.format) {
        case 'txt':
          fileSize = await this.exportToText(sortedLoans, filePath, options);
          break;
        case 'csv':
          fileSize = await this.exportToCsv(sortedLoans, filePath, options);
          break;
        case 'json':
          fileSize = await this.exportToJson(sortedLoans, filePath, options);
          break;
        case 'pdf':
          fileSize = await this.exportToPdf(sortedLoans, filePath, options);
          break;
        case 'html':
          fileSize = await this.exportToHtml(sortedLoans, filePath, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      const result: ExportResult = {
        success: true,
        filePath,
        fileSize,
        recordCount: sortedLoans.length,
        format: options.format,
        timestamp: new Date().toISOString(),
      };

      this.logger.info(
        `Export completed: ${filename} (${sortedLoans.length} records)`
      );
      return result;
    } catch (error) {
      this.logger.error('Export failed', error as Error);
      return {
        success: false,
        filePath: '',
        fileSize: 0,
        recordCount: 0,
        format: options.format,
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
      };
    }
  }

  async exportToText(
    loans: LoanModel[],
    filePath: string,
    options: ExportOptions
  ): Promise<number> {
    let content = '';

    // Add metadata if requested
    if (options.includeMetadata) {
      content += this.generateTextMetadata(loans, options);
      content += '\n' + '='.repeat(80) + '\n\n';
    }

    // Add summary
    content += 'LOAN SUMMARY\n';
    content += '-'.repeat(40) + '\n';
    content += `Total Loans: ${loans.length}\n`;
    content += `Total Amount: ${formatCurrency(this.calculateTotalAmount(loans))}\n`;
    content += `Paid Loans: ${loans.filter(l => l.isPaid).length}\n`;
    content += `Overdue Loans: ${loans.filter(l => l.isOverdue()).length}\n`;
    content += `Pending Loans: ${loans.filter(l => !l.isPaid && !l.isOverdue()).length}\n\n`;

    // Add detailed loan list
    content += 'DETAILED LOAN LIST\n';
    content += '='.repeat(80) + '\n\n';

    loans.forEach((loan, index) => {
      content += `${index + 1}. ${loan.lenderName}\n`;
      content += `   Phone: ${loan.phoneNumber}\n`;
      content += `   Amount: ${formatCurrency(loan.amount)}\n`;
      if (loan.interestRate) {
        content += `   Interest: ${loan.interestRate}%\n`;
        content += `   Total with Interest: ${formatCurrency(loan.calculateTotalWithInterest())}\n`;
      }
      content += `   Due Date: ${format(new Date(loan.repaymentDate), 'PPP')}\n`;
      content += `   Status: ${loan.isPaid ? 'PAID' : loan.isOverdue() ? 'OVERDUE' : 'PENDING'}\n`;
      content += `   ID: ${loan.id}\n`;
      content += '\n' + '-'.repeat(60) + '\n\n';
    });

    await fs.writeFile(filePath, content, 'utf-8');
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  async exportToCsv(
    loans: LoanModel[],
    filePath: string,
    options: ExportOptions
  ): Promise<number> {
    const records = loans.map(loan => ({
      id: loan.id,
      lender_name: loan.lenderName,
      phone_number: loan.phoneNumber,
      amount: loan.amount,
      interest_rate: loan.interestRate || 0,
      total_with_interest: loan.calculateTotalWithInterest(),
      repayment_date: loan.repaymentDate,
      is_paid: loan.isPaid,
      is_overdue: loan.isOverdue(),
      status: loan.isPaid ? 'PAID' : loan.isOverdue() ? 'OVERDUE' : 'PENDING',
      created_at: new Date().toISOString(),
    }));

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'lender_name', title: 'Lender Name' },
        { id: 'phone_number', title: 'Phone Number' },
        { id: 'amount', title: 'Amount' },
        { id: 'interest_rate', title: 'Interest Rate (%)' },
        { id: 'total_with_interest', title: 'Total with Interest' },
        { id: 'repayment_date', title: 'Repayment Date' },
        { id: 'is_paid', title: 'Is Paid' },
        { id: 'is_overdue', title: 'Is Overdue' },
        { id: 'status', title: 'Status' },
        { id: 'created_at', title: 'Export Date' },
      ],
    });

    await csvWriter.writeRecords(records);
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  async exportToJson(
    loans: LoanModel[],
    filePath: string,
    options: ExportOptions
  ): Promise<number> {
    const exportData = {
      metadata: options.includeMetadata
        ? this.generateMetadata(loans, options)
        : undefined,
      summary: {
        totalLoans: loans.length,
        totalAmount: this.calculateTotalAmount(loans),
        paidLoans: loans.filter(l => l.isPaid).length,
        overdueLoans: loans.filter(l => l.isOverdue()).length,
        pendingLoans: loans.filter(l => !l.isPaid && !l.isOverdue()).length,
      },
      loans: loans.map(loan => ({
        id: loan.id,
        lenderName: loan.lenderName,
        phoneNumber: loan.phoneNumber,
        amount: loan.amount,
        interestRate: loan.interestRate,
        totalWithInterest: loan.calculateTotalWithInterest(),
        repaymentDate: loan.repaymentDate,
        isPaid: loan.isPaid,
        isOverdue: loan.isOverdue(),
        status: loan.isPaid ? 'PAID' : loan.isOverdue() ? 'OVERDUE' : 'PENDING',
      })),
    };

    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  async exportToPdf(
    loans: LoanModel[],
    filePath: string,
    options: ExportOptions
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = require('fs').createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        doc
          .fontSize(20)
          .text('LoanTrack Pro - Loan Export Report', { align: 'center' });
        doc
          .fontSize(12)
          .text(`Generated on: ${format(new Date(), 'PPP')}`, {
            align: 'center',
          });
        doc.moveDown(2);

        // Summary
        doc.fontSize(16).text('Summary', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12);
        doc.text(`Total Loans: ${loans.length}`);
        doc.text(
          `Total Amount: ${formatCurrency(this.calculateTotalAmount(loans))}`
        );
        doc.text(`Paid Loans: ${loans.filter(l => l.isPaid).length}`);
        doc.text(`Overdue Loans: ${loans.filter(l => l.isOverdue()).length}`);
        doc.text(
          `Pending Loans: ${loans.filter(l => !l.isPaid && !l.isOverdue()).length}`
        );
        doc.moveDown(2);

        // Loan Details
        doc.fontSize(16).text('Loan Details', { underline: true });
        doc.moveDown(0.5);

        loans.forEach((loan, index) => {
          if (doc.y > 700) {
            doc.addPage();
          }

          doc
            .fontSize(14)
            .text(`${index + 1}. ${loan.lenderName}`, { underline: true });
          doc.fontSize(10);
          doc.text(`Phone: ${loan.phoneNumber}`);
          doc.text(`Amount: ${formatCurrency(loan.amount)}`);
          if (loan.interestRate) {
            doc.text(`Interest: ${loan.interestRate}%`);
            doc.text(
              `Total with Interest: ${formatCurrency(loan.calculateTotalWithInterest())}`
            );
          }
          doc.text(`Due Date: ${format(new Date(loan.repaymentDate), 'PPP')}`);
          doc.text(
            `Status: ${loan.isPaid ? 'PAID' : loan.isOverdue() ? 'OVERDUE' : 'PENDING'}`
          );
          doc.text(`ID: ${loan.id}`);
          doc.moveDown(1);
        });

        doc.end();

        stream.on('finish', async () => {
          const stats = await fs.stat(filePath);
          resolve(stats.size);
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  async exportToHtml(
    loans: LoanModel[],
    filePath: string,
    options: ExportOptions
  ): Promise<number> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LoanTrack Pro - Export Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 30px; }
        .loan-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .loan-table th, .loan-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .loan-table th { background-color: #4CAF50; color: white; }
        .loan-table tr:nth-child(even) { background-color: #f2f2f2; }
        .status-paid { color: green; font-weight: bold; }
        .status-overdue { color: red; font-weight: bold; }
        .status-pending { color: orange; font-weight: bold; }
        .footer { margin-top: 30px; text-align: center; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>LoanTrack Pro - Loan Export Report</h1>
        <p>Generated on: ${format(new Date(), 'PPP')}</p>
    </div>

    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Loans:</strong> ${loans.length}</p>
        <p><strong>Total Amount:</strong> ${formatCurrency(this.calculateTotalAmount(loans))}</p>
        <p><strong>Paid Loans:</strong> ${loans.filter(l => l.isPaid).length}</p>
        <p><strong>Overdue Loans:</strong> ${loans.filter(l => l.isOverdue()).length}</p>
        <p><strong>Pending Loans:</strong> ${loans.filter(l => !l.isPaid && !l.isOverdue()).length}</p>
    </div>

    <h2>Loan Details</h2>
    <table class="loan-table">
        <thead>
            <tr>
                <th>Lender</th>
                <th>Phone</th>
                <th>Amount</th>
                <th>Interest</th>
                <th>Total</th>
                <th>Due Date</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${loans
              .map(
                loan => `
                <tr>
                    <td>${loan.lenderName}</td>
                    <td>${loan.phoneNumber}</td>
                    <td>${formatCurrency(loan.amount)}</td>
                    <td>${loan.interestRate ? `${loan.interestRate}%` : 'None'}</td>
                    <td>${formatCurrency(loan.calculateTotalWithInterest())}</td>
                    <td>${format(new Date(loan.repaymentDate), 'PPP')}</td>
                    <td class="status-${loan.isPaid ? 'paid' : loan.isOverdue() ? 'overdue' : 'pending'}">
                        ${loan.isPaid ? 'PAID' : loan.isOverdue() ? 'OVERDUE' : 'PENDING'}
                    </td>
                </tr>
            `
              )
              .join('')}
        </tbody>
    </table>

    <div class="footer">
        <p>Generated by LoanTrack Pro v2.0.0</p>
        <p>Created by John Ilesanmi (@numcalm)</p>
    </div>
</body>
</html>
    `;

    await fs.writeFile(filePath, html, 'utf-8');
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  async getExportHistory(): Promise<ExportResult[]> {
    try {
      const files = await fs.readdir(this.exportDir);
      const exportFiles = files.filter(
        file =>
          file.startsWith('loans_export_') &&
          (file.endsWith('.txt') ||
            file.endsWith('.csv') ||
            file.endsWith('.json') ||
            file.endsWith('.pdf') ||
            file.endsWith('.html'))
      );

      const history: ExportResult[] = [];

      for (const file of exportFiles) {
        try {
          const filePath = path.join(this.exportDir, file);
          const stats = await fs.stat(filePath);
          const format = path.extname(file).substring(1);

          history.push({
            success: true,
            filePath,
            fileSize: stats.size,
            recordCount: 0, // Would need to parse file to get this
            format,
            timestamp: stats.mtime.toISOString(),
          });
        } catch (error) {
          this.logger.warn(
            `Failed to read export file stats: ${file}`,
            error as Error
          );
        }
      }

      return history.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      this.logger.error('Failed to get export history', error as Error);
      return [];
    }
  }

  async deleteExport(filePath: string): Promise<boolean> {
    try {
      await fs.unlink(filePath);
      this.logger.info(`Export file deleted: ${filePath}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to delete export file: ${filePath}`,
        error as Error
      );
      return false;
    }
  }

  async cleanupOldExports(retentionDays: number = 30): Promise<number> {
    try {
      const history = await this.getExportHistory();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      let deletedCount = 0;

      for (const exportRecord of history) {
        const exportDate = new Date(exportRecord.timestamp);
        if (exportDate < cutoffDate) {
          const deleted = await this.deleteExport(exportRecord.filePath);
          if (deleted) {
            deletedCount++;
          }
        }
      }

      this.logger.info(`Cleaned up ${deletedCount} old export files`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup old exports', error as Error);
      return 0;
    }
  }

  private filterLoans(loans: LoanModel[], options: ExportOptions): LoanModel[] {
    let filtered = [...loans];

    if (options.filterPaid !== undefined) {
      filtered = filtered.filter(loan => loan.isPaid === options.filterPaid);
    }

    if (options.filterOverdue !== undefined) {
      filtered = filtered.filter(
        loan => loan.isOverdue() === options.filterOverdue
      );
    }

    return filtered;
  }

  private sortLoans(loans: LoanModel[], options: ExportOptions): LoanModel[] {
    if (!options.sortBy) return loans;

    const sorted = [...loans].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (options.sortBy) {
        case 'date':
          aValue = new Date(a.repaymentDate);
          bValue = new Date(b.repaymentDate);
          break;
        case 'amount':
          aValue = a.calculateTotalWithInterest();
          bValue = b.calculateTotalWithInterest();
          break;
        case 'lender':
          aValue = a.lenderName.toLowerCase();
          bValue = b.lenderName.toLowerCase();
          break;
        case 'status':
          aValue = a.isPaid ? 0 : a.isOverdue() ? 2 : 1;
          bValue = b.isPaid ? 0 : b.isOverdue() ? 2 : 1;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return options.sortOrder === 'desc' ? 1 : -1;
      if (aValue > bValue) return options.sortOrder === 'desc' ? -1 : 1;
      return 0;
    });

    return sorted;
  }

  private calculateTotalAmount(loans: LoanModel[]): number {
    return loans.reduce(
      (total, loan) => total + loan.calculateTotalWithInterest(),
      0
    );
  }

  private generateMetadata(
    loans: LoanModel[],
    options: ExportOptions
  ): ExportMetadata {
    return {
      exportedAt: new Date().toISOString(),
      exportedBy: 'LoanTrack Pro v2.0.0',
      version: '2.0.0',
      totalRecords: loans.length,
      filters: {
        filterPaid: options.filterPaid,
        filterOverdue: options.filterOverdue,
        sortBy: options.sortBy,
        sortOrder: options.sortOrder,
      },
      format: options.format,
    };
  }

  private generateTextMetadata(
    loans: LoanModel[],
    options: ExportOptions
  ): string {
    const metadata = this.generateMetadata(loans, options);

    return `
EXPORT METADATA
===============
Exported At: ${format(new Date(metadata.exportedAt), 'PPP')}
Exported By: ${metadata.exportedBy}
Version: ${metadata.version}
Total Records: ${metadata.totalRecords}
Format: ${metadata.format.toUpperCase()}

FILTERS APPLIED:
${metadata.filters.filterPaid !== undefined ? `- Filter Paid: ${metadata.filters.filterPaid}` : ''}
${metadata.filters.filterOverdue !== undefined ? `- Filter Overdue: ${metadata.filters.filterOverdue}` : ''}
${metadata.filters.sortBy ? `- Sort By: ${metadata.filters.sortBy}` : ''}
${metadata.filters.sortOrder ? `- Sort Order: ${metadata.filters.sortOrder}` : ''}
    `.trim();
  }
}
