/* eslint-disable no-process-env */

import { expect, test } from "@jest/globals";
import { CallbackManager } from "@instrukt/langchain-core/callbacks/manager";
import { OpenAIChat } from "../legacy.js";

// Save the original value of the 'LANGCHAIN_CALLBACKS_BACKGROUND' environment variable
const originalBackground = process.env.LANGCHAIN_CALLBACKS_BACKGROUND;

test("Test OpenAI", async () => {
  const model = new OpenAIChat({ modelName: "gpt-3.5-turbo", maxTokens: 10 });
  // @eslint-disable-next-line/@typescript-eslint/ban-ts-comment
  // @ts-expect-error unused var
  const res = await model.invoke("Print hello world");
  // console.log({ res });
});

test("Test OpenAI with prefix messages", async () => {
  const model = new OpenAIChat({
    prefixMessages: [
      { role: "user", content: "My name is John" },
      { role: "assistant", content: "Hi there" },
    ],
    maxTokens: 10,
  });
  // @eslint-disable-next-line/@typescript-eslint/ban-ts-comment
  // @ts-expect-error unused var
  const res = await model.invoke("What is my name");
  // console.log({ res });
});

test("Test OpenAI in streaming mode", async () => {
  // Running LangChain callbacks in the background will sometimes cause the callbackManager to execute
  // after the test/llm call has already finished & returned. Set that environment variable to false
  // to prevent that from happening.
  process.env.LANGCHAIN_CALLBACKS_BACKGROUND = "false";

  try {
    let nrNewTokens = 0;
    let streamedCompletion = "";

    const model = new OpenAIChat({
      maxTokens: 10,
      modelName: "gpt-3.5-turbo",
      streaming: true,
      callbackManager: CallbackManager.fromHandlers({
        async handleLLMNewToken(token: string) {
          nrNewTokens += 1;
          streamedCompletion += token;
        },
      }),
    });
    const res = await model.invoke("Print hello world");
    // console.log({ res });

    expect(nrNewTokens > 0).toBe(true);
    expect(res).toBe(streamedCompletion);
  } finally {
    // Reset the environment variable
    process.env.LANGCHAIN_CALLBACKS_BACKGROUND = originalBackground;
  }
}, 30000);

test("Test OpenAI with stop", async () => {
  const model = new OpenAIChat({ maxTokens: 5 });
  // @eslint-disable-next-line/@typescript-eslint/ban-ts-comment
  // @ts-expect-error unused var
  const res = await model.call("Print hello world", ["world"]);
  // console.log({ res });
});

test("Test OpenAI with stop in object", async () => {
  const model = new OpenAIChat({ maxTokens: 5 });
  // @eslint-disable-next-line/@typescript-eslint/ban-ts-comment
  // @ts-expect-error unused var
  const res = await model.invoke("Print hello world", { stop: ["world"] });
  // console.log({ res });
});

test("Test OpenAI with timeout in call options", async () => {
  const model = new OpenAIChat({ maxTokens: 5 });
  await expect(() =>
    model.invoke("Print hello world", {
      timeout: 10,
    })
  ).rejects.toThrow();
}, 5000);

test("Test OpenAI with timeout in call options and node adapter", async () => {
  const model = new OpenAIChat({ maxTokens: 5 });
  await expect(() =>
    model.invoke("Print hello world", {
      timeout: 10,
    })
  ).rejects.toThrow();
}, 5000);

test("Test OpenAI with signal in call options", async () => {
  const model = new OpenAIChat({ maxTokens: 5 });
  const controller = new AbortController();
  await expect(() => {
    const ret = model.invoke("Print hello world", {
      signal: controller.signal,
    });

    controller.abort();

    return ret;
  }).rejects.toThrow();
}, 5000);

test("Test OpenAI with signal in call options and node adapter", async () => {
  const model = new OpenAIChat({ maxTokens: 5 });
  const controller = new AbortController();
  await expect(() => {
    const ret = model.invoke("Print hello world", {
      signal: controller.signal,
    });

    controller.abort();

    return ret;
  }).rejects.toThrow();
}, 5000);

test("Test OpenAIChat stream method", async () => {
  const model = new OpenAIChat({ maxTokens: 50, modelName: "gpt-3.5-turbo" });
  const stream = await model.stream("Print hello world.");
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
    // console.log(chunks);
  }
  expect(chunks.length).toBeGreaterThan(1);
});

test("Test OpenAIChat stream method with abort", async () => {
  await expect(async () => {
    const model = new OpenAIChat({ maxTokens: 50, modelName: "gpt-3.5-turbo" });
    const stream = await model.stream(
      "How is your day going? Be extremely verbose.",
      {
        signal: AbortSignal.timeout(1000),
      }
    );
    // @eslint-disable-next-line/@typescript-eslint/ban-ts-comment
    // @ts-expect-error unused var
    for await (const chunk of stream) {
      // console.log(chunk);
    }
  }).rejects.toThrow();
});

test("Test OpenAIChat stream method with early break", async () => {
  const model = new OpenAIChat({ maxTokens: 50, modelName: "gpt-3.5-turbo" });
  const stream = await model.stream(
    "How is your day going? Be extremely verbose."
  );
  let i = 0;
  // @eslint-disable-next-line/@typescript-eslint/ban-ts-comment
  // @ts-expect-error unused var
  for await (const chunk of stream) {
    // console.log(chunk);
    i += 1;
    if (i > 5) {
      break;
    }
  }
});
