# Local backend

Small localhost adapter between the Browser Use Chat UI and Browser Use open-source core.

It intentionally contains no Browser Use Cloud client and needs no `BROWSER_USE_API_KEY`.

## Run

```powershell
cd local_backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The API binds to `127.0.0.1:8000` only.

Provider credentials are read from environment variables supported by Browser Use (`OPENROUTER_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`). Ollama can run locally without a provider API key.
