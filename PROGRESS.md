# AI Office — Build Progress (T0–T29)

Source of truth for the Revised Build Plan (two-person team, 30 tasks T0–T29).
Updated: 2026-09-14. Owner of this file: both (update on every task completion).

## Summary

| State | Count | Tasks |
|---|---|---|
| Implemented | 7 | T0, T1, T2, T3, T4, T5, T6 |
| In progress | 0 | — |
| Remaining | 23 | T7–T29 |

## Implemented

- [x] T0 Folder structure & shared types — `shared/src/{startup,agent,task,decision,blocker,notification,report,graph-state,index}.ts`, root `package.json` workspaces, `docker-compose.yml`. Verify: `npm run verify:t0`.
- [x] T1 Onboarding call — `services/ai/src/calls/onboarding/{prompts,call,index}.ts`, `calls/errors.ts`, `agents/common/llm.ts`, `scripts/verify-t1.mjs`. Verify: `npm run verify:t1 --workspace=@ai-office/ai`.
- [x] T2 Startup API & storage — `services/api/src/modules/startup/{router,service,schemas}.ts`, `src/app.ts`, `prisma/schema.prisma` `Startup` model.
- [x] T3 Onboarding UI — `frontend/src/pages/onboarding.tsx`, `frontend/src/lib/{api,mocks}.ts`, `frontend/src/App.tsx`.
- [x] T4 Org-suggestion call — `services/ai/src/calls/org-suggestion/{prompts,call,filter,index}.ts`, `POST /org/suggest` on ai service (`src/index.ts`, express), `scripts/verify-t4.mjs`. Verify: `npm run verify:t4` (+ live e2e, see test log).
- [x] T5 Org endpoints & role constraint — `services/api/src/modules/org/{schemas,service,router}.ts`, mount in `src/app.ts`, `AgentRole` DB enum (pre-existing in `prisma/schema.prisma:21-28`). Stateless select (no Agent writes — T9 owns instantiation). Verify: `npm run verify:t5` (live, needs `DATABASE_URL`), e2e 200-path via `verify:t5:e2e`.
- [x] T6 Org suggestion UI — `frontend/src/pages/OrgSuggestion.tsx` (six role cards, CEO toggle locked ON, hash route `#/org`), `lib/api.ts` (`getOrgSuggestion`/`selectOrg`), `lib/mocks.ts` (`mockOrgSuggestion`, explicit demo-preview only), `App.tsx` hash routing, `onboarding.tsx` "Configure team →" link on approved. Verify: `typecheck --workspace=@ai-office/web` + API combo checks in T5 log (all-on 200, CEO-only 200, CEO-off 400).

## Remaining (not started) — 23 tasks

- [ ] T7 CEO-only private context store — `services/api/src/modules/private-context`
- [ ] T8 Credential-entry UI — `frontend/src/components`
- [ ] T9 Instantiation endpoint — `services/api/src/modules/agents`
- [ ] T10 Agent context builders — `services/ai/src/agents/common/context.ts`
- [ ] T11 LangGraph skeleton — `services/ai/src/graph/build.ts`
- [ ] T12 CEO node chat + decision extraction — `services/ai/src/agents/ceo`
- [ ] T13 Meeting & decision endpoints — `services/api/src/modules/meetings`
- [ ] T14 Meeting UI — `frontend/src/pages/Meeting.tsx`
- [ ] T15 Manager decomposition — `services/ai/src/agents/managers/*`
- [ ] T16 Task storage & tree fetch — `services/api/src/modules/tasks`
- [ ] T17 Task tree UI — `frontend/src/pages/TaskTree.tsx`
- [ ] T18 Worker execution — `services/ai/src/agents/workers/*`
- [ ] T19 Task status API & realtime — `modules/tasks + realtime.ts`
- [ ] T20 Live execution UI — `frontend/src/pages/TaskTree.tsx`
- [ ] T21 Escalation + founder interrupt — `services/ai/src/graph/escalation.ts`
- [ ] T22 Blocker & notification storage — `services/api/src/modules/blockers`
- [ ] T23 Founder interrupt UI — `frontend/src/pages/Interrupt.tsx`
- [ ] T24 Deterministic report aggregation — `services/api/src/modules/reports`
- [ ] T25 CEO EOD synthesis — `services/ai/src/agents/ceo/eod-synthesis.ts`
- [ ] T26 EOD report UI — `frontend/src/pages/Report.tsx`
- [ ] T27 Approval persistence & next-day context — `services/api/src/modules/approvals`
- [ ] T28 Founder review UI — `frontend/src/pages/Review.tsx`
- [ ] T29 End-to-end run-through — `docker compose up`

