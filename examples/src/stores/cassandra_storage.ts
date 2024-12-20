import { CassandraKVStore } from "@instrukt/langchain-community/storage/cassandra";
import { AIMessage, HumanMessage } from "@instrukt/langchain-core/messages";

// This document is the Cassandra driver connection document; the example is to AstraDB but
// any valid Cassandra connection can be used.
const configConnection = {
  serviceProviderArgs: {
    astra: {
      token: "YOUR_TOKEN_OR_LOAD_FROM_ENV" as string,
      endpoint: "YOUR_ENDPOINT_OR_LOAD_FROM_ENV" as string,
    },
  },
};

const store = new CassandraKVStore({
  ...configConnection,
  keyspace: "test", // keyspace must exist
  table: "test_kv", // table will be created if it does not exist
  keyDelimiter: ":", // optional, default is "/"
});

// Define our encoder/decoder for converting between strings and Uint8Arrays
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Here you would define your LLM and chat chain, call
 * the LLM and eventually get a list of messages.
 * For this example, we'll assume we already have a list.
 */
const messages = Array.from({ length: 5 }).map((_, index) => {
  if (index % 2 === 0) {
    return new AIMessage("ai stuff...");
  }
  return new HumanMessage("human stuff...");
});

// Set your messages in the store
// The key will be prefixed with `message:id:` and end
// with the index.
await store.mset(
  messages.map((message, index) => [
    `message:id:${index}`,
    encoder.encode(JSON.stringify(message)),
  ])
);

// Now you can get your messages from the store
const retrievedMessages = await store.mget(["message:id:0", "message:id:1"]);
// Make sure to decode the values
console.log(retrievedMessages.map((v) => decoder.decode(v)));

/**
[
  '{"id":["langchain","AIMessage"],"kwargs":{"content":"ai stuff..."}}',
  '{"id":["langchain","HumanMessage"],"kwargs":{"content":"human stuff..."}}'
]
 */

// Or, if you want to get back all the keys you can call
// the `yieldKeys` method.
// Optionally, you can pass a key prefix to only get back
// keys which match that prefix.
const yieldedKeys = [];
for await (const key of store.yieldKeys("message:id:")) {
  yieldedKeys.push(key);
}

// The keys are not encoded, so no decoding is necessary
console.log(yieldedKeys);
/**
[
  'message:id:2',
  'message:id:1',
  'message:id:3',
  'message:id:0',
  'message:id:4'
]
 */

// Finally, let's delete the keys from the store
await store.mdelete(yieldedKeys);
