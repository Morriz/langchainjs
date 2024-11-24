import {
  APIConnectionTimeoutError,
  APIUserAbortError,
  OpenAI as OpenAIClient,
} from "openai";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { StructuredToolInterface } from "@instrukt/langchain-core/tools";
import {
  convertToOpenAIFunction,
  convertToOpenAITool,
} from "@instrukt/langchain-core/utils/function_calling";
import { addLangChainErrorFields } from "./errors.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function wrapOpenAIClientError(e: any) {
  let error;
  if (e.constructor.name === APIConnectionTimeoutError.name) {
    error = new Error(e.message);
    error.name = "TimeoutError";
  } else if (e.constructor.name === APIUserAbortError.name) {
    error = new Error(e.message);
    error.name = "AbortError";
  } else if (e.status === 400 && e.message.includes("tool_calls")) {
    error = addLangChainErrorFields(e, "INVALID_TOOL_RESULTS");
  } else if (e.status === 401) {
    error = addLangChainErrorFields(e, "MODEL_AUTHENTICATION");
  } else if (e.status === 429) {
    error = addLangChainErrorFields(e, "MODEL_RATE_LIMIT");
  } else if (e.status === 404) {
    error = addLangChainErrorFields(e, "MODEL_NOT_FOUND");
  } else {
    error = e;
  }
  return error;
}

export {
  convertToOpenAIFunction as formatToOpenAIFunction,
  convertToOpenAITool as formatToOpenAITool,
};

export function formatToOpenAIAssistantTool(tool: StructuredToolInterface) {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: zodToJsonSchema(tool.schema),
    },
  };
}

export type OpenAIToolChoice =
  | OpenAIClient.ChatCompletionToolChoiceOption
  | "any"
  | string;

export function formatToOpenAIToolChoice(
  toolChoice?: OpenAIToolChoice
): OpenAIClient.ChatCompletionToolChoiceOption | undefined {
  if (!toolChoice) {
    return undefined;
  } else if (toolChoice === "any" || toolChoice === "required") {
    return "required";
  } else if (toolChoice === "auto") {
    return "auto";
  } else if (toolChoice === "none") {
    return "none";
  } else if (typeof toolChoice === "string") {
    return {
      type: "function",
      function: {
        name: toolChoice,
      },
    };
  } else {
    return toolChoice;
  }
}
