import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_CREATION_API_KEY }); // Load from .env

async function main() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Use your working model
      contents: [{ role: "user", parts: [{ text: "Explain how AI works in a few words" }] }],
    });
    console.log(response.text);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();