## Test log

- 2026-09-14: T0–T3 pre-existing. T4/T5/T6 implementation started.
- 2026-09-14: `npm run typecheck` (all 4 workspaces) — PASS.
- 2026-09-14: `npm run verify:t1` — ALL_T1_CHECKS_PASSED (3 stub checks; live 3-sample SKIP, no key in root env).
- 2026-09-14: `npm run verify:t4` — ALL_T4_CHECKS_PASSED (injection strip to 6, CEO backfill, retry-after-failure calls=2, sanitize-malformed, invalid-context; live 5-sample SKIP in stub script).
- 2026-09-14: `npm run verify:t5` (live, Postgres 5434) — ALL_T5_LIVE_CHECKS_PASSED, 12/12: fixture approved; select all-on 200; CEO-only 200; no-CEO 400; Legal Counsel 400; unknown startup 404; suggest missing-id 400 / unknown 404 / unapproved 422 / AI-down 502; prisma invalid-role rejected; raw-SQL invalid-enum rejected by Postgres.
- 2026-09-14: T4→T5 live e2e (`verify:t5:e2e`, real Groq) — T4_T5_E2E_PASSED: ai `POST /org/suggest` 200 direct; api `GET /org/suggest` 200 with exactly `CEO,TECH_MANAGER,BACKEND_ENGINEER,FRONTEND_ENGINEER,GROWTH_MANAGER,MARKETING_EMPLOYEE`, all reasons non-empty. Model genuinely differentiated (Growth/Marketing OFF at MVP stage).
- 2026-09-14: T6 — web typecheck PASS; UI toggle combos covered at API level in T5 log (UI blocks CEO-off by construction: toggle disabled + forced ON, client guard + server 400). Browser click-through still manual (no browser harness in repo).
- 2026-09-14 findings (action needed, out of T4–T6 scope):
  1. Plan default model `llama-3.3-70b-versatile` is decommissioned on Groq (account model list has no Llama chat models; only guard models). Live e2e ran with `E2E_AI_MODEL=openai/gpt-oss-20b` override. Decide a new default and update `config.ts` / compose / `.env.example`, or pin per-call model. Still open: running `ai` container returns `MODEL_CALL_FAILED` on `/org/suggest` for the same reason.
  2. Fixed repo-wide ESM bug: extensionless relative imports fail under plain `node` against `dist` (verify-t1 was broken too). Changed touched chain to `.js` extensions (`ai/src/calls/*`, `agents/common/llm.ts`, `client.ts`). Consider a lint rule.
  3. `vite build` fails environmentally (Rollup native `ERR_DLOPEN_FAILED` before reading source) — pre-existing, unrelated to T6. `tsc` typecheck is the frontend gate until fixed.
- 2026-09-14 FIX blank page on :5173 (white screen + `Uncaught TypeError: AsyncLocalStorage is not a constructor`): `OrgSuggestion.tsx` was the first browser module to runtime-import `@ai-office/shared-types`, whose dist pulls `@langchain/langgraph` → `node:async_hooks`, throwing at evaluation and unmounting the whole app. Fixed by removing the runtime shared import from the page (local `ROLE_ORDER`/`ROLE_LABELS` mirror; server T5 stays the enforcer) + `docker compose restart web` (Vite dev missed the bind-mount change). Verified headless: `/` renders onboarding with zero console errors; `#/org` renders with zero console errors. Rule going forward: browser code imports shared `import type` only, never runtime values (until shared gains a browser-safe entry).
