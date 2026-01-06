// index.js
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

const topic = "「たけのこの里」と「きのこの山」どっちが偉大か？";
const limit = 6; 

const personaA = "あなたは熱狂的な『たけのこの里』信者です。きのこの山を激しく見下しています。短文で煽るように話してください。";
const personaB = "あなたは冷静沈着な『きのこの山』の弁護士です。たけのこの里の論理的欠陥を指摘してください。慇懃無礼な口調です。";

async function runDebate() {
  let conversationHistory = [];
  
  let currentMessage = `議論のテーマは「${topic}」です。先に仕掛けてください。`;
  let currentSpeaker = "A"; 

  console.log(`=== 🔥 論争開始：${topic} ===\n`);

  for (let i = 0; i < limit; i++) {
    const currentPersonaText = currentSpeaker === "A" ? personaA : personaB;

    // 【修正箇所】systemInstruction をオブジェクト形式にする
    const systemInstructionConfig = {
      parts: [
        { text: currentPersonaText }
      ]
    };
    
    // startChatに渡す
    const chat = model.startChat({
      history: conversationHistory,
      systemInstruction: systemInstructionConfig 
    });

    try {
      const result = await chat.sendMessage(currentMessage);
      const response = result.response.text();

      console.log(`【${currentSpeaker === "A" ? "🍄 たけのこ派" : "🍫 きのこ派"}】: ${response}\n`);

      // 会話履歴を保存（次回のために）
      conversationHistory.push({ role: "user", parts: [{ text: currentMessage }] }); 
      conversationHistory.push({ role: "model", parts: [{ text: response }] });     
      
      currentMessage = response; 
      currentSpeaker = currentSpeaker === "A" ? "B" : "A"; 

      // 4秒待機（エラー防止）
      await new Promise(r => setTimeout(r, 4000)); 

    } catch (error) {
      console.error("エラー発生:", error);
      break;
    }
  }
  console.log("=== 💀 議論終了 ===");
}

runDebate();