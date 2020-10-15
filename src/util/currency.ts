const CurrencyType: string = "KSh";

export function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} ${CurrencyType}`;
}
