import { pipeline } from "@xenova/transformers";

let model = null;

const loadModel = async () => {
  if (!model) {
    model = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("✅ Loaded Xenova sentence-transformers model: all-MiniLM-L6-v2");
  }
  return model;
};

export const generateEmbedding = async (text) => {
  try {
    const model = await loadModel();
    const output = await model(text, { pooling: "mean", normalize: true });
    console.log(`✅ Generated embedding for text chunk (length: ${text.length})`);
    return Array.from(output.data);
  } catch (error) {
    console.error("❌ Error generating embedding:", error);
    throw error;
  }
};