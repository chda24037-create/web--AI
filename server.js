require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// JSONボディをパースする設定
app.use(express.json());
// publicフォルダを静的ファイルとして公開
app.use(express.static(path.join(__dirname, 'public')));

// Gemini APIの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// 使用モデル (index.htmlに合わせて設定)
const MODEL_NAME = "gemini-2.5-flash-lite"; // 最新の軽量モデルに変更、または適宜調整

// --- チャット生成エンドポイント ---
app.post('/api/chat', async (req, res) => {
    try {
        const { history, message, systemInstruction, responseMimeType } = req.body;

        const model = genAI.getGenerativeModel({ 
            model: MODEL_NAME,
            generationConfig: {
                responseMimeType: responseMimeType || "text/plain"
            },
            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
        });

        // 過去の履歴を使ってチャットを開始
        // SDKの仕様上、historyの形式を合わせる必要があるためそのまま渡す
        const chat = model.startChat({
            history: history || []
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        res.json({ text });

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: "Failed to generate content", details: error.message });
    }
});

// --- 単発生成エンドポイント（リザルト用） ---
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, responseMimeType } = req.body;

        const model = genAI.getGenerativeModel({ 
            model: MODEL_NAME,
            generationConfig: {
                responseMimeType: responseMimeType || "text/plain"
            }
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ text });

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: "Failed to generate content", details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});