# AgriSmart AI - Model Registry

This document lists the models/services used in the project, where they are wired, and what they do.

## 1) AI Orchestration (Non-model control layer)

- **Component:** `AgriAIService`
- **Type:** AI orchestration/fallback manager (not an ML model)
- **File:** `backend/services/AgriAIService.js`
- **Purpose:** Routes chat requests through model stack and fallback order:
  1. Perplexity (online)
  2. Local LLM
  3. Rule engine
- **Feature flags:**
  - `ENABLE_PERPLEXITY`
  - `ENABLE_LOCAL_LLM`
  - `ENABLE_RULE_ENGINE`
- **Related env:**
  - `PERPLEXITY_API_KEY`
  - `PERPLEXITY_TIMEOUT`
  - `CIRCUIT_BREAKER_THRESHOLD`
  - `CIRCUIT_BREAKER_TIMEOUT`

## 2) LLM Models

### 2.1 Perplexity Sonar (Primary LLM)

- **Model/service:** Perplexity Chat Completions (`sonar`)
- **Type:** Cloud LLM
- **File:** `backend/services/AgriAIService.js`
- **Purpose:** Primary answer generation for bilingual agriculture chat.
- **Endpoint:** `https://api.perplexity.ai/chat/completions`
- **Env:** `PERPLEXITY_API_KEY`, `PERPLEXITY_TIMEOUT`

### 2.2 Ollama Local LLM (Fallback #1)

- **Model/service:** Ollama (default model `llama2`)
- **Type:** Local LLM
- **File:** `backend/services/LocalLLMService.js`
- **Purpose:** Local fallback when Perplexity is unavailable/rate-limited/timeout.
- **Endpoint:** `${OLLAMA_HOST}/api/generate`
- **Env:**
  - `OLLAMA_HOST` (default `http://localhost:11434`)
  - `LOCAL_LLM_MODEL` (default `llama2`)
  - `LOCAL_LLM_TIMEOUT`

### 2.3 Local Transformers Endpoint (Fallback #2 inside LocalLLMService)

- **Model/service:** Local transformers text-generation endpoint
- **Type:** Local LLM endpoint
- **File:** `backend/services/LocalLLMService.js`
- **Purpose:** Secondary local fallback if Ollama call fails.
- **Endpoint:** `http://localhost:3000/generate`

## 3) Rule-based Fallback Layer

### 3.1 Rule Engine Wrapper

- **Component:** `RuleBasedEngine`
- **Type:** Rule-based responder (non-LLM)
- **File:** `backend/services/RuleBasedEngine.js`
- **Purpose:** Guaranteed final response path when all LLM paths fail.

### 3.2 Domain Knowledge Engine

- **Component:** `TamilAgriChatbotService`
- **Type:** Rule/knowledge engine
- **File:** `backend/services/TamilAgriChatbotService.js`
- **Purpose:** Structured agriculture responses in EN/TA for crop, disease, weather, market, schemes, general.

## 4) Disease Detection Models (DL/ML)

- **Frontend model labels (UI):**
  - `YOLOv8 Ensemble Model` label in i18n
  - Files:
    - `frontend/public/locales/en/common.json`
    - `frontend/public/locales/ta/common.json`
- **Training scripts present in repository (ML stack):**
  - RandomForest disease/weather/market scripts:
    - `ml-models/scripts/train_disease_detection.py`
    - `ml-models/scripts/train_weather_prediction.py`
    - `ml-models/scripts/train_market_prediction.py`
    - `backend/ml-models/train-disease-model.py`
    - `ml-models/disease-detection/train.py`
    - `ml-models/disease-detection/train_comprehensive.py`

> Note: Production inference routing for disease detection is implemented via the app disease flow and APIs; training scripts in `ml-models` are repository assets for model training workflows.

## 5) Legacy/Alternate AI Service

- **Component:** `ai_service` (legacy parallel service path)
- **File:** `backend/services/ai_service.js`
- **Purpose:** Alternative AI + local fallback logic retained in project.
- **Primary key used:** `PERPLEXITY_API_KEY`

## 6) Chat Model Execution Order (Current)

1. `AgriAIService.tryPerplexityAPI(...)`
2. `LocalLLMService.generateResponse(...)`
   - `tryOllama(...)`
   - fallback `tryTransformers(...)`
3. `RuleBasedEngine.processMessage(...)`
   - delegates to `TamilAgriChatbotService`

## 7) Quick Config Checklist

- Required for primary cloud LLM:
  - `PERPLEXITY_API_KEY`
- Required for local LLM fallback:
  - `OLLAMA_HOST`
  - local Ollama runtime + pulled model (`LOCAL_LLM_MODEL`)
- Feature toggles:
  - `ENABLE_PERPLEXITY=true|false`
  - `ENABLE_LOCAL_LLM=true|false`
  - `ENABLE_RULE_ENGINE=true|false`

