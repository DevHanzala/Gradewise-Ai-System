import fs from "fs/promises";
import pdf from "pdf-parse";
import mammoth from "mammoth";

export const extractTextFromFile = async (filePath, mimeType) => {
  try {
    if (mimeType === "application/pdf") {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer); // pdf-parse handles parsing
      return cleanText(data.text);
    } else if (
      mimeType === "application/msword" ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ path: filePath });
      return cleanText(result.value);
    } else if (mimeType === "text/plain") {
      const text = await fs.readFile(filePath, "utf-8");
      return cleanText(text);
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error("❌ Error extracting text from file:", error);
    throw error;
  }
};

export const cleanText = (text) => {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[^\x20-\x7E\n]/g, "")
    .trim()
    .toLowerCase();
};

export const chunkText = (text, maxWords = 500) => {
  const words = text.split(/\s+/);
  const chunks = [];
  let currentChunk = [];
  let wordCount = 0;

  for (const word of words) {
    currentChunk.push(word);
    wordCount++;
    if (wordCount >= maxWords) {
      chunks.push(currentChunk.join(" "));
      currentChunk = [];
      wordCount = 0;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  console.log(`✅ Created ${chunks.length} chunks from text`);
  return chunks;
};
