
import { Transaction } from "../types";

export const syncToGoogleSheet = async (transaction: Transaction, url: string): Promise<boolean> => {
  // 自動修剪網址前後的空格，防止無效的 URL 導致 Failed to fetch
  const cleanUrl = url?.trim();
  
  if (!cleanUrl || !cleanUrl.startsWith('http')) {
    console.warn("無效的 Google Sheet URL:", cleanUrl);
    return false;
  }

  try {
    // 使用最簡化的 fetch 方式
    // 必須使用 'no-cors' 模式來繞過 Google Apps Script 不支援 CORS 的限制
    // 必須使用 'text/plain' 確保這是一個「簡單請求」，不會觸發 OPTIONS 預檢
    await fetch(cleanUrl, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(transaction),
    });
    
    // 在 no-cors 模式下，我們無法得知伺服器回傳的結果，但只要沒噴 catch 就代表請求已發出
    return true;
  } catch (error) {
    console.error("Google Sheet Sync error:", error);
    return false;
  }
};

export const fetchHistoryFromSheet = async (url: string): Promise<Transaction[]> => {
  return [];
};
