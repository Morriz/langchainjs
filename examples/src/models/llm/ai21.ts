import { AI21 } from "@instrukt/langchain-community/llms/ai21";

const model = new AI21({
  ai21ApiKey: "YOUR_AI21_API_KEY", // Or set as process.env.AI21_API_KEY
});

const res = await model.invoke(`Translate "I love programming" into German.`);

console.log({ res });

/*
  {
    res: "\nIch liebe das Programmieren."
  }
 */
