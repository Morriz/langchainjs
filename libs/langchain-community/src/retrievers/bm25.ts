import {
  BaseRetriever,
  BaseRetrieverInput,
} from "@instrukt/langchain-core/retrievers";
import { Document } from "@instrukt/langchain-core/documents";

import { BM25 } from "../utils/@furkantoprak/bm25/BM25.js";

export type BM25RetrieverOptions = {
  docs: Document[];
  k: number;
} & BaseRetrieverInput;

/**
 * A retriever that uses the BM25 algorithm to rank documents based on their
 * similarity to a query. It uses the "okapibm25" package for BM25 scoring.
 * The k parameter determines the number of documents to return for each query.
 */
export class BM25Retriever extends BaseRetriever {
  static lc_name() {
    return "BM25Retriever";
  }

  lc_namespace = ["langchain", "retrievers", "bm25_retriever"];

  static fromDocuments(
    documents: Document[],
    options: Omit<BM25RetrieverOptions, "docs">
  ) {
    return new this({ ...options, docs: documents });
  }

  docs: Document[];

  k: number;

  constructor(options: BM25RetrieverOptions) {
    super(options);
    this.docs = options.docs;
    this.k = options.k;
  }

  private preprocessFunc(text: string): string[] {
    return text.toLowerCase().split(/\s+/);
  }

  async _getRelevantDocuments(query: string) {
    const processedQuery = this.preprocessFunc(query);
    const documents = this.docs.map((doc) => doc.pageContent);
    const scores = BM25(documents, processedQuery) as number[];

    const scoredDocs = this.docs.map((doc, index) => ({
      document: doc,
      score: scores[index],
    }));

    scoredDocs.sort((a, b) => b.score - a.score);

    return scoredDocs.slice(0, this.k).map((item) => item.document);
  }
}
