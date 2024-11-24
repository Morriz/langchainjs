/* eslint-disable prefer-template */
import { v4 as uuidv4 } from "uuid";
import type { EmbeddingsInterface } from "@instrukt/langchain-core/embeddings";
import {
  VectorStore,
  MaxMarginalRelevanceSearchOptions,
} from "@instrukt/langchain-core/vectorstores";
import { Document } from "@instrukt/langchain-core/documents";
import { maximalMarginalRelevance } from "@instrukt/langchain-core/utils/math";

import {
  CassandraClientArgs,
  Column,
  Filter,
  Index,
  WhereClause,
  CassandraTableArgs,
  CassandraTable,
} from "../utils/cassandra.js";

/**
 * @deprecated
 * Import from "../utils/cassandra.js" instead.
 */
export { Column, Filter, Index, WhereClause };

export type SupportedVectorTypes = "cosine" | "dot_product" | "euclidean";

export interface CassandraLibArgs
  extends CassandraClientArgs,
    Omit<CassandraTableArgs, "nonKeyColumns" | "keyspace"> {
  // keyspace is optional on CassandraClientArgs, but mandatory on CassandraTableArgs; we make it mandatory here
  keyspace: string;
  vectorType?: SupportedVectorTypes;
  dimensions: number;
  metadataColumns?: Column[];
  nonKeyColumns?: Column | Column[];
}

/**
 * Class for interacting with the Cassandra database. It extends the
 * VectorStore class and provides methods for adding vectors and
 * documents, searching for similar vectors, and creating instances from
 * texts or documents.
 */
