import "@tensorflow/tfjs-backend-cpu";
import { TensorFlowEmbeddings } from "@instrukt/langchain-community/embeddings/tensorflow";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@instrukt/langchain-core/documents";

const embeddings = new TensorFlowEmbeddings();
const store = new MemoryVectorStore(embeddings);

const documents = [
  "A document",
  "Some other piece of text",
  "One more",
  "And another",
];

await store.addDocuments(
  documents.map((pageContent) => new Document({ pageContent }))
);
