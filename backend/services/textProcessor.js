import pdf from "pdf-parse";
import mammoth from "mammoth";

/**
 * Extract text from file Buffer or path (for backward compatibility)
 * @param {Buffer|string} fileInput - Buffer (in-memory) or file path (legacy)
 * @param {string} mimeType
 * @returns {Promise<string>}
 */
export const extractTextFromFile = async (fileInput, mimeType) => {
  try {
    // Helper: Get buffer from input (path or Buffer)
    const getBuffer = async () => {
      if (Buffer.isBuffer(fileInput)) {
        return fileInput;
      }
      // Legacy fallback: if it's a string (path), read from disk
      const fs = await import("fs/promises");
      return await fs.readFile(fileInput);
    };

    const buffer = await getBuffer();

    if (mimeType === "application/pdf") {
      const data = await pdf(buffer);
      return cleanText(data.text);
    } 
    else if (
      mimeType === "application/msword" ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      // mammoth accepts { buffer }
      const result = await mammoth.extractRawText({ buffer });
      return cleanText(result.value);
    } 
    else if (mimeType === "text/plain") {
      return cleanText(buffer.toString("utf-8"));
    } 
    else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error("Error extracting text from file:", error);
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

  console.log(`Created ${chunks.length} chunks from text`);
  return chunks;
};