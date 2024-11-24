import { Tool, ToolParams } from "@instrukt/langchain-core/tools";
import { search, SearchOptions } from "duck-duck-scrape";

export {
  SafeSearchType,
  SearchOptions,
  SearchTimeType,
} from "duck-duck-scrape";

export interface DuckDuckGoSearchParameters extends ToolParams {
  /**
   * The search options for the search using the SearchOptions interface
   * from the duck-duck-scrape package.
   */
  searchOptions?: SearchOptions;
  /**
   * The maximum number of results to return from the search.
   * Limiting to 10 to avoid context overload.
   * @default 10
   */
  maxResults?: number;
}

const DEFAULT_MAX_RESULTS = 10;

/**
 * DuckDuckGo tool integration.
 *
 * Setup:
 * Install `@instrukt/langchain-community` and `duck-duck-scrape`.
 *
 * ```bash
 * npm install @instrukt/langchain-community duck-duck-scrape
 * ```
 *
 * ## [Constructor args](https://api.js.langchain.com/classes/_langchain_community.tools_duckduckgo_search.DuckDuckGoSearch.html#constructor)
 *
 * <details open>
 * <summary><strong>Instantiate</strong></summary>
 *
 * ```typescript
 * import { DuckDuckGoSearch } from "@instrukt/langchain-community/tools/duckduckgo_search";
 *
 * const tool = new DuckDuckGoSearch({ maxResults: 1 });
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
 *
 * // output: [{"title":"San Francisco, CA Current Weather | AccuWeather","link":"https://www.accuweather.com/en/us/san-francisco/94103/current-weather/347629","snippet":"<b>Current</b> <b>weather</b> <b>in</b> San Francisco, CA. Check <b>current</b> conditions in San Francisco, CA with radar, hourly, and more."}]
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
 *   "content": "[{\"title\":\"San Francisco, CA Weather Conditions | Weather Underground\",\"link\":\"https://www.wunderground.com/weather/us/ca/san-francisco\",\"snippet\":\"San Francisco <b>Weather</b> Forecasts. <b>Weather</b> Underground provides local & long-range <b>weather</b> forecasts, weatherreports, maps & tropical <b>weather</b> conditions for the San Francisco area.\"}]",
 *   "name": "duckduckgo-search",
 *   "additional_kwargs": {},
 *   "response_metadata": {},
 *   "tool_call_id": "tool_call_id"
 * }
 * ```
 * </details>
 */
export class DuckDuckGoSearch extends Tool {
  private searchOptions?: SearchOptions;

  private maxResults = DEFAULT_MAX_RESULTS;

  constructor(params?: DuckDuckGoSearchParameters) {
    super(params ?? {});

    const { searchOptions, maxResults } = params ?? {};
    this.searchOptions = searchOptions;
    this.maxResults = maxResults || this.maxResults;
  }

  static lc_name() {
    return "DuckDuckGoSearch";
  }

  name = "duckduckgo-search";

  description =
    "A search engine. Useful for when you need to answer questions about current events. Input should be a search query.";

  async _call(input: string): Promise<string> {
    const { results } = await search(input, this.searchOptions);

    return JSON.stringify(
      results
        .map((result) => ({
          title: result.title,
          link: result.url,
          snippet: result.description,
        }))
        .slice(0, this.maxResults)
    );
  }
}
