export function formatCurrency(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatCompact(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}

export function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatMonth(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  cash: "Cash",
  bank: "Bank",
  savings: "Savings",
  emergency: "Emergency Fund",
  trading: "Trading Capital",
  investment: "Investment",
  crypto: "Crypto",
};

export const INCOME_CATEGORIES = [
  "Salary", "Trading", "Freelance", "Business", "Bonus", "Gift", "Other",
] as const;

export const EXPENSE_CATEGORIES = [
  "Food", "Transport", "Education", "Entertainment", "Shopping",
  "Bills", "Health", "Travel", "Subscription", "Other",
] as const;