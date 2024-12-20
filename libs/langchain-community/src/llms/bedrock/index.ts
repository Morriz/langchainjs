import { defaultProvider } from "@aws-sdk/credential-provider-node";
import type { BaseLLMParams } from "@instrukt/langchain-core/language_models/llms";
import { BaseBedrockInput } from "../../utils/bedrock/index.js";
import { Bedrock as BaseBedrock } from "./web.js";

export class Bedrock extends BaseBedrock {
  static lc_name() {
    return "Bedrock";
  }

  constructor(fields?: Partial<BaseBedrockInput> & BaseLLMParams) {
    super({
      ...fields,
      credentials: fields?.credentials ?? defaultProvider(),
    });
  }
}
