import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@instrukt/langchain-core/messages";

const chat = new ChatOpenAI({ temperature: 1 });

const response = await chat.invoke(
  [
    new HumanMessage(
      "What is a good name for a company that makes colorful socks?"
    ),
  ],
  { timeout: 1000 } // 1s timeout
);
console.log(response);
// AIMessage { text: '\n\nRainbow Sox Co.' }
