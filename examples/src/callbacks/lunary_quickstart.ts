import { LunaryHandler } from "@instrukt/langchain-community/callbacks/handlers/lunary";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  callbacks: [new LunaryHandler()],
});
