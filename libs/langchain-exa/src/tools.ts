import { CallbackManagerForToolRun } from "@instrukt/langchain-core/callbacks/manager";
import { Tool, type ToolParams } from "@instrukt/langchain-core/tools";
import Exa, { ContentsOptions, RegularSearchOptions } from "exa-js";

/**
 * Options for the ExaSearchResults tool.
 */
export type ExaSearchRetrieverFields<
  T extends ContentsOptions = { text: true }
> = ToolParams & {
  client: Exa.default;
  searchArgs?: RegularSearchOptions & T;
};

/**
 * Exa search tool integration.
 *
 * Setup:
 * Install `@langchain/exa` and `exa-js`. You'll also need an API key.
 *
 * ```bash
 * npm install @langchain/exa exa-js
 * ```
 *
 * ## [Constructor args](https://api.js.langchain.com/classes/_langchain_exa.ExaSearchResults.html#constructor)
 *
 * <details open>
 * <summary><strong>Instantiate</strong></summary>
 *
 * ```typescript
 * import { ExaSearchResults } from "@langchain/exa";
 * import Exa from "exa-js";
 *
 * const client = new Exa(process.env.EXASEARCH_API_KEY);
 *
 * const tool = new ExaSearchResults({
 *   client,
 *   searchArgs: {
 *     numResults: 2,
 *   },
 * });
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 *
 * <summary><strong>Invocation</strong></summary>
 *
 * ```typescript
 * await tool.invoke("what is the current weather in sf?");
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 *
 * <summary><strong>Invocation with tool call</strong></summary>
 *
 * ```typescript
 * // This is usually generated by a model, but we'll create a tool call directly for demo purposes.
 * const modelGeneratedToolCall = {
 *   args: {
 *     input: "what is the current weather in sf?",
 *   },
 *   id: "tool_call_id",
 *   name: tool.name,
 *   type: "tool_call",
 * };
 * await tool.invoke(modelGeneratedToolCall);
 * ```
 *
 * ```text
 * ToolMessage {
 *   "content": "...",
 *   "name": "exa_search_results_json",
 *   "additional_kwargs": {},
 *   "response_metadata": {},
 *   "tool_call_id": "tool_call_id"
 * }
 * ```
 * </details>
 */
export class ExaSearchResults<
  T extends ContentsOptions = { text: true }
> extends Tool {
  static lc_name(): string {
    return "ExaSearchResults";
  }

  description =
    "A wrapper around Exa Search. Input should be an Exa-optimized query. Output is a JSON array of the query results";

  name = "exa_search_results_json";

  private client: Exa.default;

  searchArgs?: RegularSearchOptions & T;

  constructor(fields: ExaSearchRetrieverFields<T>) {
    super(fields);
    this.client = fields.client;
    this.searchArgs = fields.searchArgs;
  }

  protected async _call(
    input: string,
    _runManager?: CallbackManagerForToolRun
  ): Promise<string> {
    return JSON.stringify(
      await this.client.searchAndContents<T>(input, this.searchArgs)
    );
  }
}

export class ExaFindSimilarResults<
  T extends ContentsOptions = { text: true }
> extends Tool {
  static lc_name(): string {
    return "ExaFindSimilarResults";
  }

  description =
    "A wrapper around Exa Find Similar. Input should be an Exa-optimized query. Output is a JSON array of the query results";

  name = "exa_find_similar_results_json";

  private client: Exa.default;

  searchArgs?: RegularSearchOptions & T;

  constructor(fields: ExaSearchRetrieverFields<T>) {
    super(fields);
    this.client = fields.client;
    this.searchArgs = fields.searchArgs;
  }

  protected async _call(
    url: string,
    _runManager?: CallbackManagerForToolRun
  ): Promise<string> {
    return JSON.stringify(
      await this.client.findSimilarAndContents<T>(url, this.searchArgs)
    );
  }
}
