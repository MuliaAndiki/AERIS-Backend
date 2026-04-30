import { env } from "@/config/env";
import OpenAI from "openai";
export const client = new OpenAI({
  apiKey: env.GROQ_SERVICE,
  baseURL: "https://api.groq.com/openai/v1",
});
