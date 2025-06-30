export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date > new Date();
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB');
}
