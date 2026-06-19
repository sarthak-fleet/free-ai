import { runOpenAICompatibleRequest } from './openai-compatible';
import type { ProviderCaller } from './types';

export const callCommandCode: ProviderCaller = async (input) => {
  if (!input.env.COMMAND_CODE_API_KEY) {
    throw new Error('COMMAND_CODE_API_KEY is not configured');
  }

  return runOpenAICompatibleRequest(input, {
    provider: 'command_code',
    baseURL: 'https://api.commandcode.ai/provider/v1',
    apiKey: input.env.COMMAND_CODE_API_KEY,
  });
};
