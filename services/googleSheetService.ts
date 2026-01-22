
import { Transaction } from "../types";

export const syncToGoogleSheet = async (transaction: Transaction, url: string): Promise<boolean> => {
  const cleanUrl = url?.trim();
  if (!cleanUrl || !cleanUrl.startsWith('http')) return false;

  try {
    await fetch(cleanUrl, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(transaction),
    });
    return true;
  } catch (error) {
    console.error("Google Sheet Sync error:", error);
    return false;
  }
};

export const fetchHistoryFromSheet = async (url: string): Promise<Transaction[]> => {
  const cleanUrl = url?.trim();
  if (!cleanUrl || !cleanUrl.startsWith('http')) return [];

  try {
    // 假設 Google Apps Script 的 doGet(e) 會回傳最新資料的 JSON
    const response = await fetch(`${cleanUrl}?action=getHistory`, {
      method: 'GET',
    });
    
    if (response.ok) {
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
    return [];
  } catch (error) {
    console.error("Fetch History error:", error);
    // 即使失敗也回傳空陣列，避免前端崩潰
    return [];
  }
};
