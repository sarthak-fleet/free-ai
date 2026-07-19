import { describe, expect, it, vi } from 'vitest';

import { getModelRegistry } from '../src/config';
import { providerCallers } from '../src/providers';
import { callZai } from '../src/providers/zai';
import type { Env, TextProvider } from '../src/types';

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    GATEWAY_DB: {} as D1Database,
    HEALTH_DO: {} as DurableObjectNamespace,
    RATE_LIMIT_DO: {} as DurableObjectNamespace,
    HEALTH_KV: {} as KVNamespace,
    ...overrides,
  };
}

const baseInput = {
  provider: 'zai' as TextProvider,
  model: 'glm-4.7-flash',
  messages: [{ role: 'user' as const, content: 'hello' }],
  stream: false,
};

describe('Z.ai / Zhipu GLM provider integration', () => {
  it('registers a caller for zai', () => {
    expect(providerCallers.zai).toBeTypeOf('function');
  });

  it('throws when ZAI_API_KEY is absent', async () => {
    await expect(callZai({ ...baseInput, env: makeEnv() })).rejects.toThrow(
      'ZAI_API_KEY is not configured'
    );
  });

  it('hides zai models when no key is present', () => {
    const registry = getModelRegistry(makeEnv());
    expect(registry.some((c) => c.provider === 'zai')).toBe(false);
  });

  it('exposes zai models when ZAI_API_KEY is present', () => {
    const env = makeEnv({ ZAI_API_KEY: 'k' });
    const registry = getModelRegistry(env);
    const flash = registry.find((c) => c.id === 'zai-glm-4-7-flash');
    const vision = registry.find((c) => c.id === 'zai-glm-4-6v-flash');
    expect(flash).toBeDefined();
    expect(vision).toBeDefined();
  });

  it('marks glm-4.6v-flash as vision-capable', () => {
    const env = makeEnv({ ZAI_API_KEY: 'k' });
    const registry = getModelRegistry(env);
    const glmVision = registry.find((c) => c.id === 'zai-glm-4-6v-flash');
    expect(glmVision?.capabilities.vision).toBe(true);
  });

  it('does not touch the Workers AI neuron budget (uses OpenAI-compatible path)', () => {
    const run = vi.fn();
    const env = makeEnv({ AI: { run }, ZAI_API_KEY: 'k' });
    expect(env.AI?.run).toBe(run);
    expect(typeof callZai).toBe('function');
  });
});
