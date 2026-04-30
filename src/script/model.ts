import Groq from "groq-sdk";
import { env } from "@/config/env";

const groq = new Groq({ apiKey: env.GROQ_SERVICE });

export async function main() {
  const chatCompletion = await getGroqChatCompletion();

  console.log(chatCompletion.choices[0]?.message?.content || "");
}

export async function getGroqChatCompletion() {
  return groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content: "Explain the importance of fast language models",
      },
    ],
    model: "openai/gpt-oss-20b",
  });
}
