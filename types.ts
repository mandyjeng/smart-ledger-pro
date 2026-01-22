
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  type: TransactionType;
}

export interface Settings {
  googleSheetUrl: string;
  userName: string;
}

export interface AIResponse {
  amount: number;
  category: string;
  description: string;
  type: TransactionType;
  date?: string;
}
