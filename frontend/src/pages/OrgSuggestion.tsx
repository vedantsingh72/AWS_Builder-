import { useEffect, useState } from "react";
// NOTE: no runtime import from @ai-office/shared-types here on purpose.
// The shared dist pulls @langchain/langgraph -> node:async_hooks, which throws
// at module evaluation in the browser and blanks the whole app. These two
// constants mirror shared/src/agent.ts (FIXED_AGENT_ROLES, AGENT_ROLE_LABELS);
// the server (T5 schemas, importing the shared zod enum) remains the enforcer.
const ROLE_ORDER = [
  "CEO",
  "TECH_MANAGER",
  "BACKEND_ENGINEER",
  "FRONTEND_ENGINEER",
  "GROWTH_MANAGER",
  "MARKETING_EMPLOYEE",
] as const;

const ROLE_LABELS: Record<string, string> = {
  CEO: "CEO",
  TECH_MANAGER: "Tech Manager",
  BACKEND_ENGINEER: "Backend Engineer",
  FRONTEND_ENGINEER: "Frontend Engineer",
  GROWTH_MANAGER: "Growth Manager",
  MARKETING_EMPLOYEE: "Marketing Employee",
};
import {
  ApiError,
  getOrgSuggestion,
  selectOrg,
  type OrgSuggestion,
} from "../lib/api";
import { mockOrgSuggestion } from "../lib/mocks";

const STARTUP_STORAGE_KEY = "ai-office:startupId";
const SELECTION_STORAGE_KEY = "ai-office:orgSelection";

type Status = "loading" | "ready" | "submitting" | "saved";

