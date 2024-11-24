import type { BaseRetrieverInterface } from "@instrukt/langchain-core/retrievers";
import { z } from "zod";
import { CallbackManagerForToolRun } from "@instrukt/langchain-core/callbacks/manager";
import {
  DynamicStructuredTool,
  type DynamicStructuredToolInput,
} from "@instrukt/langchain-core/tools";
import { formatDocumentsAsString } from "../util/document.js";

export function createRetrieverTool(
  retriever: BaseRetrieverInterface,
  input: Omit<DynamicStructuredToolInput, "func" | "schema">
) {
  const func = async (
    { query }: { query: string },
    runManager?: CallbackManagerForToolRun
  ) => {
    const docs = await retriever.getRelevantDocuments(
      query,
      runManager?.getChild("retriever")
    );
    return formatDocumentsAsString(docs);
  };
  const schema = z.object({
    query: z.string().describe("query to look up in retriever"),
  });
  return new DynamicStructuredTool({ ...input, func, schema });
}
