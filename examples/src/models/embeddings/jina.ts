import { JinaEmbeddings } from "@instrukt/langchain-community/embeddings/jina";

const model = new JinaEmbeddings({
  apiKey: process.env.JINA_API_TOKEN,
  model: "jina-embeddings-v2-base-en", // Default value
});

const embeddings = await model.embedQuery(
  "Tell me a story about a dragon and a princess."
);
console.log(embeddings);
