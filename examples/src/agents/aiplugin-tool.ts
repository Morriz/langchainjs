import { ChatOpenAI } from "@langchain/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { RequestsGetTool, RequestsPostTool } from "langchain/tools";
import { AIPluginTool } from "@instrukt/langchain-community/tools/aiplugin";

export const run = async () => {
  const tools = [
    new RequestsGetTool(),
    new RequestsPostTool(),
    await AIPluginTool.fromPluginUrl(
      "https://www.klarna.com/.well-known/ai-plugin.json"
    ),
  ];
  const executor = await initializeAgentExecutorWithOptions(
    tools,
    new ChatOpenAI({ temperature: 0 }),
    { agentType: "chat-zero-shot-react-description", verbose: true }
  );

  const result = await executor.invoke({
    input: "what t shirts are available in klarna?",
  });

  console.log({ result });
};