export class CassandraStore extends VectorStore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare FilterType: WhereClause;

  private readonly table: CassandraTable;

  private readonly idColumnAutoName = "id";

  private readonly idColumnAutoGenerated: boolean;

  private readonly vectorColumnName = "vector";

  private readonly vectorColumn: Column;

  private readonly textColumnName = "text";

  private readonly textColumn: Column;

  private readonly metadataColumnDefaultName = "metadata";

  private readonly metadataColumns: Column[];

  private readonly similarityColumn: Column;

  private readonly embeddingColumnAlias = "embedding";

  _vectorstoreType(): string {
    return "cassandra";
  }

  private _cleanArgs(
    args: CassandraLibArgs
  ): CassandraLibArgs & { metadataColumns: Column[]; nonKeyColumns: Column[] } {
    const {
      table,
      dimensions,
      primaryKey,
      nonKeyColumns,
      indices,
      metadataColumns,
      vectorType = "cosine",
    } = args;

    if (!table || !dimensions) {
      throw new Error("Missing required arguments");
    }

    // Utility function to ensure the argument is treated as an array
    function _toArray<T>(value: T | T[]): T[] {
      return Array.isArray(value) ? value : [value];
    }

    const indicesArg = indices || [];

    // Use the primary key if provided, else default to a single auto-generated UUID column
    let primaryKeyArg: Column[];
    if (primaryKey) {
      primaryKeyArg = _toArray(primaryKey);
    } else {
      primaryKeyArg = [
        { name: this.idColumnAutoName, type: "uuid", partition: true },
      ];
    }

    // The combined nonKeyColumns and metadataColumns, de-duped by name
    const combinedColumns = [
      ..._toArray(nonKeyColumns || []),
      ..._toArray(metadataColumns || []),
    ];

    const deduplicatedColumns = combinedColumns.filter(
      (col, index, self) => self.findIndex((c) => c.name === col.name) === index
    );

    const nonKeyColumnsArg: Column[] = [...deduplicatedColumns];

    // If no metadata columns are specified, add a default metadata column consistent with Langchain Python
    if (nonKeyColumnsArg.length === 0) {
      nonKeyColumnsArg.push({
        name: this.metadataColumnDefaultName,
        type: "map<text, text>",
      });
      indicesArg.push({
        name: `idx_${this.metadataColumnDefaultName}_${table}_keys`,
        value: `(keys(${this.metadataColumnDefaultName}))`,
      });
      indicesArg.push({
        name: `idx_${this.metadataColumnDefaultName}_${table}_entries`,
        value: `(entries(${this.metadataColumnDefaultName}))`,
      });
    }

    const addDefaultNonKeyColumnIfNeeded = (defaultColumn: Column) => {
      const column = nonKeyColumnsArg.find(
        (col) => col.name === defaultColumn.name
      );
      if (!column) {
        nonKeyColumnsArg.push(defaultColumn);
      }
    };

    addDefaultNonKeyColumnIfNeeded({ name: this.textColumnName, type: "text" });
    addDefaultNonKeyColumnIfNeeded({
      name: this.vectorColumnName,
      type: `VECTOR<FLOAT,${dimensions}>`,
      alias: this.embeddingColumnAlias,
    });

    // If no index is specified for the vector column, add a default index
    if (
      !indicesArg.some((index) =>
        new RegExp(`\\(\\s*${this.vectorColumnName.toLowerCase()}\\s*\\)`).test(
          index.value.toLowerCase()
        )
      )
    ) {
      indicesArg.push({
        name: `idx_${this.vectorColumnName}_${table}`,
        value: `(${this.vectorColumnName})`,
        options: `{'similarity_function': '${vectorType.toLowerCase()}'}`,
      });
    }

    // Metadata the user will see excludes vector column and text column
    const metadataColumnsArg = [...primaryKeyArg, ...nonKeyColumnsArg].filter(
      (column) =>
        column.name !== this.vectorColumnName &&
        column.name !== this.textColumnName
    );

    return {
      ...args,
      vectorType,
      primaryKey: primaryKeyArg,
      nonKeyColumns: nonKeyColumnsArg,
      metadataColumns: metadataColumnsArg,
      indices: indicesArg,
    };
  }

  private _getColumnByName(
    columns: Column | Column[],
    columnName: string
  ): Column {
    const columnsArray = Array.isArray(columns) ? columns : [columns];
    const column = columnsArray.find((col) => col.name === columnName);
    if (!column) {
      throw new Error(`Column ${columnName} not found`);
    }
    return column;
  }

  constructor(embeddings: EmbeddingsInterface, args: CassandraLibArgs) {
    super(embeddings, args);

    const cleanedArgs = this._cleanArgs(args);

    // This check here to help the compiler understand that nonKeyColumns will always
    // have values after the _cleanArgs call. It is the cleanest way to handle the fact
    // that the compiler is not able to make this determination, no matter how hard we try!
    if (!cleanedArgs.nonKeyColumns || cleanedArgs.nonKeyColumns.length === 0) {
      throw new Error("No non-key columns provided");
    }

    this.vectorColumn = this._getColumnByName(
      cleanedArgs.nonKeyColumns,
      this.vectorColumnName
    );
    this.textColumn = this._getColumnByName(
      cleanedArgs.nonKeyColumns,
      this.textColumnName
    );

    this.similarityColumn = {
      name: `similarity_${cleanedArgs.vectorType}(${this.vectorColumnName},?)`,
      alias: "similarity_score",
      type: "",
    };
    this.idColumnAutoGenerated = !args.primaryKey;
    this.metadataColumns = cleanedArgs.metadataColumns;

    this.table = new CassandraTable(cleanedArgs);
  }

  /**
   * Method to save vectors to the Cassandra database.
   * @param vectors Vectors to save.
   * @param documents The documents associated with the vectors.
   * @returns Promise that resolves when the vectors have been added.
   */
  async addVectors(vectors: number[][], documents: Document[]): Promise<void> {
    if (vectors.length === 0) {
      return;
    }
    // Prepare the values for upsert
    const values = vectors.map((vector, index) => {
      const document = documents[index];
      const docMetadata = document.metadata || {};

      // If idColumnAutoGenerated is true and ID is not provided, generate a UUID
      if (
        this.idColumnAutoGenerated &&
        (docMetadata[this.idColumnAutoName] === undefined ||
          docMetadata[this.idColumnAutoName] === "")
      ) {
        docMetadata[this.idColumnAutoName] = uuidv4();
      }

      // Construct the row
      const row = [];

      // Add values for each metadata column
      this.metadataColumns.forEach((col) => {
        row.push(docMetadata[col.name] || null);
      });

      // Add the text content and vector
      row.push(document.pageContent);
      row.push(new Float32Array(vector));

      return row;
    });

    const columns = [
      ...this.metadataColumns,
      { name: this.textColumnName, type: "" },
      { name: this.vectorColumnName, type: "" },
    ];

    return this.table.upsert(values, columns);
  }

  getCassandraTable(): CassandraTable {
    return this.table;
  }

  /**
   * Method to add documents to the Cassandra database.
   * @param documents The documents to add.
   * @returns Promise that resolves when the documents have been added.
   */
  async addDocuments(documents: Document[]): Promise<void> {
    return this.addVectors(
      await this.embeddings.embedDocuments(documents.map((d) => d.pageContent)),
      documents
    );
  }

  /**
   * Helper method to search for vectors that are similar to a given query vector.
   * @param query The query vector.
   * @param k The number of similar Documents to return.
   * @param filter Optional filter to be applied as a WHERE clause.
   * @param includeEmbedding Whether to include the embedding vectors in the results.
   * @returns Promise that resolves with an array of tuples, each containing a Document and a score.
   */
  async search(
    query: number[],
    k: number,
    filter?: WhereClause,
    includeEmbedding?: boolean
  ): Promise<[Document, number][]> {
    const vectorAsFloat32Array = new Float32Array(query);

    const similarityColumnWithBinds = {
      ...this.similarityColumn,
      binds: [vectorAsFloat32Array],
    };

    const queryCols = [
      ...this.metadataColumns,
      this.textColumn,
      similarityColumnWithBinds,
    ];

    if (includeEmbedding) {
      queryCols.push(this.vectorColumn);
    }

    const orderBy: Filter = {
      name: this.vectorColumnName,
      operator: "ANN OF",
      value: [vectorAsFloat32Array],
    };

    const queryResultSet = await this.table.select(
      queryCols,
      filter,
      [orderBy],
      k
    );

    return queryResultSet?.rows.map((row) => {
      const textContent = row[this.textColumnName];
      const sanitizedRow = { ...row };
      delete sanitizedRow[this.textColumnName];
      delete sanitizedRow.similarity_score;

      Object.keys(sanitizedRow).forEach((key) => {
        if (sanitizedRow[key] === null) {
          delete sanitizedRow[key];
        }
      });

      return [
        new Document({ pageContent: textContent, metadata: sanitizedRow }),
        row.similarity_score,
      ];
    });
  }

  /**
   * Method to search for vectors that are similar to a given query vector.
   * @param query The query vector.
   * @param k The number of similar Documents to return.
   * @param filter Optional filter to be applied as a WHERE clause.
   * @returns Promise that resolves with an array of tuples, each containing a Document and a score.
   */
  async similaritySearchVectorWithScore(
    query: number[],
    k: number,
    filter?: WhereClause
  ): Promise<[Document, number][]> {
    return this.search(query, k, filter, false);
  }

  /**
   * Method to search for vectors that are similar to a given query vector, but with
   * the results selected using the maximal marginal relevance.
   * @param query The query string.
   * @param options.k The number of similar Documents to return.
   * @param options.fetchK=4*k The number of records to fetch before passing to the MMR algorithm.
   * @param options.lambda=0.5 The degree of diversity among the results between 0 (maximum diversity) and 1 (minimum diversity).
   * @param options.filter Optional filter to be applied as a WHERE clause.
   * @returns List of documents selected by maximal marginal relevance.
   */
  async maxMarginalRelevanceSearch(
    query: string,
    options: MaxMarginalRelevanceSearchOptions<this["FilterType"]>
  ): Promise<Document[]> {
    const { k, fetchK = 4 * k, lambda = 0.5, filter } = options;

    const queryEmbedding = await this.embeddings.embedQuery(query);

    const queryResults = await this.search(
      queryEmbedding,
      fetchK,
      filter,
      true
    );

    const embeddingList = queryResults.map(
      (doc) => doc[0].metadata[this.embeddingColumnAlias]
    );

    const mmrIndexes = maximalMarginalRelevance(
      queryEmbedding,
      embeddingList,
      lambda,
      k
    );

    return mmrIndexes.map((idx) => {
      const doc = queryResults[idx][0];
      delete doc.metadata[this.embeddingColumnAlias];
      return doc;
    });
  }

  /**
   * Static method to create an instance of CassandraStore from texts.
   * @param texts The texts to use.
   * @param metadatas The metadata associated with the texts.
   * @param embeddings The embeddings to use.
   * @param args The arguments for the CassandraStore.
   * @returns Promise that resolves with a new instance of CassandraStore.
   */
  static async fromTexts(
    texts: string[],
    metadatas: object | object[],
    embeddings: EmbeddingsInterface,
    args: CassandraLibArgs
  ): Promise<CassandraStore> {
    const docs: Document[] = [];

    for (let index = 0; index < texts.length; index += 1) {
      const metadata = Array.isArray(metadatas) ? metadatas[index] : metadatas;
      const doc = new Document({
        pageContent: texts[index],
        metadata,
      });
      docs.push(doc);
    }

    return CassandraStore.fromDocuments(docs, embeddings, args);
  }

  /**
   * Static method to create an instance of CassandraStore from documents.
   * @param docs The documents to use.
   * @param embeddings The embeddings to use.
   * @param args The arguments for the CassandraStore.
   * @returns Promise that resolves with a new instance of CassandraStore.
   */
  static async fromDocuments(
    docs: Document[],
    embeddings: EmbeddingsInterface,
    args: CassandraLibArgs
  ): Promise<CassandraStore> {
    const instance = new this(embeddings, args);
    await instance.addDocuments(docs);
    return instance;
  }

  /**
   * Static method to create an instance of CassandraStore from an existing
   * index.
   * @param embeddings The embeddings to use.
   * @param args The arguments for the CassandraStore.
   * @returns Promise that resolves with a new instance of CassandraStore.
   */
  static async fromExistingIndex(
    embeddings: EmbeddingsInterface,
    args: CassandraLibArgs
  ): Promise<CassandraStore> {
    const instance = new this(embeddings, args);
    return instance;
  }
}
