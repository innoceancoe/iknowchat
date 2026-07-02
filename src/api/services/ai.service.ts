import { getOpenAI } from "../config/openai";
import { env } from "../config/env";
import type { ChatMessage } from "./memory.service";
import type { SearchResult } from "./search.service";
import { formatSearchBlock } from "./search.service";

const BRAND_PERSONA = `You are InnoChat, a helpful, concise, and friendly AI assistant.
You provide accurate, thoughtful responses and clearly indicate when you are uncertain.
When web search results are provided, integrate them naturally into your response and cite sources.`;

/**
 * Build the full messages array sent to OpenAI.
 */
export function buildMessages(
  context: ChatMessage[],
  userMessage: string,
  searchResults: SearchResult[] = [],
  systemPromptOverride?: string
): ChatMessage[] {
  const systemParts: string[] = [systemPromptOverride ?? BRAND_PERSONA];

  const searchBlock = formatSearchBlock(searchResults);
  if (searchBlock) systemParts.push(searchBlock);

  const systemMessage: ChatMessage = {
    role: "system",
    content: systemParts.join("\n\n"),
  };

  return [
    systemMessage,
    ...context,
    { role: "user", content: userMessage },
  ];
}

/**
 * Stream a chat completion from OpenAI.
 * Yields string tokens one by one.
 */
export async function* streamChatCompletion(
  messages: ChatMessage[],
  model = env.OPENAI_DEFAULT_MODEL
): AsyncGenerator<string> {
  const stream = await getOpenAI().chat.completions.create({
    model,
    messages: messages as Array<{ role: "user" | "assistant" | "system"; content: string }>,
    max_tokens: env.OPENAI_MAX_TOKENS,
    stream: true,
  });

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content;
    if (token) yield token;
  }
}

/**
 * Non-streaming completion (used for summarisation, short tasks).
 */
export async function completeSingle(
  messages: ChatMessage[],
  model = "gpt-4o-mini"
): Promise<string> {
  const res = await getOpenAI().chat.completions.create({
    model,
    messages: messages as Array<{ role: "user" | "assistant" | "system"; content: string }>,
    max_tokens: 512,
    stream: false,
  });
  return res.choices[0]?.message?.content ?? "";
}
