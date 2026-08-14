import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export function getLLMClient(headers?: Record<string, string>) {
  const config = new Config();
  const customHeaders = headers || {};
  return new LLMClient(config, customHeaders);
}

export async function invokeLLM(
  messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string; detail?: string } }> }>,
  options?: { model?: string; temperature?: number; thinking?: 'enabled' | 'disabled' },
  headers?: Record<string, string>
) {
  const client = getLLMClient(headers);
  const response = await client.invoke(messages as any, {
    model: options?.model || 'doubao-seed-2-0-lite-260215',
    temperature: options?.temperature ?? 0.7,
    thinking: options?.thinking || 'disabled',
  });
  return response.content;
}

export async function* streamLLM(
  messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string; detail?: string } }> }>,
  options?: { model?: string; temperature?: number; thinking?: 'enabled' | 'disabled' },
  headers?: Record<string, string>
) {
  const client = getLLMClient(headers);
  const stream = client.stream(messages as any, {
    model: options?.model || 'doubao-seed-2-0-lite-260215',
    temperature: options?.temperature ?? 0.7,
    thinking: options?.thinking || 'disabled',
  });
  for await (const chunk of stream) {
    if (chunk.content) {
      yield chunk.content.toString();
    }
  }
}