export function OrgSuggestion() {
  const [startupId, setStartupId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<OrgSuggestion[]>([]);
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [usingDemo, setUsingDemo] = useState(false);

  useEffect(() => {
    const savedId = localStorage.getItem(STARTUP_STORAGE_KEY);
    if (!savedId) {
      setError("Complete onboarding first — no startup found.");
      return;
    }
    setStartupId(savedId);

    const savedSelection = localStorage.getItem(SELECTION_STORAGE_KEY);
    const savedRoles: string[] | null = savedSelection ? JSON.parse(savedSelection) : null;

    getOrgSuggestion(savedId)
      .then(({ suggestions }) => {
        applySuggestions(suggestions, savedRoles);
        setStatus("ready");
      })
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? `Suggestion service: ${err.message}`
            : "Suggestion service unreachable. You can retry or preview with demo data.",
        );
      });
  }, []);

  function applySuggestions(list: OrgSuggestion[], savedRoles: string[] | null) {
    // Fixed order, CEO always present and on.
    const ordered = [...list].sort(
      (a, b) => ROLE_ORDER.indexOf(a.role as never) - ROLE_ORDER.indexOf(b.role as never),
    );
    setSuggestions(ordered);
    const initial: Record<string, boolean> = {};
    for (const s of ordered) {
      initial[s.role] =
        savedRoles !== null ? savedRoles.includes(s.role) : s.role === "CEO" ? true : s.recommendedOn;
    }
    initial["CEO"] = true;
    setToggles(initial);
  }

  async function handleUseDemo() {
    const demo = await mockOrgSuggestion();
    setUsingDemo(true);
    setError(null);
    applySuggestions(demo, null);
    setStatus("ready");
  }

  function flip(role: string) {
    if (role === "CEO") return; // CEO is mandatory — toggle locked on.
    setToggles((t) => ({ ...t, [role]: !t[role] }));
  }

  async function handleSubmit() {
    if (!startupId) return;
    const roles = suggestions.map((s) => s.role).filter((r) => toggles[r]);
    if (!roles.includes("CEO")) {
      setError("CEO is mandatory in every org.");
      return;
    }
    setError(null);
    setStatus("submitting");
    try {
      const result = await selectOrg(startupId, roles);
      localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(result.roles));
      setStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("ready");
    }
  }

  const selectedCount = Object.values(toggles).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-white font-sans text-black">
      <header className="bg-black px-8 py-14 text-white md:px-12">
        <div className="mx-auto w-full max-w-[720px]">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-neutral-400">
            <a href="#/" className="underline underline-offset-4 hover:text-white">
              &larr; Onboarding
            </a>{" "}
            &nbsp;·&nbsp; Phase 03 &mdash; Team
          </p>
          <h1 className="mb-3 text-4xl font-semibold tracking-tight">Who should run this?</h1>
          <p className="text-lg leading-relaxed text-neutral-400">
            Six fixed roles, one line each on why they fit. Toggle the team, then lock it in.
            The CEO stays on &mdash; every org needs one.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[720px] px-8 py-10 md:px-12">
        {error && status === "loading" && (
          <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-8 text-center">
            <p className="mb-2 font-medium">{error}</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="rounded-full bg-black px-6 py-3 text-xs font-bold uppercase tracking-widest text-white"
              >
                Retry
              </button>
              <button
                onClick={handleUseDemo}
                className="rounded-full border border-neutral-300 px-6 py-3 text-xs font-bold uppercase tracking-widest"
              >
                Preview demo data
              </button>
            </div>
          </div>
        )}

        {status === "loading" && !error && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-5 h-16 w-16 animate-spin rounded-full border-2 border-solid border-black border-r-transparent"></div>
            <p className="font-mono text-sm uppercase tracking-widest text-neutral-400">
              Scoring roles...
            </p>
          </div>
        )}

        {(status === "ready" || status === "submitting" || status === "saved") && (
          <div>
            {usingDemo && (
              <p className="mb-4 rounded-2xl bg-neutral-100 px-5 py-3 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                Demo preview &mdash; connect the API for live suggestions.
              </p>
            )}
            <div className="space-y-3">
              {suggestions.map((s) => {
                const on = !!toggles[s.role];
                const locked = s.role === "CEO";
                return (
                  <div
                    key={s.role}
                    className={`flex items-start justify-between gap-4 rounded-2xl p-5 transition-all ${
                      on ? "bg-neutral-50 ring-1 ring-neutral-200" : "bg-white ring-1 ring-neutral-200 opacity-70"
                    }`}
                  >
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                        {s.role}
                      </p>
                      <h2 className="text-lg font-semibold">
                        {ROLE_LABELS[s.role] ?? s.role}
                      </h2>
                      <p className="mt-1 text-[15px] text-neutral-600">{s.reason}</p>
                      {locked && (
                        <p className="mt-2 inline-block rounded-full bg-black px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white">
                          Mandatory
                        </p>
                      )}
                    </div>
                    <button
                      role="switch"
                      aria-checked={on}
                      aria-label={`${s.role} toggle`}
                      disabled={locked || status === "submitting" || status === "saved"}
                      onClick={() => flip(s.role)}
                      className={`mt-1 flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors ${
                        on ? "bg-black" : "bg-neutral-300"
                      } ${locked ? "cursor-not-allowed opacity-100" : "cursor-pointer"}`}
                    >
                      <span
                        className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${
                          on ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm font-medium text-white">
                {error}
              </div>
            )}

            {status !== "saved" ? (
              <button
                onClick={handleSubmit}
                disabled={status === "submitting"}
                className="mt-8 w-full rounded-full bg-black px-8 py-4 text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-500"
              >
                {status === "submitting"
                  ? "Saving..."
                  : `Confirm team (${selectedCount} selected)`}
              </button>
            ) : (
              <div>
                <div className="mt-8 rounded-2xl bg-neutral-100 px-6 py-4 text-center">
                  <p className="font-mono text-xs uppercase tracking-widest text-black">
                    ✓ Team locked in &mdash; {selectedCount} roles selected.
                  </p>
                </div>
                <a
                  href="#/connect"
                  className="mt-4 block w-full rounded-full bg-black px-8 py-4 text-center text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-neutral-800"
                >
                  Connect a resource &rarr;
                </a>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
