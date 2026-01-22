import { AIResponse } from "../types";

/**
 * 前端只負責發送文字給後端 API，並接收處理好的 JSON
 */
export const analyzeLedger = async (input: string): Promise<AIResponse | null> => {
  try {
    // 呼叫您在 Vercel 建立的後端 API 路徑
    // 注意：在本地開發時 (localhost)，Vercel 也能正常處理這個路徑
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        text: input,
        // 我們把「當前日期」從前端傳過去比較準確 (因為伺服器時區可能不同)
        currentDate: new Date().toLocaleDateString() 
      }),
    });

    // 處理 HTTP 錯誤狀態
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // 針對特定錯誤碼做處理，保留您原本的錯誤邏輯
      if (response.status === 403) {
        throw new Error("API 權限錯誤 (403)：後端 Key 可能有問題。");
      }
      if (response.status === 429) {
        throw new Error("請求過於頻繁 (429)：請稍後再試。");
      }
      
      throw new Error(errorData.error || `伺服器錯誤: ${response.status}`);
    }

    // 解析後端回傳的 JSON
    const data = await response.json();
    
    // 假設後端回傳格式為 { result: AIResponse }
    return data.result as AIResponse;

  } catch (error: any) {
    console.error("Analyze Ledger Error:", error);
    // 直接拋出錯誤，讓 UI 層去顯示 Toast 或 Alert
    throw error;
  }
};

// 為了相容您原本的命名，可以加這一行，或者直接把上面函式改名
export const parseEntryWithAI = analyzeLedger;