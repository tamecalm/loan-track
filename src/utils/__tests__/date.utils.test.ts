import { isValidDate, formatDate } from '../date.utils';

describe('Date Utils', () => {
  describe('isValidDate', () => {
    it('should return true for valid future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekString = nextWeek.toISOString().split('T')[0];

      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthString = nextMonth.toISOString().split('T')[0];

      expect(isValidDate(tomorrowString)).toBe(true);
      expect(isValidDate(nextWeekString)).toBe(true);
      expect(isValidDate(nextMonthString)).toBe(true);
      expect(isValidDate('2025-12-31')).toBe(true);
      expect(isValidDate('2026-01-01')).toBe(true);
    });

    it('should return false for past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];

      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekString = lastWeek.toISOString().split('T')[0];

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthString = lastMonth.toISOString().split('T')[0];

      expect(isValidDate(yesterdayString)).toBe(false);
      expect(isValidDate(lastWeekString)).toBe(false);
      expect(isValidDate(lastMonthString)).toBe(false);
      expect(isValidDate('2020-01-01')).toBe(false);
      expect(isValidDate('2023-12-31')).toBe(false);
    });

    it('should return false for today\'s date', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(isValidDate(today)).toBe(false);
    });

    it('should return false for invalid date strings', () => {
      const invalidDates = [
        'invalid-date',
        '2025-13-01',  // Invalid month
        '2025-02-30',  // Invalid day for February
        '2025-04-31',  // Invalid day for April
        '',
        '   ',
        'abc',
        '2025/02/15',  // Wrong format
        '15-02-2025',  // Wrong format
        '2025-2-15',   // Missing leading zero
      ];

      invalidDates.forEach(dateString => {
        expect(isValidDate(dateString)).toBe(false);
      });
    });

    it('should handle different valid date formats', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      // ISO format
      const isoString = futureDate.toISOString().split('T')[0];
      expect(isValidDate(isoString)).toBe(true);

      // Full ISO string
      const fullIsoString = futureDate.toISOString();
      expect(isValidDate(fullIsoString)).toBe(true);
    });

    it('should handle edge cases around current time', () => {
      const now = new Date();
      
      // One minute in the future
      const futureMinute = new Date(now.getTime() + 60000);
      expect(isValidDate(futureMinute.toISOString())).toBe(true);

      // One minute in the past
      const pastMinute = new Date(now.getTime() - 60000);
      expect(isValidDate(pastMinute.toISOString())).toBe(false);
    });
  });

  describe('formatDate', () => {
    it('should format dates in British format (DD/MM/YYYY)', () => {
      expect(formatDate('2025-02-15')).toBe('15/02/2025');
      expect(formatDate('2025-12-31')).toBe('31/12/2025');
      expect(formatDate('2025-01-01')).toBe('01/01/2025');
      expect(formatDate('2025-07-04')).toBe('04/07/2025');
    });

    it('should handle different input date formats', () => {
      // ISO format
      expect(formatDate('2025-02-15')).toBe('15/02/2025');
      
      // Full ISO string
      expect(formatDate('2025-02-15T10:30:00.000Z')).toBe('15/02/2025');
      
      // Date with time
      expect(formatDate('2025-02-15T23:59:59')).toBe('15/02/2025');
    });

    it('should handle leap years correctly', () => {
      expect(formatDate('2024-02-29')).toBe('29/02/2024');  // 2024 is a leap year
      expect(formatDate('2028-02-29')).toBe('29/02/2028');  // 2028 is a leap year
    });

    it('should handle different months correctly', () => {
      const testCases = [
        { input: '2025-01-15', expected: '15/01/2025' },
        { input: '2025-02-15', expected: '15/02/2025' },
        { input: '2025-03-15', expected: '15/03/2025' },
        { input: '2025-04-15', expected: '15/04/2025' },
        { input: '2025-05-15', expected: '15/05/2025' },
        { input: '2025-06-15', expected: '15/06/2025' },
        { input: '2025-07-15', expected: '15/07/2025' },
        { input: '2025-08-15', expected: '15/08/2025' },
        { input: '2025-09-15', expected: '15/09/2025' },
        { input: '2025-10-15', expected: '15/10/2025' },
        { input: '2025-11-15', expected: '15/11/2025' },
        { input: '2025-12-15', expected: '15/12/2025' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(formatDate(input)).toBe(expected);
      });
    });

    it('should handle edge dates of months', () => {
      expect(formatDate('2025-01-01')).toBe('01/01/2025');  // First day of year
      expect(formatDate('2025-12-31')).toBe('31/12/2025');  // Last day of year
      expect(formatDate('2025-02-28')).toBe('28/02/2025');  // Last day of February (non-leap year)
      expect(formatDate('2025-04-30')).toBe('30/04/2025');  // Last day of April
    });

    it('should handle different years', () => {
      expect(formatDate('2020-06-15')).toBe('15/06/2020');
      expect(formatDate('2025-06-15')).toBe('15/06/2025');
      expect(formatDate('2030-06-15')).toBe('15/06/2030');
      expect(formatDate('1999-06-15')).toBe('15/06/1999');
    });

    it('should handle invalid dates gracefully', () => {
      // Note: This test depends on how the formatDate function handles invalid dates
      // The current implementation might throw an error or return 'Invalid Date'
      expect(() => formatDate('invalid-date')).not.toThrow();
    });
  });
});
