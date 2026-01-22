/// <reference types="vite/client" />
import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse } from "../types";

// const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
if (!apiKey) {
  console.error("❌ API Key is missing! Check your .env file or GitHub Secrets.");
}
const ai = new GoogleGenAI({ apiKey: apiKey });

export const parseEntryWithAI = async (input: string): Promise<AIResponse | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `分析這段記帳文字並轉換為結構化 JSON 資料。文字是: "${input}"。
      當前的日期是: ${new Date().toLocaleDateString()}。
      
      規則:
      1. 識別金額 (amount)。
      2. 識別類別 (category)，常見類別如: 餐飲、交通、購物、娛樂、居住、醫療、薪資、投資。
      3. 識別描述 (description)。
      4. 識別類型 (type): 'income' (收入) 或 'expense' (支出)。
      5. 如果文字提到日期，請格式化為 YYYY-MM-DD，否則回傳今日日期。`,
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

    // Access .text as a property, not a method, as per guidelines.
    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text) as AIResponse;
  } catch (error) {
    console.error("AI Parsing error:", error);
    return null;
  }
};