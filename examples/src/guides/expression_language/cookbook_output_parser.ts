import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@instrukt/langchain-core/prompts";
import { RunnableSequence } from "@instrukt/langchain-core/runnables";
import { StringOutputParser } from "@instrukt/langchain-core/output_parsers";

const model = new ChatOpenAI({});
const promptTemplate = PromptTemplate.fromTemplate(
  "Tell me a joke about {topic}"
);
const outputParser = new StringOutputParser();

const chain = RunnableSequence.from([promptTemplate, model, outputParser]);

const result = await chain.invoke({ topic: "bears" });

console.log(result);

/*
  "Why don't bears wear shoes?\n\nBecause they have bear feet!"
*/
