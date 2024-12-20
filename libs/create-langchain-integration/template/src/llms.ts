import { CallbackManagerForLLMRun } from "@instrukt/langchain-core/callbacks/manager";
import {
  LLM,
  type BaseLLMParams,
} from "@instrukt/langchain-core/language_models/llms";
import { type BaseLanguageModelCallOptions } from "@instrukt/langchain-core/language_models/base";

// Uncomment if implementing streaming

// import {
//   GenerationChunk,
// } from "@instrukt/langchain-core/outputs";

/**
 * Input to LLM class.
 */
export interface LLMIntegrationInput extends BaseLLMParams {}

/**
 * Integration with an LLM.
 */
export class LLMIntegration
  extends LLM<BaseLanguageModelCallOptions>
  implements LLMIntegrationInput
{
  // Used for tracing, replace with the same name as your class
  static lc_name() {
    return "LLMIntegration";
  }

  lc_serializable = true;

  constructor(fields: LLMIntegrationInput) {
    super(fields);
  }

  // Replace
  _llmType() {
    return "llm_integration";
  }

  /**
   * Replace with any secrets this class passes to `super`.
   * See {@link ../../langchain-cohere/src/chat_model.ts} for
   * an example.
   */
  get lc_secrets(): { [key: string]: string } | undefined {
    return {
      apiKey: "API_KEY_NAME",
    };
  }

  get lc_aliases(): { [key: string]: string } | undefined {
    return {
      apiKey: "API_KEY_NAME",
    };
  }

  /**
   * For some given input string and options, return a string output.
   */
  async _call(
    _prompt: string,
    _options: this["ParsedCallOptions"],
    _runManager?: CallbackManagerForLLMRun
  ): Promise<string> {
    throw new Error("Not implemented.");
  }

  /**
   * Implement to support streaming.
   * Should yield chunks iteratively.
   */
  // async *_streamResponseChunks(
  //   prompt: string,
  //   options: this["ParsedCallOptions"],
  //   runManager?: CallbackManagerForLLMRun
  // ): AsyncGenerator<GenerationChunk> {
  //   const stream = await this.caller.call(async () =>
  //     createStream()
  //   );
  //   for await (const chunk of stream) {
  //     yield new GenerationChunk({
  //       text: chunk.response,
  //       generationInfo: {
  //         ...chunk,
  //         response: undefined,
  //       },
  //     });
  //     await runManager?.handleLLMNewToken(chunk.response ?? "");
  //   }
  // }
}
