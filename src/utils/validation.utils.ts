export function isValidPhoneNumber(phone: string): boolean {
  return /^\+?[\d\s-]{10,}$/.test(phone);
}

export function isValidAmount(amount: number): boolean {
  return amount > 0;
}
