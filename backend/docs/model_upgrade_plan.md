# 🚀 LLM Upgrade & Robustness Plan

This document outlines the technical strategy for versioning, upgrading, and managing Large Language Models (LLMs) within the Flowspace backend logic. It covers architecture patterns for reliability, testing, and continuous improvement.

---

## 1. Architecture: The AI Adapter Pattern

To avoid vendor lock-in and enable seamless model swaps, all AI interactions must go through a unified **AI Adapter Layer**.

### 1.1 `AIModelAdapter` Class
We will implement an abstract adapter interface that standardizes inputs/outputs.

```javascript
class AIAdapter {
    async complete(prompt, options) { throw new Error('Not implemented'); }
    async stream(prompt, options) { throw new Error('Not implemented'); }
    async embed(text) { throw new Error('Not implemented'); }
}

class OpenAIAdapter extends AIAdapter { ... }
class AnthropicAdapter extends AIAdapter { ... }
class LocalLlamaAdapter extends AIAdapter { ... }
```

### 1.2 Model Registry
A central registry controls which model is used for which feature, configurable via env vars or remote config.

```javascript
const AI_CONFIG = {
    'summarization': { model: 'gpt-4o-mini', provider: 'openai', fallback: 'claude-3-haiku' },
    'code_gen': { model: 'gpt-4o', provider: 'openai', fallback: 'claude-3.5-sonnet' },
    'creative_writing': { model: 'claude-3-opus', provider: 'anthropic' }
};
```

---

## 2. Graceful Fallback & Redundancy

High reliability requires handling API outages and rate limits gracefully.

*   **Primary/Secondary Routing**: If the primary provider (e.g., OpenAI) fails with 5xx or 429 errors, instantly retry with the secondary provider (e.g., Anthropic or Cohere).
*   **Circuit Breakers**: If a provider fails >5 times in a minute, open the circuit and route all traffic to the backup for 5 minutes.
*   **Semantic Fallback**: If a complex model fails, fall back to a faster, cheaper model (e.g., GPT-4 -> GPT-3.5) and append a disclaimer ("Generated with limited capacity model").

---

## 3. Canary Rollout Strategy

Deploy new model versions (e.g., GPT-5 preview) carefully.

1.  **Internal Dogfooding**: Only devs access the new model (via `X-Feature-Flag: ai-beta`).
2.  **1% Traffic**: Route 1% of non-critical requests (e.g., "Suggest Colors") to the new model.
3.  **Metrics Check**: Compare acceptance rate, latency, and error rate against the baseline.
4.  **100% Rollout**: If green, ramp up to full traffic.

---

## 4. Cost/Performance Optimization

*   **Token Budgeting**: Enforce hard limits on prompt/completion tokens per feature to prevent runaways.
*   **Caching Layer**:
    *   **Semantic Cache**: Use Redis Vector DB to cache high-cost queries. If a user asks a similar question (cosine similarity > 0.95), return the cached answer.
    *   **TTL**: Set short TTLs (1 hour) for context-sensitive data, long TTLs (30 days) for generic definitions.
*   **Model Tiering**:
    *   **Tier 1 (Premium)**: GPT-4o for complex reasoning (Code, Logic).
    *   **Tier 2 (Standard)**: GPT-4o-mini for simple tasks (Summarization, Chat).
    *   **Tier 3 (Bulk)**: Offline batch processing for massive datasets.

---

## 5. Prompt Engineering & Versioning

Prompts are code. They should be versioned, tested, and decoupled from logic.

### 5.1 Prompt Templates
Store prompts in a dedicated directory (`src/ai/prompts/*.js`) or a headless CMS.

```javascript
// src/ai/prompts/summary_v2.js
export const SYSTEM_PROMPT = `You are an expert summarizer. Context: {{context}}...`;
```

### 5.2 Prompt Templating Engine
Use a clearer syntax (Handlebars/Mustache) to inject variables safely, preventing injection attacks.

### 5.3 Testing Harness (`evals/`)
Create a deterministic test suite for prompts.
*   **Unit Tests**: Check if output format is valid JSON.
*   **Regression Tests**: "Does this prompt still correctly identify a 'decision node' in this edge case?"

---

## 6. Continuous Evaluation Metrics

Measure AI quality continuously, not just at launch.

1.  **Latency (P95)**: Time to first token (TTFT) and total generation time.
2.  **User Feedback (CSAT)**: "Thumbs up/down" on generated results (Track acceptance rate of 'Apply Fix' in UX Panel).
3.  **Hallucination Rate**: (Offline) Use an "Evaluator LLM" (GPT-4) to fact-check a sample of outputs against the input context.
4.  **JSON Validity**: % of responses that fail `JSON.parse`.

---

## 7. A/B Testing Options

Run experiments to optimize prompts or models.
*   **Experiment A**: "System Prompt V1" (Concise)
*   **Experiment B**: "System Prompt V2" (Detailed)
*   **Log**: Include `experiment_id` in analytics events.
*   **Winner**: Determine by "Save Rate" (did user keep the AI output?).

---

## 8. Path to Fine-Tuning

When base models hit a ceiling, move to fine-tuning.

1.  **Data Collection**:
    *   Log every "accepted" completion to a data lake (S3/Data Warehouse).
    *   Log user edits (Input -> AI Output -> User Edit = Golden Training Pair).
2.  **Labeling**:
    *   Use LLMs to pre-label data.
    *   Human review for the "Golden Set".
3.  **Safety Filtering**: Remove PII and toxic content before training.
4.  **Training**: Fine-tune a smaller, cheaper model (e.g., Llama 3 8B) to match GPT-4 performance on *specific* tasks like "Flowchart Layout".

---

## 9. CI/CD & Environment Management

### 9.1 Secrets Management
*   **NEVER** commit keys.
*   Use `dotenv` locally and AWS Secrets Manager/Vercel Env Vars in prod.
*   Rotate keys every 90 days.
*   Multi-provider keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `COHERE_API_KEY`.

### 9.2 Rollback Procedure
If a new model causes a spike in errors:
1.  **Alert**: PagerDuty triggers on >5% error rate.
2.  **Kill Switch**: Auto-revert `AI_MODEL_VERSION` env var to previous known good.
3.  **Post-Mortem**: Analyze logs to identify specific prompt incompatibility.

### 9.3 CI Steps
Add an "AI Smoke Test" step to the pipeline:
1.  Spin up ephemeral backend.
2.  Run `npm run test:ai` (sends 5 standard prompts to current model).
3.  Assert: Latency < 5s, JSON valid, assertions pass.
4.  Block deploy if AI is unresponsive.
