import { defineConfig } from 'blume';

export default defineConfig({
  title: 'AI Gateway docs',
  description:
    'OpenAI-compatible free-tier LLM gateway — models, auth, chat, embeddings, rate limits.',
  content: { root: 'docs' },
  github: {
    owner: 'sass-maker',
    repo: 'free-ai',
    branch: 'main',
    dir: 'docs-blume/docs',
  },
  search: { provider: 'orama' },
  ai: { llmsTxt: true },
  seo: { agentReadability: true, sitemap: true, robots: true },
  deployment: {
    site: 'https://docs.ai-gateway.sassmaker.com',
    output: 'static',
  },
});
