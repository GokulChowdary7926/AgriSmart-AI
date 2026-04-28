# AgriSmart AI

AgriSmart AI is a full-stack agriculture platform that provides bilingual (English/Tamil) farmer support for chat assistance, crop recommendations, disease detection, weather insights, market prices, and government schemes.

## Architecture Overview

- **Frontend:** React + Vite app in `frontend/`
- **Backend:** Node.js + Express API in `backend/`
- **Database:** MongoDB (primary), optional Redis cache
- **AI reliability design:** fallback-first chain for chat
  - Perplexity -> Local LLM (Ollama/Transformers endpoint) -> Rule engine

See `MODEL_REGISTRY.md` for model-level details.

## Core Features

1. **Agri Chat (EN/TA):** agriculture-focused assistant with resilient fallback behavior
2. **Crop Recommendation:** location-informed suggestions with weather/market context
3. **Disease Detection:** image-based diagnosis flow with treatment/prevention guidance
4. **Weather:** current, forecast, hourly, and alerts
5. **Market:** commodity prices, trends, and filters
6. **Government Schemes:** recommendation and eligibility support
7. **Dashboard:** unified summary across weather, market, and alerts
8. **Auth & Profile:** JWT-based login/session/profile APIs

## Repository Structure

```text
agri-smart-ai/
├─ backend/                # Express API, business logic, AI orchestration
│  ├─ routes/              # /api route definitions
│  ├─ controllers/         # Request orchestration layer
│  ├─ services/            # Core domain, integrations, AI services
│  ├─ models/              # Mongoose schemas
│  ├─ middleware/          # Auth, validation, error handling
│  └─ .env.example         # Environment variables template
├─ frontend/               # React app (pages, components, contexts, services)
│  ├─ src/pages/
│  ├─ src/components/
│  ├─ src/contexts/
│  └─ public/locales/      # i18n resources (en/ta)
├─ ml-models/              # ML/DL training scripts and artifacts
├─ MODEL_REGISTRY.md       # Model and fallback registry
└─ RELEASE.md              # Release notes / deployment context
```

## Main API Route Groups

Mounted in `backend/server.js`:

- `/api/auth`
- `/api/chatbot`
- `/api/chat`
- `/api/agri-gpt`
- `/api/crops`
- `/api/diseases`
- `/api/weather`
- `/api/market`
- `/api/alerts`
- `/api/government-schemes`
- `/api/government`
- `/api/language`
- `/api/users`
- `/api/realtime`
- `/api/analytics`
- `/api/iot`
- `/api/map`

## AI/ML Model Stack

### Runtime inference path (chat)

1. **Perplexity Sonar** (primary cloud LLM)
2. **Ollama Local LLM** (`LOCAL_LLM_MODEL`, default `llama2`)
3. **Local Transformers endpoint** (secondary local fallback)
4. **RuleBasedEngine + TamilAgriChatbotService** (final guaranteed fallback)

### Training/experimental assets

- `ml-models/scripts/train_disease_detection.py`
- `ml-models/scripts/train_weather_prediction.py`
- `ml-models/scripts/train_market_prediction.py`
- `ml-models/disease-detection/train.py`
- `ml-models/disease-detection/train_comprehensive.py`
- `backend/ml-models/train-disease-model.py`

## Environment Configuration

Use `backend/.env.example` as the source of truth.

### Critical variables

- **Security/Auth:** `JWT_SECRET`, `JWT_EXPIRE`
- **Database/Cache:** `MONGODB_URI`, `REDIS_URL`
- **AI/LLM:** `PERPLEXITY_API_KEY`, `ENABLE_PERPLEXITY`, `ENABLE_LOCAL_LLM`, `ENABLE_RULE_ENGINE`, `OLLAMA_HOST`, `LOCAL_LLM_MODEL`, `LOCAL_LLM_TIMEOUT`
- **Reliability controls:** `ALWAYS_USE_FALLBACK`, `CIRCUIT_BREAKER_THRESHOLD`, `CIRCUIT_BREAKER_TIMEOUT`
- **External APIs:** `OPENWEATHER_API_KEY`, `DATA_GOV_IN_API_KEY`, `AGMARKNET_API_KEY`
- **Feature flags:** `FEATURE_REALTIME_ANALYTICS`, `FEATURE_ML_PREDICTIONS`, `FEATURE_EXTERNAL_APIS`, `FEATURE_CACHING`

## Local Development

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3) Optional Docker

```bash
docker compose -f docker-compose.dev.yml up -d
```

## Testing & Quality

### Backend

```bash
cd backend
npm test
npm run lint
```

### Frontend

```bash
cd frontend
npm test
npm run lint
npm run build
```

### E2E

```bash
cd frontend
npm run e2e:smoke
```

## Reliability and Fallback Behavior

- Missing cloud LLM key or cloud timeout -> local LLM fallback
- Local LLM failure -> rule engine fallback
- External market/weather API failure -> fallback-safe response paths (mock/degraded data, no hard crash)
- Unknown routes return standardized 404 payload

## Health and Diagnostics

Backend exposes:

- `/health`
- `/ready`
- `/diagnostics`
- `/api/diagnostics`

These are useful for deployment checks and runtime monitoring.

## Notes

- For model-level documentation and current status, refer to `MODEL_REGISTRY.md`.
- For production, always set a secure `JWT_SECRET`, strict CORS origins, and validated API keys.
