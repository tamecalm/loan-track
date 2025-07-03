import { isValidPhoneNumber, isValidAmount } from '../validation.utils';

describe('Validation Utils', () => {
  describe('isValidPhoneNumber', () => {
    it('should return true for valid Nigerian phone numbers', () => {
      const validNumbers = [
        '+2348012345678',
        '08012345678',
        '2348012345678',
        '+234 801 234 5678',
        '0801-234-5678',
        '+234-801-234-5678',
      ];

      validNumbers.forEach(number => {
        expect(isValidPhoneNumber(number)).toBe(true);
      });
    });

    it('should return true for valid international phone numbers', () => {
      const validInternationalNumbers = [
        '+1234567890',
        '+44 20 7946 0958',
        '+33 1 42 86 83 26',
        '+49 30 12345678',
        '+86 138 0013 8000',
      ];

      validInternationalNumbers.forEach(number => {
        expect(isValidPhoneNumber(number)).toBe(true);
      });
    });

    it('should return false for invalid phone numbers', () => {
      const invalidNumbers = [
        '123',
        'abc123',
        '080123456',  // Too short
        '',
        '   ',
        '+234abc123',
        'phone-number',
        '080-123-45',  // Too short
      ];

      invalidNumbers.forEach(number => {
        expect(isValidPhoneNumber(number)).toBe(false);
      });
    });

    it('should handle phone numbers with various formatting', () => {
      const formattedNumbers = [
        '(080) 123-4567',
        '080 123 4567',
        '080.123.4567',
        '080-123-4567',
        '+234 (80) 123-4567',
      ];

      formattedNumbers.forEach(number => {
        expect(isValidPhoneNumber(number)).toBe(true);
      });
    });

    it('should return false for numbers that are too short or too long', () => {
      const edgeCaseNumbers = [
        '12345',  // Too short
        '123456789',  // Still too short
        '12345678901234567890',  // Too long
      ];

      edgeCaseNumbers.forEach(number => {
        expect(isValidPhoneNumber(number)).toBe(false);
      });
    });
  });

  describe('isValidAmount', () => {
    it('should return true for valid positive amounts', () => {
      const validAmounts = [
        1,
        100,
        1000,
        50000,
        999999.99,
        0.01,
        1.5,
      ];

      validAmounts.forEach(amount => {
        expect(isValidAmount(amount)).toBe(true);
      });
    });

    it('should return false for invalid amounts', () => {
      const invalidAmounts = [
        0,
        -1,
        -100,
        -0.01,
      ];

      invalidAmounts.forEach(amount => {
        expect(isValidAmount(amount)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(isValidAmount(Number.MIN_VALUE)).toBe(true);
      expect(isValidAmount(Number.MAX_SAFE_INTEGER)).toBe(true);
    });

    it('should return false for NaN and Infinity', () => {
      expect(isValidAmount(NaN)).toBe(false);
      expect(isValidAmount(Infinity)).toBe(false);
      expect(isValidAmount(-Infinity)).toBe(false);
    });

    it('should handle very small positive numbers', () => {
      expect(isValidAmount(0.000001)).toBe(true);
      expect(isValidAmount(0.1)).toBe(true);
    });
  });
});
