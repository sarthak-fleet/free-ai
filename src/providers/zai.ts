import { runOpenAICompatibleRequest } from './openai-compatible';
import type { ProviderCaller } from './types';

// Z.ai (Zhipu BigModel) — OpenAI-compatible chat completions endpoint.
// Several GLM Flash models are free, including GLM-4.7-Flash and the
// GLM-4.6V-Flash vision model. The gateway previously only reached GLM via
// Cerebras (`zai-glm-4.7`) and OpenRouter; this adapter talks to Z.ai
// directly so the free-tier models are first-class routing candidates.
export const callZai: ProviderCaller = async (input) => {
  if (!input.env.ZAI_API_KEY) {
    throw new Error('ZAI_API_KEY is not configured');
  }

  return runOpenAICompatibleRequest(input, {
    provider: 'zai',
    baseURL: 'https://api.z.ai/api/paas/v4',
    apiKey: input.env.ZAI_API_KEY,
  });
};
