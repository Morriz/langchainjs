import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@instrukt/langchain-core/output_parsers";
import { RunnableSequence } from "@instrukt/langchain-core/runnables";

const chain = RunnableSequence.from([
  new ChatOpenAI({ temperature: 0 }),
  new StringOutputParser(),
]);

const stream = await chain.stream("Hello there!");

for await (const chunk of stream) {
  console.log(chunk);
}
