import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Vercel Serverless Function 定義
export default async function handler(req, res) {
  // 1. 處理 CORS (允許您的前端呼叫)
  // 如果是正式上線，把 '*' 改成您的網址 'https://mandyjeng.github.io'
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', 'https://mandyjeng.github.io'); // 上線後建議改為您的網域
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. 取得環境變數中的 API Key (安全地保存在伺服器端)
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: API Key missing' });
  }

  try {
    const { text, currentDate } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Input text is required' });
    }

    // 3. 初始化 Gemini (邏輯搬移到這裡)
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 使用 JSON Mode 的 Schema 定義
    const schema = {
      description: "記帳資料結構",
      type: SchemaType.OBJECT,
      properties: {
        amount: { type: SchemaType.NUMBER, description: "金額" },
        category: { type: SchemaType.STRING, description: "類別 (餐飲, 交通, 購物等)" },
        description: { type: SchemaType.STRING, description: "項目描述" },
        type: { type: SchemaType.STRING, enum: ["income", "expense"], description: "收入或支出" },
        date: { type: SchemaType.STRING, description: "日期 YYYY-MM-DD" }
      },
      required: ["amount", "category", "description", "type"]
    };

    // 建議使用 1.5-flash 比較穩定且支援 JSON Mode
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const prompt = `分析這段記帳文字: "${text}"。
    當前的日期是: ${currentDate || new Date().toLocaleDateString()}。
    規則:
    1. 識別金額 (amount)。
    2. 識別類別 (category)。
    3. 識別描述 (description)。
    4. 識別類型 (type): 'income' 或 'expense'。
    5. 如果沒提到日期，使用當前日期。回傳純 JSON。`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // 4. 回傳解析後的物件
    const parsedJSON = JSON.parse(responseText);
    
    return res.status(200).json({ result: parsedJSON });

  } catch (error: any) {
    console.error("Backend AI Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}