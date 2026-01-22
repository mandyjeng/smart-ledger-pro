
import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse } from "../types";

// 初始化 GoogleGenAI 客戶端。
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
if (!apiKey) {
  console.error("❌ API Key is missing! Check your .env file or GitHub Secrets.");
}
const ai = new GoogleGenAI({ apiKey: apiKey });

export const parseEntryWithAI = async (input: string): Promise<AIResponse | null> => {
  // 診斷日誌：確認 API Key 是否存在 (僅顯示前幾碼以保安全)
  
  if (!ai.apiKey) {
    console.error("❌ API_KEY 未定義！請檢查 GitHub Secrets 或部署環境變數。");
    return null;
  } else {
    console.log(`✅ API_KEY 已偵測，開頭為: ${ai.apiKey.substring(0, 4)}...`);
  }

  try {
    // 使用 gemini-flash-latest，這是目前相容性最強且支援免費額度的模型
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `分析這段記帳文字並轉換為結構化 JSON 資料。文字是: "${input}"。
      當前的日期是: ${new Date().toLocaleDateString()}。
      
      規則:
      1. 識別金額 (amount)。
      2. 識別類別 (category)，如: 餐飲、交通、購物、娛樂、居住、醫療、薪資、投資。
      3. 識別描述 (description)。
      4. 識別類型 (type): 'income' (收入) 或 'expense' (支出)。
      5. 日期格式化為 YYYY-MM-DD。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['income', 'expense'] },
            date: { type: Type.STRING }
          },
          required: ["amount", "category", "description", "type"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      console.warn("⚠️ 模型回傳內容為空");
      return null;
    }
    
    return JSON.parse(text) as AIResponse;
  } catch (error: any) {
    console.error("❌ Gemini API 發生錯誤:", error);
    
    // 針對 403 錯誤提供具體建議
    if (error.message?.includes("403")) {
      console.error("錯誤 403: 存取遭拒。請確認：\n1. Google Cloud Project 是否已啟用 Generative Language API？\n2. 您的 API Key 是否有設定「網頁引薦來源 (Referrer)」限制？如果有，請將 GitHub Pages 的網址加入白名單。");
    }
    return null;
  }
};
