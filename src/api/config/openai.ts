import OpenAI from "openai";
import { env } from "./env";

let _client: OpenAI | null = null;

/** Lazily initialised OpenAI client — constructed on first use. */
export function getOpenAI(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return _client;
}
