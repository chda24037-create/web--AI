// test.js
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
console.log("APIキーの最初の7文字:", apiKey?.slice(0, 7));
console.log("APIキーの長さ:", apiKey?.length);

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

async function test() {
  try {
    const result = await model.generateContent("こんにちは");
    console.log("✅ 成功！APIキーは有効です");
    console.log("レスポンス:", result.response.text());
  } catch (error) {
    console.error("❌ エラー:", error.message);
  }
}

test();