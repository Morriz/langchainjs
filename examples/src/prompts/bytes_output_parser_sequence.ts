import { ChatOpenAI } from "@langchain/openai";
import { BytesOutputParser } from "@instrukt/langchain-core/output_parsers";
import { RunnableSequence } from "@instrukt/langchain-core/runnables";

const chain = RunnableSequence.from([
  new ChatOpenAI({ temperature: 0 }),
  new BytesOutputParser(),
]);

const stream = await chain.stream("Hello there!");

const decoder = new TextDecoder();

for await (const chunk of stream) {
  if (chunk) {
    console.log(decoder.decode(chunk));
  }
}
