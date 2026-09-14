import { useEffect, useState } from "react";
import {
  ApiError,
  getCEOAgentId,
  getPrivateContext,
  savePrivateContext,
} from "../lib/api";
import { mockPrivateContext } from "../lib/mocks";
import { PrivateContextForm } from "../components/PrivateContextForm";

const STARTUP_STORAGE_KEY = "ai-office:startupId";

type Status = "resolving" | "loading" | "ready" | "saving" | "no-startup" | "no-ceo";

export function Connect() {
  const [startupId, setStartupId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<Status>("resolving");
  const [savedFlash, setSavedFlash] = useState(false);
  const [asMember, setAsMember] = useState(false);
  const [usingDemo, setUsingDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedId = localStorage.getItem(STARTUP_STORAGE_KEY);
    if (!savedId) {
      setStatus("no-startup");
      return;
    }
    setStartupId(savedId);
    getCEOAgentId(savedId)
      .then(({ agentId }) => {
        setAgentId(agentId);
        setStatus("loading");
        return getPrivateContext(savedId, agentId).catch((err) => {
          if (err instanceof ApiError && err.status === 404) return null;
          throw err;
        });
      })
      .then((row) => {
        if (row) {
          setLabel(row.resourceLabel);
          setValue(row.resourceValue);
        }
        setStatus("ready");
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setStatus("no-ceo");
        } else {
          setError(err instanceof Error ? err.message : "Something went wrong");
          setStatus("ready");
        }
      });
  }, []);

  async function handleUseDemo() {
    if (!startupId) return;
    const demo = await mockPrivateContext(startupId, agentId ?? "demo-ceo");
    setAgentId(demo.agentId);
    setLabel(demo.resourceLabel);
    setValue(demo.resourceValue);
    setUsingDemo(true);
    setError(null);
    setStatus("ready");
  }

  async function handleSave() {
    if (!startupId || !agentId) return;
    setError(null);
    setSavedFlash(false);
    setStatus("saving");
    try {
      const row = await savePrivateContext({ startupId, agentId, resourceLabel: label, resourceValue: value });
      setLabel(row.resourceLabel);
      setValue(row.resourceValue);
      setSavedFlash(true);
      setStatus("ready");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("Only the CEO agent can save this. (403 from the API.)");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
      setStatus("ready");
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans text-black">
      <header className="bg-black px-8 py-14 text-white md:px-12">
        <div className="mx-auto w-full max-w-[720px]">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-neutral-400">
            <a href="#/org" className="underline underline-offset-4 hover:text-white">
              &larr; Team
            </a>{" "}
            &nbsp;·&nbsp; Phase 04 &mdash; Connect
          </p>
          <h1 className="mb-3 text-4xl font-semibold tracking-tight">Connect a resource.</h1>
          <p className="text-lg leading-relaxed text-neutral-400">
            A repo URL or API key the CEO can reference. Stored as metadata only —
            never shown to workers, never sent anywhere.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[720px] px-8 py-10 md:px-12">
        {usingDemo && (
          <p className="mb-4 rounded-2xl bg-neutral-100 px-5 py-3 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
            Demo preview &mdash; connect the API for the live store.
          </p>
        )}

        {status === "no-startup" && (
          <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-8 text-center">
            <p className="mb-4 font-medium">Complete onboarding first — no startup found.</p>
            <a href="#/" className="rounded-full bg-black px-6 py-3 text-xs font-bold uppercase tracking-widest text-white">
              Go to onboarding
            </a>
          </div>
        )}

        {status === "no-ceo" && (
          <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-8 text-center">
            <p className="mb-2 font-medium">No CEO agent exists for this startup yet.</p>
            <p className="mb-4 text-sm text-neutral-500">The org must be instantiated first (upcoming step).</p>
            <div className="flex items-center justify-center gap-3">
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

        {(status === "resolving" || status === "loading") && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-5 h-16 w-16 animate-spin rounded-full border-2 border-solid border-black border-r-transparent"></div>
            <p className="font-mono text-sm uppercase tracking-widest text-neutral-400">
              {status === "resolving" ? "Finding CEO..." : "Loading secure store..."}
            </p>
          </div>
        )}

        {(status === "ready" || status === "saving") && startupId && (
          <div>
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-neutral-100 px-5 py-3">
              <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                {asMember ? "Viewing as: team member" : "Viewing as: CEO"}
              </span>
              <button
                onClick={() => setAsMember((v) => !v)}
                className="rounded-full border border-neutral-300 bg-white px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest"
              >
                {asMember ? "Switch to CEO view" : "Preview as member"}
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm font-medium text-white">
                {error}
              </div>
            )}

            {asMember ? (
              <div className="rounded-3xl bg-neutral-50 p-8 text-center ring-1 ring-neutral-200">
                <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                  No connected resources visible to your role.
                </p>
              </div>
            ) : (
              <PrivateContextForm
                label={label}
                value={value}
                onLabel={(v) => { setLabel(v); setSavedFlash(false); }}
                onValue={(v) => { setValue(v); setSavedFlash(false); }}
                onSave={handleSave}
                saving={status === "saving"}
                saved={savedFlash}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
