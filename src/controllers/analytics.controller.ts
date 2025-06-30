import chalk from 'chalk';
import inquirer from 'inquirer';
import boxen from 'boxen';
import Table from 'cli-table3';
import { createSpinner } from 'nanospinner';
import { Logger } from '../core/logger';
import { LoanService } from '../services/loan.service';
import { AnalyticsService } from '../services/analytics.service';
import { formatCurrency } from '../utils/format.utils';
import { LoanModel } from '../models/loan.model';

export class AnalyticsController {
  private logger: Logger;
  private loanService: LoanService;
  private analyticsService: AnalyticsService;

  constructor() {
    this.logger = new Logger();
    this.loanService = new LoanService();
    this.analyticsService = new AnalyticsService();
  }

  async showAnalyticsDashboard(): Promise<void> {
    try {
      console.clear();
      this.displayAnalyticsHeader();

      const loans = await this.loanService.getLoans();
      
      if (loans.length === 0) {
        console.log(boxen(
          chalk.yellow('📊 No loan data available for analytics.\nAdd some loans first to see insights!'),
          {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'yellow',
            textAlignment: 'center'
          }
        ));
        return;
      }

      await this.displayOverviewStats(loans);
      await this.showAnalyticsMenu(loans);

    } catch (error) {
      this.logger.error('Error in analytics dashboard', error as Error);
      console.error(chalk.red('❌ Failed to load analytics dashboard'));
    }
  }

  private displayAnalyticsHeader(): void {
    const header = boxen(
      chalk.blue.bold('📊 ANALYTICS DASHBOARD') + '\n' +
      chalk.gray('Financial Insights & Loan Statistics'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'blue',
        textAlignment: 'center'
      }
    );
    
    console.log(header);
  }

  private async displayOverviewStats(loans: LoanModel[]): Promise<void> {
    const spinner = createSpinner('Calculating analytics...').start();
    
    try {
      const analytics = await this.analyticsService.generateOverviewAnalytics(loans);
      spinner.success({ text: 'Analytics calculated successfully!' });

      // Overview Statistics Table
      const overviewTable = new Table({
        head: [chalk.cyan('Metric'), chalk.cyan('Value'), chalk.cyan('Details')],
        colWidths: [25, 20, 30],
        style: {
          head: ['cyan'],
          border: ['gray']
        }
      });

      overviewTable.push(
        ['Total Loans', analytics.totalLoans.toString(), `${analytics.activeLoans} active, ${analytics.paidLoans} paid`],
        ['Total Debt', formatCurrency(analytics.totalDebt), `Including ${formatCurrency(analytics.totalInterest)} interest`],
        ['Average Loan', formatCurrency(analytics.averageLoanAmount), `Range: ${formatCurrency(analytics.smallestLoan)} - ${formatCurrency(analytics.largestLoan)}`],
        ['Overdue Loans', analytics.overdueLoans.toString(), `${formatCurrency(analytics.overdueAmount)} total`],
        ['Payment Rate', `${analytics.paymentRate.toFixed(1)}%`, `${analytics.paidLoans}/${analytics.totalLoans} loans paid`]
      );

      console.log(overviewTable.toString());

      // Status Distribution
      this.displayStatusDistribution(analytics);

    } catch (error) {
      spinner.error({ text: 'Failed to calculate analytics' });
      throw error;
    }
  }

  private displayStatusDistribution(analytics: any): void {
    const statusTable = new Table({
      head: [chalk.green('Loan Status'), chalk.green('Count'), chalk.green('Amount'), chalk.green('Percentage')],
      style: {
        head: ['green'],
        border: ['gray']
      }
    });

    const total = analytics.totalLoans;
    
    statusTable.push(
      [
        chalk.green('✅ Paid'),
        analytics.paidLoans.toString(),
        formatCurrency(analytics.paidAmount),
        `${((analytics.paidLoans / total) * 100).toFixed(1)}%`
      ],
      [
        chalk.red('⚠️  Overdue'),
        analytics.overdueLoans.toString(),
        formatCurrency(analytics.overdueAmount),
        `${((analytics.overdueLoans / total) * 100).toFixed(1)}%`
      ],
      [
        chalk.yellow('⏳ Pending'),
        analytics.pendingLoans.toString(),
        formatCurrency(analytics.pendingAmount),
        `${((analytics.pendingLoans / total) * 100).toFixed(1)}%`
      ]
    );

    console.log('\n' + chalk.bold('📈 Loan Status Distribution:'));
    console.log(statusTable.toString());
  }

