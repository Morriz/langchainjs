import { ZepClient } from "@getzep/zep-cloud";
import { ChatPromptTemplate } from "@instrukt/langchain-core/prompts";
import { ConsoleCallbackHandler } from "@instrukt/langchain-core/tracers/console";
import { ChatOpenAI } from "@langchain/openai";
import { Document } from "@instrukt/langchain-core/documents";
import {
  RunnableLambda,
  RunnableMap,
  RunnablePassthrough,
} from "@instrukt/langchain-core/runnables";
import { ZepCloudVectorStore } from "@instrukt/langchain-community/vectorstores/zep_cloud";
import { StringOutputParser } from "@instrukt/langchain-core/output_parsers";

async function combineDocuments(docs: Document[], documentSeparator = "\n\n") {
  const docStrings: string[] = await Promise.all(
    docs.map((doc) => doc.pageContent)
  );
  return docStrings.join(documentSeparator);
}

// Your Zep Collection Name
const collectionName = "<Zep Collection Name>";

const zepClient = new ZepClient({
  // Your Zep Cloud Project API key https://help.getzep.com/projects
  apiKey: "<Zep Api Key>",
});

const vectorStore = await ZepCloudVectorStore.init({
  client: zepClient,
  collectionName,
});

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `Answer the question based only on the following context: {context}`,
  ],
  ["human", "{question}"],
]);

const model = new ChatOpenAI({
  temperature: 0.8,
  modelName: "gpt-3.5-turbo-1106",
});
const retriever = vectorStore.asRetriever();

const setupAndRetrieval = RunnableMap.from({
  context: new RunnableLambda({
    func: (input: string) => retriever.invoke(input).then(combineDocuments),
  }),
  question: new RunnablePassthrough(),
});
const outputParser = new StringOutputParser();

const chain = setupAndRetrieval
  .pipe(prompt)
  .pipe(model)
  .pipe(outputParser)
  .withConfig({
    callbacks: [new ConsoleCallbackHandler()],
  });

const result = await chain.invoke("Project Gutenberg?");

console.log("result", result);
