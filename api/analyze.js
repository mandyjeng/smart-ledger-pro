import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// 這是純 JavaScript 版本，Node.js 可以直接執行
export default async function handler(req, res) {
  // 1. 設定 CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', 'https://mandyjeng.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 處理預檢請求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. 檢查 API Key (從 Vercel 環境變數讀取)
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: API Key missing' });
  }

  try {
    // 3. 取得前端傳來的資料
    // 注意：req.body 可能需要手動解析 (視 Vercel 版本而定)，但在大多數新版環境可直接使用
    const { text, currentDate } = req.body || {};

    if (!text) {
      return res.status(400).json({ error: 'Input text is required' });
    }

    // 4. 初始化 Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 定義 JSON 結構 (Schema)
    const schema = {
      description: "記帳資料結構",
      type: SchemaType.OBJECT,
      properties: {
        amount: { type: SchemaType.NUMBER, description: "金額" },
        category: { type: SchemaType.STRING, description: "類別" },
        description: { type: SchemaType.STRING, description: "項目描述" },
        type: { type: SchemaType.STRING, enum: ["income", "expense"], description: "type must be either income or expense" },
        date: { type: SchemaType.STRING, description: "YYYY-MM-DD" }
      },
      required: ["amount", "category", "description", "type"]
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
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
    4. 識別類型 (type): 'income' (收入) 或 'expense' (支出)。
    5. 如果沒提到日期，使用當前日期。回傳純 JSON。`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // 5. 回傳結果
    const parsedJSON = JSON.parse(responseText);
    return res.status(200).json({ result: parsedJSON });

  } catch (error) {
    console.error("Backend AI Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}