  private async showAnalyticsMenu(loans: LoanModel[]): Promise<void> {
    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: chalk.yellow('📊 Select analytics view:'),
        choices: [
          {
            name: `${chalk.blue('📅')} Monthly Breakdown`,
            value: 'monthly'
          },
          {
            name: `${chalk.green('👥')} Lender Analysis`,
            value: 'lenders'
          },
          {
            name: `${chalk.magenta('💰')} Interest Analysis`,
            value: 'interest'
          },
          {
            name: `${chalk.yellow('📊')} Payment Trends`,
            value: 'trends'
          },
          {
            name: `${chalk.cyan('🎯')} Risk Assessment`,
            value: 'risk'
          },
          new inquirer.Separator(),
          {
            name: `${chalk.gray('🔙')} Back to Main Menu`,
            value: 'back'
          }
        ],
        pageSize: 10
      }
    ]);

    if (choice === 'back') {
      return;
    }

    await this.handleAnalyticsChoice(choice, loans);
  }

  private async handleAnalyticsChoice(choice: string, loans: LoanModel[]): Promise<void> {
    const spinner = createSpinner('Generating report...').start();

    try {
      switch (choice) {
        case 'monthly':
          await this.showMonthlyBreakdown(loans);
          break;
        case 'lenders':
          await this.showLenderAnalysis(loans);
          break;
        case 'interest':
          await this.showInterestAnalysis(loans);
          break;
        case 'trends':
          await this.showPaymentTrends(loans);
          break;
        case 'risk':
          await this.showRiskAssessment(loans);
          break;
      }

      spinner.success({ text: 'Report generated successfully!' });
      
      // Ask if user wants to see another report
      const { viewAnother } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'viewAnother',
          message: 'Would you like to view another analytics report?',
          default: false
        }
      ]);

      if (viewAnother) {
        await this.showAnalyticsMenu(loans);
      }

    } catch (error) {
      spinner.error({ text: 'Failed to generate report' });
      this.logger.error(`Error generating ${choice} analytics`, error as Error);
    }
  }

  private async showMonthlyBreakdown(loans: LoanModel[]): Promise<void> {
    console.log('\n' + chalk.bold('📅 Monthly Loan Breakdown:'));
    
    const monthlyData = await this.analyticsService.generateMonthlyBreakdown(loans);
    
    const monthlyTable = new Table({
      head: [chalk.cyan('Month'), chalk.cyan('New Loans'), chalk.cyan('Amount'), chalk.cyan('Paid'), chalk.cyan('Overdue')],
      style: {
        head: ['cyan'],
        border: ['gray']
      }
    });

    monthlyData.forEach(month => {
      monthlyTable.push([
        month.month,
        month.newLoans.toString(),
        formatCurrency(month.totalAmount),
        month.paidLoans.toString(),
        month.overdueLoans.toString()
      ]);
    });

    console.log(monthlyTable.toString());
  }

  private async showLenderAnalysis(loans: LoanModel[]): Promise<void> {
    console.log('\n' + chalk.bold('👥 Lender Analysis:'));
    
    const lenderData = await this.analyticsService.generateLenderAnalysis(loans);
    
    const lenderTable = new Table({
      head: [chalk.green('Lender'), chalk.green('Total Loans'), chalk.green('Total Amount'), chalk.green('Paid Rate'), chalk.green('Risk Level')],
      style: {
        head: ['green'],
        border: ['gray']
      }
    });

    lenderData.forEach(lender => {
      const riskColor = lender.riskLevel === 'High' ? 'red' : 
                       lender.riskLevel === 'Medium' ? 'yellow' : 'green';
      
      lenderTable.push([
        lender.name,
        lender.totalLoans.toString(),
        formatCurrency(lender.totalAmount),
        `${lender.paymentRate.toFixed(1)}%`,
        chalk[riskColor](lender.riskLevel)
      ]);
    });

    console.log(lenderTable.toString());
  }

  private async showInterestAnalysis(loans: LoanModel[]): Promise<void> {
    console.log('\n' + chalk.bold('💰 Interest Analysis:'));
    
    const interestData = await this.analyticsService.generateInterestAnalysis(loans);
    
    const interestTable = new Table({
      head: [chalk.magenta('Metric'), chalk.magenta('Value'), chalk.magenta('Percentage')],
      style: {
        head: ['magenta'],
        border: ['gray']
      }
    });

    interestTable.push(
      ['Total Interest Earned', formatCurrency(interestData.totalInterest), `${interestData.interestPercentage.toFixed(1)}%`],
      ['Average Interest Rate', `${interestData.averageRate.toFixed(2)}%`, '-'],
      ['Loans with Interest', interestData.loansWithInterest.toString(), `${interestData.interestLoanPercentage.toFixed(1)}%`],
      ['Highest Interest Rate', `${interestData.highestRate.toFixed(2)}%`, '-'],
      ['Interest Revenue Potential', formatCurrency(interestData.potentialRevenue), '100%']
    );

    console.log(interestTable.toString());
  }

  private async showPaymentTrends(loans: LoanModel[]): Promise<void> {
    console.log('\n' + chalk.bold('📊 Payment Trends:'));
    
    const trendData = await this.analyticsService.generatePaymentTrends(loans);
    
    const trendTable = new Table({
      head: [chalk.yellow('Period'), chalk.yellow('Payments'), chalk.yellow('Amount'), chalk.yellow('Trend')],
      style: {
        head: ['yellow'],
        border: ['gray']
      }
    });

    trendData.forEach(trend => {
      const trendIcon = trend.trend === 'up' ? '📈' : trend.trend === 'down' ? '📉' : '➡️';
      
      trendTable.push([
        trend.period,
        trend.payments.toString(),
        formatCurrency(trend.amount),
        `${trendIcon} ${trend.changePercentage.toFixed(1)}%`
      ]);
    });

    console.log(trendTable.toString());
  }

  private async showRiskAssessment(loans: LoanModel[]): Promise<void> {
    console.log('\n' + chalk.bold('🎯 Risk Assessment:'));
    
    const riskData = await this.analyticsService.generateRiskAssessment(loans);
    
    const riskTable = new Table({
      head: [chalk.cyan('Risk Factor'), chalk.cyan('Score'), chalk.cyan('Impact'), chalk.cyan('Recommendation')],
      style: {
        head: ['cyan'],
        border: ['gray']
      }
    });

    riskData.factors.forEach(factor => {
      const scoreColor = factor.score >= 80 ? 'red' : factor.score >= 60 ? 'yellow' : 'green';
      
      riskTable.push([
        factor.name,
        chalk[scoreColor](`${factor.score}/100`),
        factor.impact,
        factor.recommendation
      ]);
    });

    console.log(riskTable.toString());
    
    // Overall Risk Summary
    const overallRiskColor = riskData.overallRisk >= 70 ? 'red' : 
                            riskData.overallRisk >= 40 ? 'yellow' : 'green';
    
    console.log('\n' + boxen(
      chalk.bold('Overall Portfolio Risk: ') + chalk[overallRiskColor](`${riskData.overallRisk}/100`) + '\n' +
      chalk.gray(riskData.summary),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: overallRiskColor,
        textAlignment: 'center'
      }
    ));
  }
}
