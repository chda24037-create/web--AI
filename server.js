require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
const personas = require('./personas');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/debate', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const takenokoId = req.query.takenokoId || 'fanatic';
  const kinokoId = req.query.kinokoId || 'lawyer';

  // 人格テキスト取得
  const pA = personas.takenoko.find(p => p.id === takenokoId)?.text || personas.takenoko[0].text;
  const pB = personas.kinoko.find(p => p.id === kinokoId)?.text || personas.kinoko[0].text;

  const topic = "「たけのこの里」と「きのこの山」どっちが偉大か？";
  const limit = 4; // API制限考慮して少なめ

  res.write(`data: ${JSON.stringify({ type: 'start', topic })}\n\n`);

  let conversationHistory = [];
  let currentMessage = `テーマ「${topic}」。相手に強烈な先制パンチを打て。`;
  let currentSpeaker = "A"; 

  // ★軽量モデル用の「ネタ帳」
  const debateKeywords = [
    // 食感・味覚系
    "「クッキーの口溶け」vs「クラッカーのパサパサ感」",
    "「チョコと生地の一体感」vs「チョコと軸の分離した味」",
    "「口の中の水分を全部持っていかれる問題」",
    "「カカオの香りの強さ」vs「砂糖の甘ったるさ」",
    "「サクサク感」vs「カリカリ感」",
    
    // 構造・機能系
    "「指がチョコで汚れる欠陥」vs「持ち手がある機能美」",
    "「夏場に溶けた時の悲惨さ」",
    "「チョコだけ先に食べる『皮むき食べ』の是非」",
    "「箱を開けた時の見た目の華やかさ」",
    "「ボロボロこぼれやすいのはどっちだ」",

    // データ・実績系
    "「国民総選挙での圧倒的票差」",
    "「スーパーでの棚の占有率」",
    "「内容量（g）と値段のコスパ」",
    "「歴史の古さと伝統」",

    // 概念・煽り系
    "「里山の情景を感じる風情」vs「ただの菌類」",
    "「子供だましの味」vs「大人の嗜み」",
    "「お酒（ウイスキー等）に合うのはどっちか」",
    "「パッケージデザインのセンス」",
    "「世間の常識 vs 選ばれし者の孤高」",
    "「形が卑猥かどうか」" // ←AIが上手く濁して面白く返すことが多いネタ
  ];

  for (let i = 0; i < limit; i++) {
    const currentPersonaText = currentSpeaker === "A" ? pA : pB;
    const speakerName = currentSpeaker === "A" ? "🍄 たけのこ派" : "🍫 きのこ派";
    const speakerClass = currentSpeaker === "A" ? "takenoko" : "kinoko";

    // ランダムにネタを1つ選んで、今回の指示に含める（モデルに思考させない）
    const suggestion = debateKeywords[Math.floor(Math.random() * debateKeywords.length)];

    // ★修正版プロンプト：具体性を強制する
    const strictInstruction = `
      あなたは以下の人格になりきってレスバトルをしてください。
      
      【あなたの人格】
      ${currentPersonaText}

      【今回の攻撃命令】
      相手の言葉に対して、以下の要素を使って反論してください：
      ★「${suggestion}」について言及せよ！

      【回答のルール】
      1. 60文字程度で答えること。（短すぎず、長すぎず）
      2. 「は？」「笑わせるな」など、相手を煽る言葉から始めること。
      3. 必ず「具体的な理由」を入れること。（単に「まずい」は禁止。「粉っぽいからまずい」と言え）
      4. 敬語禁止。タメ口で話せ。
      
      【良い例】
      は？ こっちはチョコとクッキーが口の中でとろけるんだよ！ 
      そっちの乾いたクラッカーじゃ口の中パサパサだろ？

      【悪い例】
      たけのこの里はおいしいです。きのこの山はまずいです。（理由がない、丁寧すぎる）
    `;

    const systemInstructionConfig = {
      parts: [
        { text: strictInstruction }
      ]
    };

    const chat = model.startChat({
      history: conversationHistory,
      systemInstruction: systemInstructionConfig
    });

    try {
      // 念押し
      const result = await chat.sendMessage(currentMessage + " (60文字程度で、具体的に煽り返して)");
      const response = result.response.text();

      const data = JSON.stringify({
        type: 'message',
        speaker: speakerName,
        speakerClass: speakerClass,
        text: response
      });
      res.write(`data: ${data}\n\n`);

      conversationHistory.push({ role: "user", parts: [{ text: currentMessage }] });
      conversationHistory.push({ role: "model", parts: [{ text: response }] });
      
      currentMessage = response;
      currentSpeaker = currentSpeaker === "A" ? "B" : "A";

      // ★API制限回避のため10秒待機
      await new Promise(r => setTimeout(r, 10000));

    } catch (error) {
      console.error("エラー発生:", error);
      res.write(`data: ${JSON.stringify({ type: 'error', text: "API制限により中断しました。" })}\n\n`);
      break;
    }
  }

  res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
  res.end();
});

app.get('/api/personas', (req, res) => {
  res.json(personas);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});