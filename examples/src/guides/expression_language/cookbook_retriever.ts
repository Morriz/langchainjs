import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { HNSWLib } from "@instrukt/langchain-community/vectorstores/hnswlib";
import { formatDocumentsAsString } from "langchain/util/document";
import { PromptTemplate } from "@instrukt/langchain-core/prompts";
import {
  RunnableSequence,
  RunnablePassthrough,
} from "@instrukt/langchain-core/runnables";
import { StringOutputParser } from "@instrukt/langchain-core/output_parsers";

const model = new ChatOpenAI({});

const vectorStore = await HNSWLib.fromTexts(
  ["mitochondria is the powerhouse of the cell"],
  [{ id: 1 }],
  new OpenAIEmbeddings()
);
const retriever = vectorStore.asRetriever();

const prompt =
  PromptTemplate.fromTemplate(`Answer the question based only on the following context:
{context}

Question: {question}`);

const chain = RunnableSequence.from([
  {
    context: retriever.pipe(formatDocumentsAsString),
    question: new RunnablePassthrough(),
  },
  prompt,
  model,
  new StringOutputParser(),
]);

const result = await chain.invoke("What is the powerhouse of the cell?");

console.log(result);

/*
  "The powerhouse of the cell is the mitochondria."
*/
