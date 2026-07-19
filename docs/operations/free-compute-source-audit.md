# Free Compute Source Audit

Checked on 2026-05-28; newly wired-in providers section refreshed 2026-07-19.

## Current Coverage

The gateway already has active adapters for these text providers:

- Workers AI
- Groq
- Gemini
- OpenRouter
- Cerebras
- SambaNova
- NVIDIA
- GitHub Models
- Pollinations
- Cohere
- Mistral
- Z.ai / Zhipu GLM (added 2026-07)

It also has modality-specific providers for embeddings, images, video, TTS, and STT. The provider directory is structurally consistent with the TypeScript unions in `src/types.ts` and the caller maps in `src/providers/index.ts`: every current text provider has an adapter file, and each modality registry filters providers through an availability check before routing.

## Historical Usage

D1 `project_analytics` currently records request counts, not exact token or neuron consumption. Historical Workers AI cost can therefore be bounded only from request volume and the `NeuronBudgetDO` estimator, not reconstructed exactly.

Observed provider totals in production D1:

| Provider | Requests | Successful | Failed |
| --- | ---: | ---: | ---: |
| mistral | 1,151 | 1,151 | 0 |
| groq | 650 | 648 | 2 |
| nvidia | 521 | 520 | 1 |
| openrouter | 463 | 463 | 0 |
| workers_ai | 275 | 275 | 0 |
| github_models | 95 | 95 | 0 |
| pollinations | 29 | 29 | 0 |
| cerebras | 20 | 20 | 0 |
| gemini | 18 | 17 | 1 |
| cohere | 12 | 12 | 0 |
| together | 4 | 3 | 1 |

Workers AI historical request count is low and concentrated: 243 of 275 recorded Workers AI requests happened on 2026-05-01. It has 0 recorded failures in `project_analytics`.

## Cloudflare Cost Guard

Cloudflare documents Workers AI as free for 10,000 neurons/day, then billed on Workers Paid at $0.011 per 1,000 neurons above that free allocation. Neurons are GPU-compute units, not requests, so 10,000 neurons must not be treated as 10,000 gateway calls.

The current code keeps Workers AI on but guarded:

- Automatic text routing now ranks every non-Workers-AI provider ahead of Workers AI.
- Image, STT, and TTS priority sorting also places Workers AI last when the request is `model=auto` and no provider is forced.
- Explicit forced Workers AI usage still works.
- Every Workers AI provider path must debit `NEURON_BUDGET` before calling Workers AI.
- `DAILY_NEURON_CAP` remains 9,500/day, leaving a 500-neuron buffer below the documented free allocation.
- `pnpm audit:cloudflare-costs` now fails if the AI binding lacks `NEURON_BUDGET` or if the committed neuron cap exceeds 9,500/day.

## Addable Sources

### Skip for production routing: Hugging Face router

Hugging Face Inference Providers supports an OpenAI-compatible chat completion endpoint at `https://router.huggingface.co/v1` and exposes many providers through one token, including Cerebras, Cohere, DeepInfra, Fireworks, Groq, HF Inference, Novita, Public AI, Replicate, SambaNova, Together, and Z.ai.

Do not suggest Hugging Face again as a meaningful production free-compute source unless its free allowance changes materially. The free monthly credit is too small for gateway routing, so it is better treated as a manual test/probe provider than as part of the automatic fallback pool.

If it is ever added anyway, gate it behind `HF_TOKEN`, keep it out of `model=auto`, and require an explicit tiny daily cap plus account-credit visibility.

### Already useful: OpenRouter free variants

OpenRouter remains worth keeping because it exposes many `:free` model variants through one adapter. Its docs state that free variants have request-per-minute and request-per-day caps, and that `/api/v1/key` can report remaining credit/rate-limit state.

Recommended follow-up:

- Add an optional OpenRouter key-status poller to surface remaining daily free-model quota in `/v1/stats/providers`.
- Keep OpenRouter models lower than direct providers when a direct provider has better limits or health.

### Already useful: GitHub Models

GitHub Models includes rate-limited free usage for GitHub accounts, but paid usage can be enabled. This is a good fallback source, but it should stay behind hard per-provider limits unless the account budget is confirmed.

### Already useful: Groq and Cerebras

Groq and Cerebras publish free-tier or free-trial rate limits and should stay near the front of routing while healthy. They also return useful rate-limit headers, so the gateway can eventually learn headroom from headers instead of static request/day estimates.

