# Node.js Example (OpenAI SDK)

Simple text-response example against the deployed gateway.

## Run

```bash
cd examples/node-openai-sdk
cp .env.example .env
npm install
npm start
```

Set `GATEWAY_API_KEY` in `.env` before running. Keys are operator-provisioned.

## Output

The script prints JSON with:

- `responses_text`
- `chat_text`
- `stream_text`
- `token_preview`
