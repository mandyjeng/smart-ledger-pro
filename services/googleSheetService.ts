
/**
 * --- 完整的 Google Apps Script (GAS) 範例 ---
 * 請將以下程式碼貼到您的 GAS 編輯器中：
 * 
 * function doGet(e) {
 *   var action = e.parameter.action;
 *   if (action === "getHistory") {
 *     var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
 *     var data = sheet.getDataRange().getValues();
 *     var results = [];
 *     // 從第 2 列開始 (跳過標題)
 *     for (var i = 1; i < data.length; i++) {
 *       if (!data[i][5]) continue; // 跳過沒有 ID 的空行
 *       results.push({
 *         date: data[i][0],
 *         type: data[i][1] === '收入' ? 'income' : 'expense',
 *         category: data[i][2],
 *         amount: data[i][3],
 *         description: data[i][4],
 *         id: data[i][5]
 *       });
 *     }
 *     return ContentService.createTextOutput(JSON.stringify(results.reverse()))
 *       .setMimeType(ContentService.MimeType.JSON);
 *   }
 * }
 * 
 * function doPost(e) {
 *   try {
 *     var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
 *     var data = JSON.parse(e.postData.contents);
 *     sheet.appendRow([data.date, data.type === 'income' ? '收入' : '支出', data.category, data.amount, data.description, data.id]);
 *     return ContentService.createTextOutput(JSON.stringify({status: 'success'}))
 *       .setMimeType(ContentService.MimeType.JSON);
 *   } catch (error) {
 *     return ContentService.createTextOutput(JSON.stringify({status: 'error', message: error.toString()}))
 *       .setMimeType(ContentService.MimeType.JSON);
 *   }
 * }
 */

import { Transaction } from "../types";

export const syncToGoogleSheet = async (transaction: Transaction, url: string): Promise<boolean> => {
  const cleanUrl = url?.trim();
  if (!cleanUrl || !cleanUrl.startsWith('http')) return false;

  try {
    await fetch(cleanUrl, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: { 'Content-Type': 'text/plain' },
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
  if (!cleanUrl || !cleanUrl.startsWith('http')) {
    throw new Error("請先在設定中輸入正確的 URL");
  }

  try {
    const fetchUrl = new URL(cleanUrl);
    fetchUrl.searchParams.set('action', 'getHistory');
    fetchUrl.searchParams.set('_t', Date.now().toString());

    const response = await fetch(fetchUrl.toString(), {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      redirect: 'follow',
    });
    
    if (!response.ok) {
      throw new Error(`伺服器回應錯誤 (狀態碼: ${response.status})`);
    }
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error("回傳格式非 JSON。這通常是因為 GAS 中缺乏 doGet 函數，或者腳本出錯回傳了 HTML。");
    }
    
    if (!Array.isArray(data)) return [];

    return data.map((item: any, index: number) => ({
      id: item.id || `cloud-${Date.now()}-${index}`,
      date: item.date || new Date().toISOString().split('T')[0],
      amount: Number(item.amount) || 0,
      category: item.category || '未分類',
      description: item.description || '無描述',
      type: (item.type === 'income' || item.type === 'expense') ? item.type : 'expense'
    }));
    
  } catch (error: any) {
    console.error("Fetch History error detail:", error);
    if (error.message === 'Failed to fetch') {
      throw new Error("連線失敗。請確認：\n1. GAS 腳本中是否有 doGet 函數？\n2. 部署權限是否為「任何人 (Anyone)」？");
    }
    throw error;
  }
};
