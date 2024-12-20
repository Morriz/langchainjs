/* eslint-disable no-process-env */
import { test } from "@jest/globals";
import weaviate from "weaviate-ts-client";
import { Document } from "@instrukt/langchain-core/documents";
import { OpenAIEmbeddings, OpenAI } from "@langchain/openai";
import { AttributeInfo } from "langchain/chains/query_constructor";
import { SelfQueryRetriever } from "langchain/retrievers/self_query";
import { WeaviateStore } from "../vectorstores.js";
import { WeaviateTranslator } from "../translator.js";

test.skip("Weaviate Self Query Retriever Test", async () => {
  const docs = [
    new Document({
      pageContent:
        "A bunch of scientists bring back dinosaurs and mayhem breaks loose",
      metadata: { year: 1993, rating: 7.7, genre: "science fiction" },
    }),
    new Document({
      pageContent:
        "Leo DiCaprio gets lost in a dream within a dream within a dream within a ...",
      metadata: { year: 2010, director: "Christopher Nolan", rating: 8.2 },
    }),
    new Document({
      pageContent:
        "A psychologist / detective gets lost in a series of dreams within dreams within dreams and Inception reused the idea",
      metadata: { year: 2006, director: "Satoshi Kon", rating: 8.6 },
    }),
    new Document({
      pageContent:
        "A bunch of normal-sized women are supremely wholesome and some men pine after them",
      metadata: { year: 2019, director: "Greta Gerwig", rating: 8.3 },
    }),
    new Document({
      pageContent: "Toys come alive and have a blast doing so",
      metadata: { year: 1995, genre: "animated" },
    }),
    new Document({
      pageContent:
        "Three men walk into the Zone, three men walk out of the Zone",
      metadata: {
        year: 1979,
        director: "Andrei Tarkovsky",
        genre: "science fiction",
        rating: 9.9,
      },
    }),
  ];

  const attributeInfo: AttributeInfo[] = [
    {
      name: "genre",
      description: "The genre of the movie",
      type: "string or array of strings",
    },
    {
      name: "year",
      description: "The year the movie was released",
      type: "number",
    },
    {
      name: "director",
      description: "The director of the movie",
      type: "string",
    },
    {
      name: "rating",
      description: "The rating of the movie (1-10)",
      type: "number",
    },
    {
      name: "length",
      description: "The length of the movie in minutes",
      type: "number",
    },
  ];

  const embeddings = new OpenAIEmbeddings();
  const llm = new OpenAI({
    modelName: "gpt-3.5-turbo",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = (weaviate as any).client({
    scheme:
      process.env.WEAVIATE_SCHEME ||
      (process.env.WEAVIATE_HOST ? "https" : "http"),
    host: process.env.WEAVIATE_HOST || "localhost:8080",
    apiKey: process.env.WEAVIATE_API_KEY
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (weaviate as any).ApiKey(process.env.WEAVIATE_API_KEY)
      : undefined,
  });

  const documentContents = "Brief summary of a movie";
  const vectorStore = await WeaviateStore.fromDocuments(docs, embeddings, {
    client,
    indexName: "Test",
    textKey: "text",
    metadataKeys: ["year", "director", "rating", "genre"],
  });
  const selfQueryRetriever = SelfQueryRetriever.fromLLM({
    llm,
    vectorStore,
    documentContents,
    attributeInfo,
    structuredQueryTranslator: new WeaviateTranslator(),
  });

  // @eslint-disable-next-line/@typescript-eslint/ban-ts-comment
  // @ts-expect-error unused var
  const query2 = await selfQueryRetriever.getRelevantDocuments(
    "Which movies are rated higher than 8.5?"
  );
  // @eslint-disable-next-line/@typescript-eslint/ban-ts-comment
  // @ts-expect-error unused var
  const query3 = await selfQueryRetriever.getRelevantDocuments(
    "Which movies are directed by Greta Gerwig?"
  );
  const query4 = await selfQueryRetriever.getRelevantDocuments(
    "Wau wau wau wau hello gello hello?"
  );
  // console.log(query2, query3, query4); // query4 has to return empty array
  expect(query4.length).toBe(0);
});

test.skip("Weaviate Vector Store Self Query Retriever Test With Default Filter Or Merge Operator", async () => {
  const docs = [
    new Document({
      pageContent:
        "A bunch of scientists bring back dinosaurs and mayhem breaks loose",
      metadata: {
        year: 1993,
        rating: 7.7,
        genre: "science fiction",
        type: "movie",
      },
    }),
    new Document({
      pageContent:
        "Leo DiCaprio gets lost in a dream within a dream within a dream within a ...",
      metadata: {
        year: 2010,
        director: "Christopher Nolan",
        rating: 8.2,
        type: "movie",
      },
    }),
    new Document({
      pageContent:
        "A psychologist / detective gets lost in a series of dreams within dreams within dreams and Inception reused the idea",
      metadata: {
        year: 2006,
        director: "Satoshi Kon",
        rating: 8.6,
        type: "movie",
      },
    }),
    new Document({
      pageContent:
        "A bunch of normal-sized women are supremely wholesome and some men pine after them",
      metadata: {
        year: 2019,
        director: "Greta Gerwig",
        rating: 8.3,
        type: "movie",
      },
    }),
    new Document({
      pageContent: "Toys come alive and have a blast doing so",
      metadata: { year: 1995, genre: "animated", type: "movie" },
    }),
    new Document({
      pageContent:
        "Three men walk into the Zone, three men walk out of the Zone",
      metadata: {
        year: 1979,
        director: "Andrei Tarkovsky",
        genre: "science fiction",
        rating: 9.9,
        type: "movie",
      },
    }),
    new Document({
      pageContent: "10x the previous gecs",
      metadata: {
        year: 2023,
        title: "10000 gecs",
        artist: "100 gecs",
        rating: 9.9,
        type: "album",
      },
    }),
  ];

  const attributeInfo: AttributeInfo[] = [
    {
      name: "genre",
      description: "The genre of the movie",
      type: "string or array of strings",
    },
    {
      name: "year",
      description: "The year the movie was released",
      type: "number",
    },
    {
      name: "director",
      description: "The director of the movie",
      type: "string",
    },
    {
      name: "rating",
      description: "The rating of the movie (1-10)",
      type: "number",
    },
    {
      name: "length",
      description: "The length of the movie in minutes",
      type: "number",
    },
  ];

  const embeddings = new OpenAIEmbeddings();
  const llm = new OpenAI({
    modelName: "gpt-3.5-turbo",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = (weaviate as any).client({
    scheme:
      process.env.WEAVIATE_SCHEME ||
      (process.env.WEAVIATE_HOST ? "https" : "http"),
    host: process.env.WEAVIATE_HOST || "localhost:8080",
    apiKey: process.env.WEAVIATE_API_KEY
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (weaviate as any).ApiKey(process.env.WEAVIATE_API_KEY)
      : undefined,
  });

  const documentContents = "Brief summary of a movie";
  const vectorStore = await WeaviateStore.fromDocuments(docs, embeddings, {
    client,
    indexName: "Test",
    textKey: "text",
    metadataKeys: ["year", "director", "rating", "genre", "type"],
  });

  const selfQueryRetriever = SelfQueryRetriever.fromLLM({
    llm,
    vectorStore,
    documentContents,
    attributeInfo,
    structuredQueryTranslator: new WeaviateTranslator(),
    searchParams: {
      filter: {
        where: {
          operator: "Equal",
          path: ["type"],
          valueText: "movie",
        },
      },
      mergeFiltersOperator: "or",
      k: docs.length,
    },
  });

  const query4 = await selfQueryRetriever.getRelevantDocuments(
    "Wau wau wau wau hello gello hello?"
  );
  // console.log(query4); // query4 has to return documents, since the default filter takes over with
  expect(query4.length).toEqual(7);
});

test.skip("Weaviate Vector Store Self Query Retriever Test With Default Filter And Merge Operator", async () => {
  const docs = [
    new Document({
      pageContent:
        "A bunch of scientists bring back dinosaurs and mayhem breaks loose",
      metadata: {
        year: 1993,
        rating: 7.7,
        genre: "science fiction",
        type: "movie",
      },
    }),
    new Document({
      pageContent:
        "Leo DiCaprio gets lost in a dream within a dream within a dream within a ...",
      metadata: {
        year: 2010,
        director: "Christopher Nolan",
        rating: 8.2,
        type: "movie",
      },
    }),
    new Document({
      pageContent:
        "A psychologist / detective gets lost in a series of dreams within dreams within dreams and Inception reused the idea",
      metadata: {
        year: 2006,
        director: "Satoshi Kon",
        rating: 8.6,
        type: "movie",
      },
    }),
    new Document({
      pageContent:
        "A bunch of normal-sized women are supremely wholesome and some men pine after them",
      metadata: {
        year: 2019,
        director: "Greta Gerwig",
        rating: 8.3,
        type: "movie",
      },
    }),
    new Document({
      pageContent: "Toys come alive and have a blast doing so",
      metadata: { year: 1995, genre: "animated", type: "movie" },
    }),
    new Document({
      pageContent:
        "Three men walk into the Zone, three men walk out of the Zone",
      metadata: {
        year: 1979,
        director: "Andrei Tarkovsky",
        genre: "science fiction",
        rating: 9.9,
        type: "movie",
      },
    }),
    new Document({
      pageContent: "10x the previous gecs",
      metadata: {
        year: 2023,
        title: "10000 gecs",
        artist: "100 gecs",
        rating: 9.9,
        type: "album",
      },
    }),
  ];

  const attributeInfo: AttributeInfo[] = [
    {
      name: "genre",
      description: "The genre of the movie",
      type: "string or array of strings",
    },
    {
      name: "year",
      description: "The year the movie was released",
      type: "number",
    },
    {
      name: "director",
      description: "The director of the movie",
      type: "string",
    },
    {
      name: "rating",
      description: "The rating of the movie (1-10)",
      type: "number",
    },
    {
      name: "length",
      description: "The length of the movie in minutes",
      type: "number",
    },
  ];

  const embeddings = new OpenAIEmbeddings();
  const llm = new OpenAI({
    modelName: "gpt-3.5-turbo",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = (weaviate as any).client({
    scheme:
      process.env.WEAVIATE_SCHEME ||
      (process.env.WEAVIATE_HOST ? "https" : "http"),
    host: process.env.WEAVIATE_HOST || "localhost:8080",
    apiKey: process.env.WEAVIATE_API_KEY
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (weaviate as any).ApiKey(process.env.WEAVIATE_API_KEY)
      : undefined,
  });

  const documentContents = "Brief summary of a movie";
  const vectorStore = await WeaviateStore.fromDocuments(docs, embeddings, {
    client,
    indexName: "Test",
    textKey: "text",
    metadataKeys: ["year", "director", "rating", "genre", "type"],
  });

  const selfQueryRetriever = SelfQueryRetriever.fromLLM({
    llm,
    vectorStore,
    documentContents,
    attributeInfo,
    structuredQueryTranslator: new WeaviateTranslator(),
    searchParams: {
      filter: {
        where: {
          operator: "Equal",
          path: ["type"],
          valueText: "movie",
        },
      },
      mergeFiltersOperator: "and",
      k: docs.length,
    },
  });

  const query4 = await selfQueryRetriever.getRelevantDocuments(
    "Wau wau wau wau hello gello hello?"
  );
  // console.log(query4); // query4 has to return empty array, since the default filter takes over with and filter
  expect(query4.length).toEqual(0);
});
