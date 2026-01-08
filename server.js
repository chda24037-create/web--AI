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
// 使用モデル
const MODEL_NAME = "gemini-2.5-flash-lite"; // google cloud の2.5-flash-liteが一番ゆるい？

//
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

        //過去の履歴を使ってチャットを開始
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

//リザルト用
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


// --- VOTE SYSTEM ADDITION ---
const fs = require('fs');
const VOTE_FILE = path.join(__dirname, 'votes.json');

// 投票データの初期化・読み込み
function getVotes() {
    try {
        if (!fs.existsSync(VOTE_FILE)) {
            const initialData = { kinoko: 0, takenoko: 0 };
            fs.writeFileSync(VOTE_FILE, JSON.stringify(initialData));
            return initialData;
        }
        return JSON.parse(fs.readFileSync(VOTE_FILE, 'utf8'));
    } catch (e) {
        console.error("Vote read error:", e);
        return { kinoko: 0, takenoko: 0 };
    }
}

// 投票データを保存
function saveVotes(data) {
    try {
        fs.writeFileSync(VOTE_FILE, JSON.stringify(data));
    } catch (e) {
        console.error("Vote save error:", e);
    }
}

// 投票状況の取得API
app.get('/api/votes', (req, res) => {
    const votes = getVotes();
    res.json(votes);
});

// 投票実行API
app.post('/api/votes', (req, res) => {
    const { faction } = req.body;
    if (faction !== 'kinoko' && faction !== 'takenoko') {
        return res.status(400).json({ error: 'Invalid faction' });
    }

    const votes = getVotes();
    votes[faction] = (votes[faction] || 0) + 1;
    saveVotes(votes);

    res.json(votes);
});
// ----------------------------