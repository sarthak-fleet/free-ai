# Python Example (OpenAI SDK)

Simple text-response example against the deployed gateway.

## Run

```bash
cd examples/python-openai-sdk
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python main.py
```

Set `GATEWAY_API_KEY` in `.env` before running. Keys are operator-provisioned.

## Output

The script prints JSON with:

- `responses_text`
- `chat_text`
- `stream_text`
- `token_preview`
