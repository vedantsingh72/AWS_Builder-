import { useEffect, useState } from "react";
import { approveStartup, ApiError, createStartup, getStartup, type StructuredFields } from "../lib/api";
import { structureDescription } from "../lib/mocks";

const STORAGE_KEY = "ai-office:startupId";

type Status = "idle" | "structuring" | "ready" | "approving" | "approved";

const emptyFields: StructuredFields = {
  industry: "",
  goal: "",
  stage: "",
  constraints: [],
  priorities: [],
};

function toListText(list: string[]): string {
  return list.join(", ");
}

function fromListText(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function Onboarding() {
  const [rawDescription, setRawDescription] = useState("");
  const [fields, setFields] = useState<StructuredFields>(emptyFields);
  const [startupId, setStartupId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (!savedId) return;

    getStartup(savedId)
      .then((startup) => {
        setStartupId(startup.id);
        setRawDescription(startup.rawDescription);
        setFields({
          industry: startup.industry,
          goal: startup.goal,
          stage: startup.stage,
          constraints: startup.constraints,
          priorities: startup.priorities,
        });
        setStatus(startup.status === "APPROVED" ? "approved" : "ready");
      })
      .catch(() => localStorage.removeItem(STORAGE_KEY));
  }, []);

  async function handleStructure() {
    if (!rawDescription.trim()) return;
    setError(null);
    setStatus("structuring");

    try {
      const structured = await structureDescription(rawDescription);
      const startup = await createStartup({ rawDescription, ...structured });

      localStorage.setItem(STORAGE_KEY, startup.id);
      setStartupId(startup.id);
      setFields(structured);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("idle");
    }
  }

  async function handleApprove() {
    if (!startupId) return;
    setError(null);
    setFieldErrors({});
    setStatus("approving");

    try {
      const startup = await approveStartup(startupId, { rawDescription, ...fields });
      setFields({
        industry: startup.industry,
        goal: startup.goal,
        stage: startup.stage,
        constraints: startup.constraints,
        priorities: startup.priorities,
      });
      setStatus("approved");
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setFieldErrors(Object.fromEntries(err.fields.map((f) => [f.path, f.message])));
        setError("Some fields need attention before this can be approved.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
      setStatus("ready");
    }
  }

  const locked = status === "approving";
  const showCard = status !== "idle" && status !== "structuring";

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2 font-sans selection:bg-black selection:text-white">
      {/* LEFT COLUMN: RAW INPUT (DARK MODE) */}
      <section className="flex min-h-screen justify-center bg-black px-8 py-20 text-white md:px-12 lg:px-20 selection:bg-white selection:text-black">
        <div className="w-full max-w-[480px] flex flex-col">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-neutral-400">
            Phase 01 &mdash; Initialization
          </p>
          <h1 className="mb-6 text-4xl font-semibold tracking-tight lg:text-5xl">
            Tell us about your startup.
          </h1>
          <p className="mb-10 text-lg leading-relaxed text-neutral-400">
            Write it the way you'd explain it to a new hire, what you're building, for whom, and
            where things stand. We'll extract the core architecture.
          </p>

          <textarea
            value={rawDescription}
            onChange={(e) => setRawDescription(e.target.value)}
            placeholder="We're building a booking tool for small physiotherapy clinics. We're pre-seed, two founders, aiming to get our first five clinics onboarded this quarter..."
            rows={8}
            disabled={status === "structuring" || status === "approved"}
            className="mb-6 w-full resize-y rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6 text-base leading-relaxed text-white placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:opacity-50 transition-all duration-300 shadow-inner"
          />

          {error && (
            <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm font-medium text-white flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-black font-bold">!</span>
              <p>{error}</p>
            </div>
          )}

          <button
            onClick={handleStructure}
            disabled={!rawDescription.trim() || status === "structuring" || status === "approved"}
            className="group relative inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-bold uppercase tracking-widest text-black transition-all hover:bg-neutral-200 disabled:pointer-events-none disabled:bg-neutral-900 disabled:text-neutral-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            {status === "structuring" ? (
              <span className="animate-pulse">Processing...</span>
            ) : (
              <span>Structure Data &rarr;</span>
            )}
          </button>
        </div>
      </section>

      {/* RIGHT COLUMN: STRUCTURED DOSSIER (LIGHT MODE) */}
      <section className="flex min-h-screen justify-center bg-white px-8 py-20 text-black md:px-12 lg:px-20">
        <div className="w-full max-w-[480px]">
          {!showCard && status !== "structuring" && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-5 h-16 w-16 rounded-full border-2 border-dashed border-neutral-300"></div>
              <p className="font-mono text-sm uppercase tracking-widest text-neutral-400">
                Awaiting input data
              </p>
            </div>
          )}

          {status === "structuring" && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-5 h-16 w-16 animate-spin rounded-full border-2 border-solid border-black border-r-transparent"></div>
              <p className="font-mono text-sm uppercase tracking-widest text-neutral-400">
                Parsing parameters...
              </p>
            </div>
          )}

          {showCard && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="mb-8 flex items-end justify-between border-b border-neutral-200 pb-5">
                <div>
                  <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                    Phase 02 &mdash; Refinement
                  </p>
                  <h2 className="text-3xl font-semibold tracking-tight">Dossier</h2>
                </div>
                <span
                  className={`px-4 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-widest ${
                    status === "approved"
                      ? "bg-black text-white"
                      : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {status === "approved" ? "Approved" : "Draft"}
                </span>
              </div>

              <div className="space-y-3">
                <Field
                  label="Industry"
                  value={fields.industry}
                  error={fieldErrors.industry}
                  disabled={locked || status === "approved"}
                  onChange={(v) => setFields((f) => ({ ...f, industry: v }))}
                />
                <Field
                  label="Goal"
                  value={fields.goal}
                  error={fieldErrors.goal}
                  disabled={locked || status === "approved"}
                  multiline
                  onChange={(v) => setFields((f) => ({ ...f, goal: v }))}
                />
                <Field
                  label="Stage"
                  value={fields.stage}
                  error={fieldErrors.stage}
                  disabled={locked || status === "approved"}
                  onChange={(v) => setFields((f) => ({ ...f, stage: v }))}
                />
                <Field
                  label="Constraints"
                  value={toListText(fields.constraints)}
                  disabled={locked || status === "approved"}
                  placeholder="Comma-separated values"
                  onChange={(v) => setFields((f) => ({ ...f, constraints: fromListText(v) }))}
                />
                <Field
                  label="Priorities"
                  value={toListText(fields.priorities)}
                  disabled={locked || status === "approved"}
                  placeholder="Comma-separated values"
                  onChange={(v) => setFields((f) => ({ ...f, priorities: fromListText(v) }))}
                />
              </div>

              {status !== "approved" && (
                <button
                  onClick={handleApprove}
                  disabled={locked}
                  className="mt-8 w-full rounded-full bg-black px-8 py-4 text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-neutral-800 disabled:pointer-events-none disabled:bg-neutral-200 disabled:text-neutral-500 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  {locked ? "Committing..." : "Approve & Lock In"}
                </button>
              )}
              
              {status === "approved" && (
                <div className="mt-8 rounded-2xl bg-neutral-100 px-6 py-4 flex items-center justify-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] text-white">✓</span>
                  <p className="font-mono text-xs uppercase tracking-widest text-black">
                    Record immutable & locked.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  error,
  multiline,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  multiline?: boolean;
  placeholder?: string;
}) {
  const baseInputClasses =
    "w-full resize-none bg-transparent pt-1 text-[15px] font-medium text-black placeholder:text-neutral-400 focus:outline-none disabled:opacity-60 transition-colors";

  return (
    <label className="group relative block rounded-2xl bg-neutral-50 p-4 transition-all focus-within:bg-white focus-within:shadow-md focus-within:ring-1 focus-within:ring-neutral-200">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-neutral-500 transition-colors">
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={2}
          placeholder={placeholder}
          className={baseInputClasses}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className={baseInputClasses}
        />
      )}
      {error && (
        <span className="absolute bottom-4 right-4 rounded-full bg-black px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white font-bold animate-in fade-in zoom-in duration-300">
          Error
        </span>
      )}
    </label>
  );
}