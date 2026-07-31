# YoteMarket AI architecture

How the AI layer is shaped, why, and what is deliberately *not* an agent. Governs
`firebase/functions/index.js` (that directory is untracked, so the design lives here).

## The problem this solves

`aiAssistant` is one engine doing multi-round tool calling. Its loop runs up to 6 rounds,
and each round is a full model round-trip. A merchant Insight report needs three tools, so
it costs roughly **four serial model calls**. Until 2026-08-01 the tools *inside* a round
were also awaited one at a time, adding three serial Firestore reads on top.

That shape is right for open-ended reasoning over live data. It is the wrong shape for
"how heavy is this phone?", which needs no tools, no memory and no loop.

## The tiers

**Tier 0 — deterministic routing. 0 ms, free.**
The calling screen already knows the role (`shopper` / `search` / `merchant` / `support`).
Never pay a model to infer what the client knows. This is why there is no supervisor on
known entry points, and it is not a limitation — it is the fast path.

**Tier 1 — supervisor. Only for ambiguous free text.**
A *small* model that emits a plan (`{ specialists, parallel }`) and nothing else. Not built
yet: with one specialist there is nothing to route between, and a supervisor on the big
model would add a full round-trip before any work starts — strictly worse than today.
Build it when there are ≥3 specialists worth choosing between.

**Tier 2 — specialists. Three kinds, and the distinction matters more than the supervisor.**

| Kind | Example | Cost |
|---|---|---|
| Deterministic skill — **no LLM** | `quoteDelivery`, stock, order status | ~0 |
| One-shot LLM — no tools, strict JSON | `productWeight` | 1 model call |
| Tool-using agent | merchant Insight | 2–6 model calls |

Anything computable is computed. A model never does arithmetic that decides money.

**Tier 3 — synthesiser.** One call to merge multi-specialist output. Skipped entirely when
a single specialist ran. Not needed yet.

## Implemented

- **Concurrent tools** (`aiAssistant`): tool calls within a round run under `Promise.all`.
  Results are still appended in call order so the model's transcript is unchanged, and one
  failing tool degrades to an error payload for that call rather than killing the turn.
- **`aiTask` dispatcher + registry**: `AI_TASKS` maps a task name to `{ roles, cacheKey, run }`.
  Adding a specialist is a registry entry, not a deployment.
- **Caching**: `ai_cache/{key}`, 90-day TTL, keyed per task. The same phone is never
  estimated twice; a hit is one Firestore read.
- **Provenance**: every result carries `_source: "ai"`, `_cached`, `_model`. Persisted
  fields additionally record their own source (`weightSource: "ai" | "merchant"`), because
  an estimate must never be mistaken downstream for a declared figure.
- **Refusal path**: a specialist returns `null` with a reason rather than guessing.
  `productWeight` returns `kg: null` for "assorted items".

## One dispatcher, not one function per specialist

`index.js` takes ~29 s to load and a full deploy half-fails on the region's Cloud Functions
mutation quota (it reports success while silently updating a fraction of the functions —
see `deploy-infra-followups`). Every extra export makes that worse. Isolation lives in the
registry, not the topology. `estimateProductWeight` remains as a thin alias only because the
deployed dashboard already calls that name.

## Measured, 2026-08-01 — why there is no second model

Tested every free model on the account (probed live; the other 10 cloud models return
"requires a subscription"). Free: `gpt-oss:20b`, `nemotron-3-nano:30b`, `gemma4:31b`,
`gpt-oss:120b`, `nemotron-3-super`, `nemotron-3-ultra`, `minimax-m3`.

**Routing** — 8 real YoteMarket utterances, JSON label out:

| model | accuracy | median | worst |
|---|---|---|---|
| `gemma4:31b` | 8/8 | 910 ms | 4954 ms |
| `nemotron-3-nano:30b` | 8/8 | 1124 ms | 1799 ms |
| `gpt-oss:20b` | 8/8 | 1400 ms | 4070 ms |

There is no cheap router. The smallest cloud model is not meaningfully faster, so a
supervisor hop costs **~1–1.4 s before any work starts**, on every free model. Deterministic
Tier-0 routing is free and already correct. **Supervisor rejected on evidence, not taste.**

**Product knowledge** — packed weight for 6 identifiable products + 1 that must be refused:

| model | sensible | median |
|---|---|---|
| `gemma4:31b` | 7/7 | 1241 ms |
| `gpt-oss:20b` | 4/7 | 3136 ms |
| `nemotron-3-nano:30b` | 2/7 | 2418 ms |

The smaller models returned `null` for an HP Pavilion, a Ramtons kettle and Sony headphones —
the refusal path behaving correctly, but useless as a specialist. They were also slower.
**No fast-model tier: `gemma4:31b` is both the most accurate and the fastest here.**

The real tail-latency win for one-shot specialists is the cache (hit ≈ one Firestore read
vs 1.2–1.9 s), which is already built.

**Plan ceiling:** Ollama Free runs **1 cloud model concurrently** (Pro 3, Max 10). Parallel
specialist fan-out is therefore gated on a plan upgrade, not on code. The tool concurrency
in `aiAssistant` is unaffected — those are Firestore reads.

## Deliberately not done yet, and why

- **Supervisor** — nothing to route between yet; would add latency today.
- **Streaming** — callable streaming needs a client change on every surface; the one-shot
  specialists are fast enough that it buys little. Revisit for the conversational surface.
- **Parallel specialist fan-out** — needs ≥2 specialists to be worth it. The plumbing
  (`runAiTask`) is already shaped for `Promise.all`.
- **Subcategory → weight-range fallback table** — needs the staff-owned table first.

## The trap to avoid

Fan-out multiplies cost. Supervisor + 3 specialists + synthesiser is 5 model calls for one
question. Applied to work that is genuinely sequential, that is slower *and* dearer than the
single loop. Fan out only when subtasks are independent **and** user-visible latency drops.
