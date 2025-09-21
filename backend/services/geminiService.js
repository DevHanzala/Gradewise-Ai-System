import { GoogleGenerativeAI } from "@google/generative-ai";

const creationKey = process.env.GEMINI_CREATION_API_KEY || process.env.GOOGLE_AI_API_KEY;
const checkingKey = process.env.GEMINI_CHECKING_API_KEY || process.env.GOOGLE_AI_API_KEY;

let creationClient = null;
let checkingClient = null;

export const getCreationModel = (modelName = "gemini-1.5-flash") => {
  if (!creationClient) {
    if (!creationKey) {
      throw new Error("Missing GEMINI_CREATION_API_KEY");
    }
    creationClient = new GoogleGenerativeAI(creationKey);
  }
  return creationClient.getGenerativeModel({ model: modelName });
};

export const getCheckingModel = (modelName = "gemini-1.5-flash") => {
  if (!checkingClient) {
    if (!checkingKey) {
      throw new Error("Missing GEMINI_CHECKING_API_KEY");
    }
    checkingClient = new GoogleGenerativeAI(checkingKey);
  }
  return checkingClient.getGenerativeModel({ model: modelName });
};

// Utility to map UI language codes to Gemini prompt hints
export const mapLanguageCode = (lang) => {
  const map = {
    en: "English",
    ur: "Urdu",
    ar: "Arabic",
    fa: "Persian",
  };
  return map[lang] || "English";
};