## Newly wired-in providers (2026-07)

One OpenAI-compatible provider was integrated as a first-class adapter in 2026-07 and is documented in [`docs/product/free-ai-credits-guide.md`](../product/free-ai-credits-guide.md):

- **Z.ai / Zhipu GLM** — free GLM-4.7-Flash + free vision via GLM-4.6V-Flash. Genuinely free forever (not credits). Adapter: `src/providers/zai.ts`.

The integration added one `src/providers/zai.ts` adapter, a `TextProvider` union entry, a `hasProviderKey` branch, a `PROVIDER_KEY_REQUIRED` flag, three model entries in `DEFAULT_MODELS`, and per-model `DEFAULT_LIMITS`. It ranks below the healthiest direct free-tier providers (Groq, Cerebras, Gemini) but above Workers AI fallback.

## Evaluated and rejected for low ROI (2026-07)

Six OpenAI-compatible providers were evaluated and deliberately **not** wired in, because each adds an env var + adapter + routing entries in exchange for little or no recurring free capacity we don't already have. Full rationale in [`docs/product/free-ai-credits-guide.md#not-integrated-evaluated-and-rejected-for-low-roi`](../product/free-ai-credits-guide.md#not-integrated-evaluated-and-rejected-for-low-roi):

- **DeepSeek** — the "free" offer is a one-time 5M-token grant (30 days, then paid). Not a recurring free tier; after the grant it's just another paid provider. We already have free frontier-class routing via Groq/Cerebras/Gemini/Z.ai.
- **SiliconFlow** — $1 one-time credit; models overlap with Cerebras/OpenRouter.
- **Alibaba DashScope** — 1M tokens/model, 90 days; Qwen3 already reachable via Groq/Cerebras/OpenRouter.
- **01.AI (Yi)** — vague small signup tokens; not frontier.
- **OVH AI Endpoints** — same Llama 3.1 we already reach four other ways; only novel value is EU residency.
- **Reka** — unclear free tier size; multimodal angle already covered by Gemini for free.

Revisit only if the stated blocker changes.

## Sources Not Recommended As Default Yet

- Credit-only providers without a hard free cap should not be added to automatic routing unless we also store account budget/remaining-credit telemetry.
- Aggregators that advertise unlimited free inference but do not publish clear billing or sustainability terms should not be added to production routing without manual testing and a kill switch.
- Paid image/video models should remain out of automatic free routing unless the provider exposes a verified free tier for the specific model.

## Directory Findings

The current provider directory is written correctly for the providers already declared in `src/types.ts`; there are no missing adapter files for declared text providers. The notable gaps are product-level, not directory correctness:

- D1 analytics does not store exact token/neuron usage, so historical Cloudflare neuron cost cannot be reconstructed exactly.
- The catalog now separates `reasoning` as a routing strength tier from `nativeReasoning`, which marks models with actual reasoning/thinking behavior. This avoids treating every high-quality model as if it has native thinking controls.
- Some model limits are still marked `AUTO-ADDED -- tune`, so health and daily limits should be verified against provider dashboards over time.
- TTS only has a Workers AI registry entry today even though the type union allows `groq`; adding a non-Workers TTS provider would reduce Workers AI dependence for speech.

## Quota Polling

Graceful degradation is still the primary safety mechanism. Quota polling is advisory and should only suppress a provider when an official endpoint clearly reports exhaustion.

Current polling:

- OpenRouter `/api/v1/key` is cached in KV for five minutes.
- If OpenRouter reports `limit_remaining <= 0`, OpenRouter candidates are skipped before routing.
- If polling fails or the endpoint does not expose the free-model daily request count, routing falls back to existing health/degradation behavior.

This keeps routing latency and provider health cleaner without making an external quota endpoint a hard dependency.

## References

- Cloudflare Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Hugging Face Inference Providers pricing: https://huggingface.co/docs/inference-providers/en/pricing
- Hugging Face OpenAI-compatible chat completion: https://huggingface.co/docs/inference-providers/tasks/chat-completion
- OpenRouter limits: https://openrouter.ai/docs/api/reference/limits
- GitHub Models billing: https://docs.github.com/en/billing/concepts/product-billing/github-models
- Groq rate limits: https://console.groq.com/docs/rate-limits
- Cerebras rate limits: https://inference-docs.cerebras.ai/support/rate-limits
