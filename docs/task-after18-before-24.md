# Client-Side ML Architecture Plan

## Phase 1: Vite React Refactor (Complete)
- [x] Decouple State (useReducer & Vitest)
- [x] Fault-tolerant IndexedDB persistence
- [x] CI/CD static distribution

## Phase 2: Vector Search & Schema Expansion (Complete)
- [x] Upgrade IndexedDB Schema
  - [x] Increment `DB_VERSION` to 2
  - [x] Add `createdAt`, `priority`, and `embedding` fields
- [x] Implement Transformer Web Worker
  - [x] Provision [src/worker/ml.worker.ts](file:///c:/Users/cnevi/Documents/to-do-list-lab-exp/src/worker/ml.worker.ts)
  - [x] Initialize `@xenova/transformers` feature-extraction pipeline
  - [x] Wire up asynchronous `postMessage` RPC bridge
- [x] Expand State Logic
  - [x] Add `PURGE_COMPLETED` mutation
  - [x] Implement search/filter logic based on cosine similarity
- [x] Enhance UI
  - [x] Add visual Skeleton loaders for async hydration
  - [x] Add Semantic Search bar
  - [x] Add Priority selectors and Purge button
- [ ] Validate Ecosystem
  - [ ] Verify non-blocking inference in Web Worker
  - [ ] Confirm IndexedDB gracefully migrates to v2
